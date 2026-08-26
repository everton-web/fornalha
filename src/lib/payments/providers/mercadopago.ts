import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { JsonObject, PaymentStatus } from "@/lib/types";
import {
  PaymentError,
  type Charge,
  type ChargeInput,
  type ChargeStatus,
  type Credentials,
  type PaymentProvider,
  type WebhookRead,
} from "@/lib/payments/types";

/**
 * Mercado Pago.
 *
 * Primeiro adaptador porque é o gateway que a pizzaria já conhece: quase toda
 * loja pequena tem conta, e o cliente reconhece a marca na hora de pagar.
 *
 * Pix sai por `/v1/payments` (a cobrança já nasce com copia-e-cola e QR).
 * Cartão sai por `/checkout/preferences`, que devolve um endereço para onde
 * mandar o cliente — e é por isso que os dois caminhos não compartilham o
 * mesmo id, ver a nota em `fetchCharge`.
 */

const API = "https://api.mercadopago.com";
const TIMEOUT_MS = 12_000;

type MpPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  date_approved?: string | null;
  external_reference?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

type MpPreference = {
  id?: string;
  init_point?: string;
  external_reference?: string | null;
};

/** approved é o único que libera o pedido; o resto ou espera ou morre. */
function mapStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "approved":
      return "paid";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "rejected":
    case "cancelled":
      return "failed";
    default:
      // pending, in_process, authorized e o que o Mercado Pago inventar
      return "pending";
  }
}

async function call<T>(
  credentials: Credentials,
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const token = credentials.access_token;
  if (!token) throw new PaymentError("Credencial do Mercado Pago ausente.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string>) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new PaymentError(
      "O Mercado Pago não respondeu. Tente de novo em instantes.",
      error instanceof Error ? error.message : undefined,
    );
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // resposta que não é JSON só interessa como texto de erro
  }

  if (!response.ok) {
    const detail =
      (body as { message?: string } | null)?.message || text.slice(0, 300);
    throw new PaymentError(
      "O Mercado Pago recusou a cobrança.",
      `HTTP ${response.status} — ${detail}`,
    );
  }

  return body as T;
}

/**
 * O Mercado Pago quer a expiração com fuso explícito e recusa o "Z" do
 * toISOString(). O deslocamento zero escrito por extenso é ISO 8601 válido e
 * passa nos dois lados.
 */
function expiresAt(minutes: number): { iso: string; date: Date } {
  const date = new Date(Date.now() + minutes * 60_000);
  return { iso: date.toISOString().replace("Z", "+00:00"), date };
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return {
    first: parts[0] || "Cliente",
    last: parts.slice(1).join(" ") || "-",
  };
}

