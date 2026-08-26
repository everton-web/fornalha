import { handleWebhook } from "@/lib/payments/charges";

/**
 * Onde o gateway avisa que algo aconteceu com uma cobrança.
 *
 * Um endereço por gateway (`/api/pagamentos/mercadopago/webhook`), porque cada
 * um assina de um jeito e manda um corpo diferente. O que eles têm em comum
 * está em `handleWebhook`.
 *
 * O corpo é lido como texto e repassado cru: verificar assinatura exige os
 * bytes exatos que chegaram. Reserializar o JSON mudaria espaços e ordem de
 * chaves, e nenhuma assinatura bateria.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const rawBody = await request.text();

  try {
    const resultado = await handleWebhook(provider, request, rawBody);

    if (!resultado.ok && resultado.reason === "assinatura inválida") {
      // 401 e nada mais: quem postou aqui sem a chave não merece saber se o
      // gateway existe, se a cobrança existe, nem por que foi recusado.
      return new Response("Não autorizado", { status: 401 });
    }

    // Cobrança não encontrada responde 200 de propósito. O gateway reenvia
    // enquanto não receber 200, e reenviar não vai fazer aparecer um pedido
    // que não é nosso — só encheria a fila dele e o nosso log.
    return Response.json(
      { ok: resultado.ok, motivo: resultado.reason ?? null },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`Webhook ${provider} falhou`, error);
    // 500 aqui é intencional: falha nossa merece reenvio do gateway.
    return new Response("Erro ao processar", { status: 500 });
  }
}

/** Alguns gateways checam se o endereço responde antes de cadastrar. */
export async function GET() {
  return new Response("ok", { status: 200 });
}
