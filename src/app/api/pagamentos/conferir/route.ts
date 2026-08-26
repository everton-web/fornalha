import { sql } from "@/lib/db";
import { settleCharge } from "@/lib/payments/charges";
import { checkRate, clientIp } from "@/lib/rate-limit";

/**
 * "Já caiu?" — a pergunta que a tela do cliente faz enquanto o Pix não paga.
 *
 * Existe porque webhook não é garantia. Aqui a própria página aberta do cliente
 * puxa a reconciliação: enquanto ele olha o QR, o servidor vai conferindo com o
 * gateway. Se o aviso do gateway se perder no caminho, o pagamento é
 * reconhecido do mesmo jeito, sem ninguém precisar mexer em nada.
 *
 * O token público do pedido é a credencial: quem tem o link acompanha, é o
 * mesmo critério da tela de acompanhamento.
 */

/** Intervalo mínimo entre duas consultas ao gateway para o mesmo pagamento. */
const JANELA_SEGUNDOS = 10;

export async function POST(request: Request) {
  const freio = await checkRate(`conferir:${await clientIp()}`, 200, 600);
  if (!freio.ok) return new Response("Muitas consultas", { status: 429 });

  let body: { token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return new Response("Corpo inválido", { status: 400 });
  }

  const token = body.token;
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response("Token inválido", { status: 400 });
  }

  const rows = await sql`
    select p.id, p.provider, p.provider_charge_id, p.status,
           o.code, o.payment_status,
           extract(epoch from (now() - p.updated_at)) as idade
    from payments p
    join orders o on o.id = p.order_id
    where o.public_token = ${token}
    order by p.created_at desc
    limit 1
  `;

  const linha = rows[0];
  if (!linha) return Response.json({ status: null });

  // Já resolvido, ou consultado agora há pouco: responde do banco. Sem esta
  // trava, uma página aberta viraria centenas de chamadas ao gateway por hora.
  const resolvido = linha.status !== "pending";
  const recente = Number(linha.idade) < JANELA_SEGUNDOS;

  if (resolvido || recente || !linha.provider_charge_id) {
    return Response.json(
      { status: linha.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const resultado = await settleCharge(linha.provider as string, {
      providerChargeId: linha.provider_charge_id as string,
      orderCode: linha.code as string,
    });
    return Response.json(
      { status: resultado.status ?? linha.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Conferência de pagamento falhou", error);
    // O cliente não precisa saber que o gateway está fora do ar: a tela
    // continua mostrando o Pix e tenta de novo no próximo ciclo.
    return Response.json(
      { status: linha.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
