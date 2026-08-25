import { formatDateTime, money } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";
import { PAYMENT_LABEL } from "@/lib/status";
import type { Tenant } from "@/lib/types";

export type ReceiptItem = {
  quantity: number;
  title: string;
  /** "borda Catupiry · Extra bacon" — o que a cozinha precisa ver embaixo do nome */
  extras: string;
  note: string;
  price: string;
};

export type Receipt = {
  storeName: string;
  storeInfo: string[];
  code: string;
  placedAt: string;
  mode: string;
  customerName: string;
  customerPhone: string;
  addressLines: string[];
  items: ReceiptItem[];
  totals: { label: string; value: string; strong?: boolean }[];
  payment: string;
  notes: string;
  cancelled: boolean;
};

/**
 * Monta o cupom uma vez só, para o HTML e a imagem saírem idênticos.
 *
 * Tudo vem do snapshot gravado no pedido, nunca do cardápio atual: o cupom de
 * um pedido de semana passada tem que sair com os valores daquela semana.
 */
export function buildReceipt(order: OrderRow, tenant: Tenant): Receipt {
  const storeInfo = [tenant.address, tenant.phone].filter(
    (v): v is string => Boolean(v),
  );

  const addressLines: string[] = [];
  if (order.delivery_type === "delivery") {
    const rua = [order.address_street, order.address_number]
      .filter(Boolean)
      .join(", ");
    if (rua) addressLines.push(rua);

    const complemento = [order.address_complement, order.address_district]
      .filter(Boolean)
      .join(" - ");
    if (complemento) addressLines.push(complemento);

    if (order.address_city) addressLines.push(order.address_city);
    if (order.address_reference) addressLines.push(`Ref: ${order.address_reference}`);
  } else if (tenant.address) {
    addressLines.push(`Retirada em ${tenant.address}`);
  }

  const items: ReceiptItem[] = order.order_items.map((item) => {
    const details = item.details as {
      crust?: { name: string; price: number } | null;
      addons?: { name: string }[];
    };

    const extras = [
      details?.crust && details.crust.price > 0 ? `borda ${details.crust.name}` : null,
      ...(details?.addons ?? []).map((a) => a.name),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      quantity: item.quantity,
      title: item.title,
      extras,
      note: item.notes ?? "",
      price: money(item.total_price),
    };
  });

  const totals: Receipt["totals"] = [
    { label: "Subtotal", value: money(order.subtotal) },
    {
      label: "Taxa de entrega",
      value: order.delivery_fee > 0 ? money(order.delivery_fee) : "Gratis",
    },
  ];
  if (order.discount > 0) {
    totals.push({ label: "Desconto", value: `- ${money(order.discount)}` });
  }
  totals.push({ label: "TOTAL", value: money(order.total), strong: true });

  const payment =
    PAYMENT_LABEL[order.payment_method] +
    (order.change_for ? ` - troco para ${money(order.change_for)}` : "");

  return {
    storeName: tenant.name,
    storeInfo,
    code: order.code,
    placedAt: formatDateTime(order.created_at, tenant.timezone),
    mode: order.delivery_type === "delivery" ? "ENTREGA" : "RETIRADA",
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    addressLines,
    items,
    totals,
    payment,
    notes: order.notes ?? "",
    cancelled: order.status === "cancelled",
  };
}

/**
 * Altura da imagem do cupom, em pixels.
 *
 * Satori exige altura fixa, então estimamos. Erra-se para mais de propósito:
 * sobrar papel branco é irritante, cortar o valor a pagar é inaceitável.
 * Nome de pizza com dois sabores passa de uma linha, e isso é contado.
 */
export function estimateHeight(receipt: Receipt): number {
  /** cabeçalho, número do pedido, divisores e margens */
  const BASE = 360;
  const ALTURA_LINHA = 30;
  /** caracteres que cabem numa linha de item, na fonte usada */
  const CHARS_POR_LINHA = 26;
  const FOLGA = 40;

  const linhasDeItem = receipt.items.reduce((acc, item) => {
    const titulo = Math.max(
      1,
      Math.ceil(`${item.quantity}x ${item.title}`.length / CHARS_POR_LINHA),
    );
    return acc + titulo + (item.extras ? 1 : 0) + (item.note ? 1 : 0);
  }, 0);

  const outrasLinhas =
    receipt.storeInfo.length +
    receipt.addressLines.length +
    receipt.totals.length +
    (receipt.notes ? 3 : 0) +
    (receipt.cancelled ? 1 : 0);

  return BASE + (linhasDeItem + outrasLinhas) * ALTURA_LINHA + FOLGA;
}
