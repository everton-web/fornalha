import { requireSession } from "@/lib/auth";
import { money } from "@/lib/format";
import { listOrders } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

import { OrderCard } from "./order-card";
import { PushToggle } from "../_components/push-toggle";
import { OrdersLive } from "./orders-live";

const ACTIVE: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

export const metadata = { title: "Pedidos" };

export default async function PedidosPage({
  searchParams,
}: PageProps<"/admin/pedidos">) {
  const session = await requireSession();
  const { historico } = await searchParams;
  const showHistory = historico === "1";

  const orders = await listOrders(session.tenant.id, {
    statuses: showHistory ? undefined : ACTIVE,
    limit: showHistory ? 100 : 60,
  });

  // Contagem de ativos para o indicador: no histórico, a lista traz tudo.
  const ativos = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;

  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + o.total, 0);

  return (
    <>
      <OrdersLive activeCount={showHistory ? ativos : orders.length} />

      <div className="mb-4">
        <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          {showHistory ? "Todos os pedidos" : "Pedidos ativos"}
        </h1>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted">
            {orders.length} pedido(s) · {money(revenue)}
          </span>
          <a
            href={showHistory ? "/admin/pedidos" : "/admin/pedidos?historico=1"}
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium transition hover:border-stone-300"
          >
            {showHistory ? "Ver só os ativos" : "Ver histórico"}
          </a>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-3xl">🍕</p>
          <p className="mt-3 font-semibold">Nenhum pedido por aqui</p>
          <p className="mt-1 text-sm text-muted">
            Os pedidos novos aparecem nesta tela automaticamente.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} timezone={session.tenant.timezone} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
