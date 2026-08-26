import "server-only";

import { mercadopago } from "@/lib/payments/providers/mercadopago";
import type { PaymentProvider, ProviderId } from "@/lib/payments/types";

/**
 * Os gateways que o sistema sabe usar.
 *
 * Para acrescentar um: escreva `providers/<nome>.ts` implementando
 * `PaymentProvider` e some uma linha aqui. Checkout, painel, banco e tela de
 * acompanhamento não mudam — foi para isso que a interface existe.
 *
 * A fila de implementação, na ordem que faz sentido para pizzaria:
 *
 *   asaas       — Pix barato e cadastro simples; melhor custo para loja pequena
 *   pagarme     — é a API da Stone; um adaptador cobre as duas marcas
 *   infinitepay — muita loja já tem a maquininha e usa a mesma conta
 *   picpay      — PicPay Empresas
 *   stripe      — forte em cartão, fraco em Pix; para quem já usa
 */
const PROVIDERS: Partial<Record<ProviderId, PaymentProvider>> = {
  mercadopago,
};

export function getProvider(id: string): PaymentProvider | null {
  return PROVIDERS[id as ProviderId] ?? null;
}

/** Os gateways prontos para a pizzaria escolher no painel. */
export function listProviders(): PaymentProvider[] {
  return Object.values(PROVIDERS).filter(Boolean) as PaymentProvider[];
}

export function isProviderId(value: string): value is ProviderId {
  return value in PROVIDERS;
}
