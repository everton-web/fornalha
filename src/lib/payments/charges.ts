import "server-only";

import { randomUUID } from "node:crypto";

import { num, sql } from "@/lib/db";
import { accountByProvider, accountForKind } from "@/lib/payments/accounts";
import { getProvider } from "@/lib/payments/registry";
import {
  PaymentError,
  type PaymentKind,
  type WebhookRead,
} from "@/lib/payments/types";
import { notifyTenant } from "@/lib/push";
import type { JsonObject, PaymentStatus } from "@/lib/types";

/**
 * O caminho do dinheiro.
 *
 * Duas regras mandam em tudo aqui:
 *
 * 1. O webhook nunca decide nada. Ele só diz qual cobrança olhar; o desfecho
 *    sai sempre de uma consulta ao gateway. Endereço de webhook vaza, e um
 *    POST forjado não pode liberar pizza.
 *
 * 2. O valor é conferido. Um pedido de R$ 90 pago com R$ 0,01 não vira pago,
 *    por mais que o gateway diga "approved" — o que ele aprova é a transação,
 *    não a dívida.
 */

/**
 * Tempo de vida do Pix. Curto o bastante para não segurar a cozinha.
 *
 * 35 e não 30 porque o Mercado Pago recusa expiração abaixo de meia hora: com
 * 30 cravados, a latência da própria chamada já joga o prazo para o lado
 * errado da conta e a cobrança volta recusada.
 */
const PIX_EXPIRA_MIN = 35;
const CARTAO_EXPIRA_MIN = 60;

export type CreatedCharge = {
  paymentId: string;
  provider: string;
  status: PaymentStatus;
  pixCode: string | null;
  pixQrBase64: string | null;
  checkoutUrl: string | null;
  expiresAt: Date | null;
};

export async function createChargeForOrder(input: {
  orderId: string;
  tenantId: string;
  orderCode: string;
  amount: number;
  kind: PaymentKind;
  customer: { name: string; phone: string; email: string | null };
  baseUrl: string;
  publicToken: string;
  slug: string;
}): Promise<CreatedCharge> {
  const conta = await accountForKind(input.tenantId, input.kind);
  if (!conta) {
    throw new PaymentError(
      input.kind === "pix"
        ? "Pagamento por Pix online indisponível nesta pizzaria."
        : "Pagamento por cartão online indisponível nesta pizzaria.",
    );
  }

  const provider = getProvider(conta.provider);
  if (!provider) throw new PaymentError("Gateway de pagamento indisponível.");

  const method = input.kind === "pix" ? "pix_online" : "card_online";

  // A linha nasce antes da chamada externa: se o gateway responder e a rede
  // cair na volta, existe registro de que a cobrança foi tentada — sem isso,
  // haveria cobrança no gateway sem rastro nenhum aqui.
  const [linha] = await sql`
    insert into payments (order_id, tenant_id, provider, method, amount)
    values (${input.orderId}, ${input.tenantId}, ${conta.provider},
            ${method}, ${input.amount})
    returning id
  `;
  const paymentId = linha.id as string;

  try {
    const charge = await provider.createCharge(conta.credentials, {
      amount: input.amount,
      kind: input.kind,
      orderCode: input.orderCode,
      description: `Pedido #${input.orderCode}`,
      customer: input.customer,
      notificationUrl: `${input.baseUrl}/api/pagamentos/${conta.provider}/webhook`,
      returnUrl: `${input.baseUrl}/${input.slug}/pedido/${input.publicToken}`,
      expiresInMinutes:
        input.kind === "pix" ? PIX_EXPIRA_MIN : CARTAO_EXPIRA_MIN,
      // A chave de idempotência é da linha: repetir a chamada com a mesma
      // chave devolve a mesma cobrança em vez de criar outra.
      idempotencyKey: paymentId,
    });

    await sql`
      update payments set
        provider_charge_id = ${charge.providerChargeId},
        status        = ${charge.status},
        pix_code      = ${charge.pixCode ?? null},
        pix_qr_base64 = ${charge.pixQrBase64 ?? null},
        checkout_url  = ${charge.checkoutUrl ?? null},
        expires_at    = ${charge.expiresAt ?? null},
        raw           = ${sql.json(charge.raw)},
        updated_at    = now()
      where id = ${paymentId}
    `;

    return {
      paymentId,
      provider: conta.provider,
      status: charge.status,
      pixCode: charge.pixCode ?? null,
      pixQrBase64: charge.pixQrBase64 ?? null,
      checkoutUrl: charge.checkoutUrl ?? null,
      expiresAt: charge.expiresAt ?? null,
    };
  } catch (error) {
    const detalhe =
      error instanceof PaymentError
        ? [error.message, error.detail].filter(Boolean).join(" — ")
        : error instanceof Error
          ? error.message
          : "falha desconhecida";

    await sql`
      update payments
      set status = 'failed', last_error = ${detalhe.slice(0, 500)}, updated_at = now()
      where id = ${paymentId}
    `;
    throw error;
  }
}

