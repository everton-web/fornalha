import "server-only";

import { asJson, num, numOrNull, sql } from "@/lib/db";
import type {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductKind,
} from "@/lib/types";

export type OrderItemRow = {
  id: string;
  kind: ProductKind;
  title: string;
  details: Record<string, unknown>;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
};

export type OrderRow = {
  id: string;
  tenant_id: string;
  code: string;
  public_token: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_reference: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  change_for: number | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItemRow[];
};

function normalizeOrder(row: Record<string, unknown>): Omit<OrderRow, "order_items"> {
  const order = row as unknown as OrderRow;
  return {
    ...order,
    created_at: new Date(order.created_at).toISOString(),
    updated_at: new Date(order.updated_at).toISOString(),
    subtotal: num(row.subtotal),
    delivery_fee: num(row.delivery_fee),
    discount: num(row.discount),
    total: num(row.total),
    change_for: numOrNull(row.change_for),
  };
}

function normalizeItem(row: Record<string, unknown>): OrderItemRow {
  return {
    ...(row as unknown as OrderItemRow),
    details: asJson<Record<string, unknown>>(row.details, {}),
    quantity: Number(row.quantity),
    unit_price: num(row.unit_price),
    total_price: num(row.total_price),
  };
}

/** Busca os itens de vários pedidos de uma vez — nada de N+1 na tela da cozinha. */
async function attachItems(
  orders: Omit<OrderRow, "order_items">[],
): Promise<OrderRow[]> {
  if (orders.length === 0) return [];

  const items = await sql`
    select id, order_id, kind, title, details, quantity, unit_price, total_price, notes
    from order_items
    where order_id in ${sql(orders.map((o) => o.id))}
  `;

  const byOrder = new Map<string, OrderItemRow[]>();
  for (const row of items) {
    const list = byOrder.get(row.order_id) ?? [];
    list.push(normalizeItem(row));
    byOrder.set(row.order_id, list);
  }

  return orders.map((order) => ({
    ...order,
    order_items: byOrder.get(order.id) ?? [],
  }));
}

/**
 * O cliente acompanha o pedido pelo token do link — nunca pelo id.
 * O token é um UUID aleatório: só quem recebeu o link consegue abrir.
 */
export async function getOrderByToken(
  tenantId: string,
  token: string,
): Promise<OrderRow | null> {
  // Token malformado nem chega ao banco (uuid inválido erraria a query).
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;

  const rows = await sql`
    select * from orders
    where tenant_id = ${tenantId} and public_token = ${token}
    limit 1
  `;
  if (!rows[0]) return null;

  const [order] = await attachItems([normalizeOrder(rows[0])]);
  return order ?? null;
}

/** Um pedido específico do tenant — usado pelo cupom, que já exige sessão. */
export async function getOrderById(
  tenantId: string,
  id: string,
): Promise<OrderRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const rows = await sql`
    select * from orders where tenant_id = ${tenantId} and id = ${id} limit 1
  `;
  if (!rows[0]) return null;

  const [order] = await attachItems([normalizeOrder(rows[0])]);
  return order ?? null;
}

export async function listOrders(
  tenantId: string,
  options: { statuses?: OrderStatus[]; limit?: number } = {},
): Promise<OrderRow[]> {
  const limit = options.limit ?? 50;
  const statuses = options.statuses;

  const rows = statuses?.length
    ? await sql`
        select * from orders
        where tenant_id = ${tenantId} and status::text = any(${statuses})
        order by created_at desc
        limit ${limit}
      `
    : await sql`
        select * from orders
        where tenant_id = ${tenantId}
        order by created_at desc
        limit ${limit}
      `;

  return attachItems(rows.map(normalizeOrder));
}
