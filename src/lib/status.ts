import type { OrderStatus, PaymentMethod } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando confirmação",
  confirmed: "Pedido confirmado",
  preparing: "Na cozinha",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const STATUS_HINT: Record<OrderStatus, string> = {
  pending: "A pizzaria vai confirmar seu pedido em instantes.",
  confirmed: "Seu pedido entrou na fila de produção.",
  preparing: "Sua pizza está sendo montada e assada.",
  ready: "Tudo pronto! Já já sai para você.",
  out_for_delivery: "O entregador está a caminho.",
  delivered: "Bom apetite!",
  cancelled: "Este pedido foi cancelado.",
};

/** Etapas mostradas na linha do tempo — retirada não passa por entrega. */
export function timelineFor(deliveryType: "delivery" | "pickup"): OrderStatus[] {
  return deliveryType === "delivery"
    ? ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]
    : ["pending", "confirmed", "preparing", "ready", "delivered"];
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Dinheiro na entrega",
  card_delivery: "Cartão na entrega",
  pix_manual: "Pix (chave)",
  pix_online: "Pix online",
  card_online: "Cartão online",
};

/** Status seguintes que a pizzaria pode acionar a partir do atual. */
export function nextStatuses(
  status: OrderStatus,
  deliveryType: "delivery" | "pickup",
): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["preparing", "cancelled"];
    case "preparing":
      return deliveryType === "delivery" ? ["out_for_delivery"] : ["ready"];
    case "ready":
      return ["delivered"];
    case "out_for_delivery":
      return ["delivered"];
    default:
      return [];
  }
}