/**
 * Confere uma cobrança contra o gateway e grava o desfecho.
 *
 * É o único lugar do sistema que marca pedido como pago. Chamado pelo webhook
 * e pela varredura de reconciliação — os dois caminhos passam exatamente pelas
 * mesmas conferências.
 */
export async function settleCharge(
  providerId: string,
  ref: {
    providerChargeId?: string;
    orderCode?: string;
    /**
     * Obrigatório junto com `orderCode`: o código do pedido (#GQV3) é único
     * por pizzaria, não no sistema inteiro. Procurar só pelo código podia
     * acertar o pedido de outra loja com o mesmo sorteio.
     */
    tenantId?: string;
  },
): Promise<{ resolved: boolean; status?: PaymentStatus }> {
  const provider = getProvider(providerId);
  if (!provider) return { resolved: false };

  const linha = await findPaymentRow(providerId, ref);
  if (!linha) return { resolved: false };

  const conta = await accountByProvider(linha.tenant_id, providerId);
  if (!conta) return { resolved: false };

  const chargeId = ref.providerChargeId ?? linha.provider_charge_id;
  if (!chargeId) return { resolved: false };

  const atual = await provider.fetchCharge(conta.credentials, chargeId);

  // O gateway pode informar o pagamento com um id diferente do que criamos
  // (no cartão, criamos a preferência e ele avisa o pagamento). Guardar o id
  // verdadeiro é o que deixa a reconciliação futura funcionar.
  const idFinal = ref.providerChargeId ?? chargeId;

  let status = atual.status;
  let erro: string | null = null;

  // Conferência de valor: só vale como pago quem pagou o que devia. Uma folga
  // de um centavo cobre arredondamento do gateway, não pagamento parcial.
  if (status === "paid" && atual.amount != null) {
    const devido = num(linha.amount);
    if (atual.amount + 0.01 < devido) {
      status = "pending";
      erro = `Valor recebido (R$ ${atual.amount.toFixed(2)}) menor que o pedido (R$ ${devido.toFixed(2)}).`;
    }
  }

  const jaEstavaPago = linha.status === "paid";

  // coalesce e não atribuição direta: um pagamento estornado continua tendo
  // uma data em que foi pago, e essa data é o que explica o extrato depois.
  const pagoEm = status === "paid" ? (atual.paidAt ?? new Date()) : null;

  await sql`
    update payments set
      provider_charge_id = ${idFinal},
      status     = ${status},
      paid_at    = coalesce(${pagoEm}, paid_at),
      last_error = ${erro},
      raw        = ${sql.json(atual.raw as JsonObject)},
      updated_at = now()
    where id = ${linha.id}
  `;

  await sql`
    update orders set payment_status = ${status}, updated_at = now()
    where id = ${linha.order_id}
  `;

  // O aviso só sai na virada para pago, e uma vez só: o gateway reenvia o
  // mesmo evento, e a pizzaria não pode ouvir o alerta cinco vezes.
  if (status === "paid" && !jaEstavaPago) {
    await avisarPagamento(linha.tenant_id, linha.order_id);
  }

  return { resolved: true, status };
}

type PaymentRow = {
  id: string;
  order_id: string;
  tenant_id: string;
  provider_charge_id: string | null;
  amount: string;
  status: PaymentStatus;
};

async function findPaymentRow(
  providerId: string,
  ref: { providerChargeId?: string; orderCode?: string; tenantId?: string },
): Promise<PaymentRow | null> {
  if (ref.providerChargeId) {
    const rows = (await sql`
      select id, order_id, tenant_id, provider_charge_id, amount, status
      from payments
      where provider = ${providerId} and provider_charge_id = ${ref.providerChargeId}
      limit 1
    `) as unknown as PaymentRow[];
    if (rows[0]) return rows[0];
  }

  // Sem correspondência por id, procura pelo código do pedido. É o caminho do
  // cartão, onde o id que criamos (a preferência) não é o id que o gateway
  // avisa (o pagamento).
  //
  // Sempre dentro de uma pizzaria: `orders.code` é único por tenant, e duas
  // lojas podem sortear o mesmo #GQV3. Sem o tenant, a busca é ambígua — e
  // ambiguidade aqui marcaria como pago o pedido errado, de outra loja.
  if (ref.orderCode && ref.tenantId) {
    const rows = (await sql`
      select p.id, p.order_id, p.tenant_id, p.provider_charge_id, p.amount, p.status
      from payments p
      join orders o on o.id = p.order_id
      where p.provider = ${providerId}
        and p.tenant_id = ${ref.tenantId}
        and o.code = ${ref.orderCode}
      order by p.created_at desc
      limit 1
    `) as unknown as PaymentRow[];
    if (rows[0]) return rows[0];
  }

  return null;
}

async function avisarPagamento(tenantId: string, orderId: string) {
  const rows = await sql`
    select code, customer_name, total from orders where id = ${orderId} limit 1
  `;
  const pedido = rows[0];
  if (!pedido) return;

  const total = num(pedido.total).toFixed(2).replace(".", ",");
  await notifyTenant(tenantId, {
    title: `Pagamento confirmado #${pedido.code}`,
    body: `${pedido.customer_name} · R$ ${total} já está pago`,
    url: "/admin/pedidos",
    tag: `pedido-${pedido.code}`,
  });
}

