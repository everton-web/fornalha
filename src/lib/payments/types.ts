import type { JsonObject, PaymentStatus } from "@/lib/types";

/**
 * Contrato único de gateway de pagamento.
 *
 * O resto do sistema — checkout, painel, tela de acompanhamento — nunca sabe
 * qual gateway está em uso. Acrescentar Asaas, Pagar.me/Stone, InfinitePay,
 * PicPay ou Stripe é escrever um arquivo em `providers/` que implemente esta
 * interface e registrá-lo em `registry.ts`. Nada além disso muda.
 *
 * Nubank não aparece na lista de propósito: o Nubank não vende API de checkout
 * para lojista. "Pagar pelo Nubank" é pagar por Pix, e Pix é padrão do Banco
 * Central — uma cobrança Pix gerada em qualquer gateway daqui é paga de
 * qualquer banco, sem integração nenhuma do nosso lado.
 */

export type ProviderId =
  | "mercadopago"
  | "asaas"
  | "pagarme"
  | "infinitepay"
  | "picpay"
  | "stripe";

/** O que o cliente escolhe. Pix e cartão; o resto acontece na entrega. */
export type PaymentKind = "pix" | "card";

/** Credenciais decifradas, no formato que cada gateway declara. */
export type Credentials = Record<string, string>;

export type ChargeInput = {
  /** Em reais. O servidor recalcula sempre; nunca vem da tela. */
  amount: number;
  kind: PaymentKind;
  /** Código curto do pedido (#GQV3) — vira a referência externa no gateway. */
  orderCode: string;
  description: string;
  customer: { name: string; phone: string; email: string | null };
  /** Endereço absoluto que o gateway chama quando algo acontece. */
  notificationUrl: string;
  /** Para onde devolver o cliente depois do cartão. */
  returnUrl: string;
  expiresInMinutes: number;
  /** Evita cobrança dupla quando a rede engasga e a chamada é repetida. */
  idempotencyKey: string;
};

export type Charge = {
  providerChargeId: string;
  status: PaymentStatus;
  /** Pix copia-e-cola. */
  pixCode?: string;
  /** QR já em base64, para a tela não precisar gerar imagem. */
  pixQrBase64?: string;
  /** Cartão: para onde mandar o cliente. */
  checkoutUrl?: string;
  expiresAt?: Date;
  raw: JsonObject;
};

/**
 * O que se aproveita de um aviso de webhook.
 *
 * Repare no que **não** está aqui: o status. É deliberado. O corpo do webhook
 * é entrada não confiável — qualquer um que descubra o endereço pode postar
 * "pago" nele. O aviso só serve para dizer *qual* cobrança olhar; o desfecho
 * vem sempre de `fetchCharge`, consultando o gateway. O tipo força isso: não
 * há como um adaptador devolver status daqui nem por engano.
 */
export type WebhookRead = {
  /** Id do evento no gateway — a trava contra processar o mesmo aviso duas vezes. */
  externalId: string;
  /** Id da cobrança, quando o aviso traz. */
  providerChargeId?: string;
  /** Código do pedido, quando o gateway devolve a referência externa. */
  orderCode?: string;
};

export type ChargeStatus = {
  status: PaymentStatus;
  paidAt: Date | null;
  /** Valor que o gateway diz ter recebido — conferido contra o pedido. */
  amount: number | null;
  /**
   * Referência externa devolvida pelo gateway (o código do pedido).
   *
   * É o que salva o caso do cartão: alguns gateways criam a cobrança com um id
   * (a preferência de checkout) e avisam o pagamento com outro. Sem uma
   * referência nossa dos dois lados, não haveria como ligar um ao outro.
   */
  orderCode: string | null;
  raw: JsonObject;
};

/** Campo de credencial que a pizzaria preenche no painel. */
export type CredentialField = {
  name: string;
  label: string;
  help?: string;
  /** true = nunca volta para a tela depois de salvo. */
  secret: boolean;
  optional?: boolean;
};

export interface PaymentProvider {
  id: ProviderId;
  label: string;
  /** Uma linha no painel, explicando para quem é. */
  summary: string;
  supports: PaymentKind[];
  credentialFields: CredentialField[];

  /** Cria a cobrança e devolve o que o cliente precisa ver. */
  createCharge(credentials: Credentials, input: ChargeInput): Promise<Charge>;

  /**
   * Confere a assinatura do aviso e diz qual cobrança olhar.
   * Devolve null quando a assinatura não bate — o aviso é descartado.
   */
  readWebhook(
    credentials: Credentials,
    request: Request,
    rawBody: string,
  ): Promise<WebhookRead | null>;

  /** A fonte da verdade sobre o desfecho da cobrança. */
  fetchCharge(
    credentials: Credentials,
    providerChargeId: string,
  ): Promise<ChargeStatus>;
}

/** Erro esperado de gateway — mensagem já pronta para a tela. */
export class PaymentError extends Error {
  readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "PaymentError";
    this.detail = detail;
  }
}