export const mercadopago: PaymentProvider = {
  id: "mercadopago",
  label: "Mercado Pago",
  summary:
    "O mais conhecido pelo cliente final. Pix e cartão, com conta que a maioria das pizzarias já tem.",

  supports: ["pix", "card"],

  credentialFields: [
    {
      name: "access_token",
      label: "Access token de produção",
      help: "Painel do Mercado Pago → Suas integrações → Credenciais de produção.",
      secret: true,
    },
    {
      name: "webhook_secret",
      label: "Chave secreta do webhook",
      help: "Gerada em Suas integrações → Webhooks. Sem ela, nenhum aviso é aceito.",
      secret: true,
    },
  ],

  async createCharge(credentials, input): Promise<Charge> {
    if (input.kind === "pix") return criarPix(credentials, input);
    return criarPreferenciaCartao(credentials, input);
  },

  /**
   * Confere a assinatura e diz qual cobrança olhar — nunca o desfecho dela.
   *
   * O Mercado Pago assina um texto montado com o id do recurso, o id da
   * requisição e o carimbo de tempo. Se o cálculo não bater, o aviso é
   * descartado: alguém que descubra o endereço do webhook não consegue
   * marcar pedido como pago.
   */
  async readWebhook(credentials, request, rawBody): Promise<WebhookRead | null> {
    const secret = credentials.webhook_secret;
    if (!secret) return null;

    const signature = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id") ?? "";
    if (!signature) return null;

    const partes = Object.fromEntries(
      signature.split(",").map((p) => {
        const [k, ...v] = p.trim().split("=");
        return [k, v.join("=")];
      }),
    );
    const ts = partes.ts;
    const v1 = partes.v1;
    if (!ts || !v1) return null;

    const url = new URL(request.url);
    let body: { type?: string; action?: string; data?: { id?: string } } = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // aviso sem corpo JSON ainda pode trazer tudo na query
    }

    const dataId = url.searchParams.get("data.id") ?? body.data?.id;
    if (!dataId) return null;

    // Id alfanumérico entra em minúsculas no cálculo, exigência do gateway.
    const idParaAssinatura = /^[0-9]+$/.test(String(dataId))
      ? String(dataId)
      : String(dataId).toLowerCase();

    const manifest = `id:${idParaAssinatura};request-id:${requestId};ts:${ts};`;
    const esperado = createHmac("sha256", secret).update(manifest).digest("hex");

    const a = Buffer.from(esperado, "utf8");
    const b = Buffer.from(v1, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const tipo = url.searchParams.get("type") ?? body.type;
    // Só interessa aviso de pagamento; merchant_order e afins não movem status.
    if (tipo && tipo !== "payment") return null;

    return {
      // ts junto do id: o gateway reenvia o mesmo evento, e é esse par que o
      // identifica de forma estável.
      externalId: `${dataId}:${ts}`,
      providerChargeId: String(dataId),
    };
  },

  /**
   * A fonte da verdade.
   *
   * O id que chega aqui é sempre de pagamento, nunca de preferência: no
   * cartão, a preferência serve só para levar o cliente até a tela do Mercado
   * Pago, e o aviso posterior traz o id do pagamento de verdade. O que liga um
   * ao outro é o `external_reference`, que é o código do nosso pedido.
   */
  async fetchCharge(credentials, providerChargeId): Promise<ChargeStatus> {
    const pago = await call<MpPayment>(
      credentials,
      `/v1/payments/${encodeURIComponent(providerChargeId)}`,
      { method: "GET" },
    );

    return {
      status: mapStatus(pago.status),
      paidAt: pago.date_approved ? new Date(pago.date_approved) : null,
      amount:
        typeof pago.transaction_amount === "number"
          ? pago.transaction_amount
          : null,
      orderCode: pago.external_reference ?? null,
      raw: pago as unknown as JsonObject,
    };
  },
};

async function criarPix(
  credentials: Credentials,
  input: ChargeInput,
): Promise<Charge> {
  const { iso, date } = expiresAt(input.expiresInMinutes);
  const nome = splitName(input.customer.name);

  const pago = await call<MpPayment>(credentials, "/v1/payments", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.orderCode,
      notification_url: input.notificationUrl,
      date_of_expiration: iso,
      payer: {
        // O Mercado Pago exige e-mail. Sem um do cliente, um endereço
        // derivado do pedido evita recusar a cobrança por causa do campo.
        email:
          input.customer.email ||
          `pedido-${input.orderCode.toLowerCase()}@fornalha.app`,
        first_name: nome.first,
        last_name: nome.last,
      },
    }),
  });

  const dados = pago.point_of_interaction?.transaction_data;
  if (!dados?.qr_code) {
    throw new PaymentError(
      "O Mercado Pago não devolveu o código Pix.",
      `status=${pago.status} detail=${pago.status_detail}`,
    );
  }

  return {
    providerChargeId: String(pago.id),
    status: mapStatus(pago.status),
    pixCode: dados.qr_code,
    pixQrBase64: dados.qr_code_base64,
    expiresAt: date,
    raw: pago as unknown as JsonObject,
  };
}

async function criarPreferenciaCartao(
  credentials: Credentials,
  input: ChargeInput,
): Promise<Charge> {
  const { iso, date } = expiresAt(input.expiresInMinutes);

  const preferencia = await call<MpPreference>(
    credentials,
    "/checkout/preferences",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: JSON.stringify({
        items: [
          {
            title: input.description,
            quantity: 1,
            unit_price: Number(input.amount.toFixed(2)),
            currency_id: "BRL",
          },
        ],
        external_reference: input.orderCode,
        notification_url: input.notificationUrl,
        back_urls: {
          success: input.returnUrl,
          pending: input.returnUrl,
          failure: input.returnUrl,
        },
        auto_return: "approved",
        // Pix e boleto saem daqui: quem escolheu cartão vai ver cartão. O Pix
        // tem caminho próprio, que já entrega o copia-e-cola sem sair do site.
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
        },
        expires: true,
        expiration_date_to: iso,
      }),
    },
  );

  if (!preferencia.init_point || !preferencia.id) {
    throw new PaymentError("O Mercado Pago não devolveu o link de pagamento.");
  }

  return {
    providerChargeId: String(preferencia.id),
    status: "pending",
    checkoutUrl: preferencia.init_point,
    expiresAt: date,
    raw: preferencia as unknown as JsonObject,
  };
}