/**
 * Recebe um aviso de gateway, do começo ao fim.
 *
 * A ordem importa: assinatura primeiro, trava de repetição depois, consulta ao
 * gateway por último. Cada etapa protege a seguinte.
 */
export async function handleWebhook(
  providerId: string,
  request: Request,
  rawBody: string,
): Promise<{ ok: boolean; reason?: string }> {
  const provider = getProvider(providerId);
  if (!provider) return { ok: false, reason: "gateway desconhecido" };

  // A credencial que valida a assinatura é a da pizzaria, e o aviso não diz de
  // qual pizzaria é. Tenta contra cada conta ativa deste gateway até uma
  // assinatura bater — é o que identifica a loja, com segurança.
  const contas = (await sql`
    select tenant_id from tenant_payment_accounts
    where provider = ${providerId} and is_active
  `) as unknown as { tenant_id: string }[];

  let leitura: WebhookRead | null = null;
  let tenantId: string | null = null;
  for (const { tenant_id } of contas) {
    const conta = await accountByProvider(tenant_id, providerId);
    if (!conta) continue;
    leitura = await provider.readWebhook(conta.credentials, request, rawBody);
    if (leitura) {
      // A assinatura que bateu é o que identifica a loja: só quem tem a chave
      // dela consegue produzi-la.
      tenantId = tenant_id;
      break;
    }
  }

  if (!leitura || !tenantId) return { ok: false, reason: "assinatura inválida" };

  // Trava de repetição: o gateway reenvia enquanto não receber 200. Se este
  // insert falhar por chave duplicada, o evento já foi tratado.
  try {
    await sql`
      insert into payment_webhook_events (provider, external_id, payload)
      values (${providerId}, ${leitura.externalId}, ${sql.json({
        chargeId: leitura.providerChargeId ?? null,
        orderCode: leitura.orderCode ?? null,
      })})
    `;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: true, reason: "evento repetido" };
    }
    throw error;
  }

  let resultado: { resolved: boolean; status?: PaymentStatus };
  try {
    resultado = await settleCharge(providerId, {
      providerChargeId: leitura.providerChargeId,
      orderCode: leitura.orderCode,
      tenantId,
    });
  } catch (error) {
    // A trava de repetição só pode valer para evento de fato processado. Se a
    // consulta ao gateway falhou, apagar a marca devolve o evento à fila: o
    // gateway reenvia e desta vez pode dar certo. Sem isto, uma falha passageira
    // enterraria o aviso para sempre — e o pedido pago ficaria pendente.
    await sql`
      delete from payment_webhook_events
      where provider = ${providerId} and external_id = ${leitura.externalId}
    `;
    throw error;
  }

  await sql`
    update payment_webhook_events
    set processed_at = now()
    where provider = ${providerId} and external_id = ${leitura.externalId}
  `;

  return resultado.resolved
    ? { ok: true }
    : { ok: false, reason: "cobrança não encontrada" };
}

/**
 * Varredura das cobranças sem desfecho.
 *
 * Webhook não é garantia: o gateway pode falhar em avisar, e neste projeto a
 * internet cai por conta própria. Sem esta varredura, um Pix pago viraria um
 * pedido eternamente "aguardando pagamento" — o pior desfecho possível, porque
 * o dinheiro saiu e a pizza não.
 */
export async function reconcilePending(limite = 50): Promise<number> {
  const pendentes = (await sql`
    select p.id, p.provider, p.provider_charge_id, p.tenant_id, o.code
    from payments p
    join orders o on o.id = p.order_id
    where p.status = 'pending'
      and p.provider_charge_id is not null
      and p.created_at > now() - interval '2 days'
    order by p.created_at
    limit ${limite}
  `) as unknown as {
    id: string;
    provider: string;
    provider_charge_id: string;
    tenant_id: string;
    code: string;
  }[];

  let resolvidos = 0;
  for (const linha of pendentes) {
    try {
      const r = await settleCharge(linha.provider, {
        providerChargeId: linha.provider_charge_id,
        orderCode: linha.code,
        tenantId: linha.tenant_id,
      });
      if (r.status && r.status !== "pending") resolvidos++;
    } catch (error) {
      // Uma cobrança problemática não pode parar a fila das outras.
      console.error(`Reconciliação falhou para ${linha.id}`, error);
    }
  }
  return resolvidos;
}

/** Última cobrança de um pedido — é o que a tela de acompanhamento mostra. */
export async function latestChargeForOrder(orderId: string) {
  const rows = await sql`
    select id, provider, status, method, pix_code, pix_qr_base64,
           checkout_url, expires_at, amount
    from payments
    where order_id = ${orderId}
    order by created_at desc
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    provider: row.provider as string,
    status: row.status as PaymentStatus,
    method: row.method as string,
    pixCode: (row.pix_code as string | null) ?? null,
    pixQrBase64: (row.pix_qr_base64 as string | null) ?? null,
    checkoutUrl: (row.checkout_url as string | null) ?? null,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    amount: num(row.amount),
  };
}

export function generateIdempotencyKey(): string {
  return randomUUID();
}
