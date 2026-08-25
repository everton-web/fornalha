"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bike, Clock, MapPin, Phone, Printer, ShoppingBag, X } from "lucide-react";

import { formatTime, money } from "@/lib/format";
import type { OrderRow } from "@/lib/orders";
import { PAYMENT_LABEL, STATUS_LABEL, nextStatuses } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";

import { setOrderStatus } from "../../actions";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-sky-100 text-sky-800 border-sky-200",
  preparing: "bg-violet-100 text-violet-800 border-violet-200",
  ready: "bg-teal-100 text-teal-800 border-teal-200",
  out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-stone-100 text-stone-600 border-stone-200",
};

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirmar",
  preparing: "Começar a preparar",
  ready: "Marcar pronto",
  out_for_delivery: "Saiu para entrega",
  delivered: "Concluir",
  cancelled: "Cancelar",
};

export function OrderCard({
  order,
  timezone,
}: {
  order: OrderRow;
  timezone: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [askCancel, setAskCancel] = useState(false);
  const [reason, setReason] = useState("");

  const actions = nextStatuses(order.status, order.delivery_type);
  const advance = actions.filter((s) => s !== "cancelled");
  const canCancel = actions.includes("cancelled");

  function apply(status: OrderStatus, cancelReason?: string) {
    setError(null);
    startTransition(async () => {
      const result = await setOrderStatus({
        orderId: order.id,
        status,
        reason: cancelReason,
      });
      if (!result.ok) setError(result.error);
      else setAskCancel(false);
    });
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-start gap-2">
        <div>
          <p className="font-mono text-sm font-bold tracking-wider">#{order.code}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Clock className="size-3" />
            {formatTime(order.created_at, timezone)}
          </p>
        </div>
        <Link
          href={`/admin/cupom/${order.id}?auto=1`}
          target="_blank"
          title="Imprimir cupom"
          aria-label={`Imprimir cupom do pedido ${order.code}`}
          className="ml-auto grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-stone-300 hover:text-foreground"
        >
          <Printer className="size-4" />
        </Link>

        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </header>

      <div className="mt-3 flex items-center gap-1.5 text-sm">
        {order.delivery_type === "delivery" ? (
          <Bike className="size-3.5 shrink-0 text-muted" />
        ) : (
          <ShoppingBag className="size-3.5 shrink-0 text-muted" />
        )}
        <span className="truncate font-medium">{order.customer_name}</span>
        <a
          href={`tel:${order.customer_phone.replace(/\D/g, "")}`}
          className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <Phone className="size-3" />
          {order.customer_phone}
        </a>
      </div>

      {order.delivery_type === "delivery" && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
          <MapPin className="mt-0.5 size-3 shrink-0" />
          <span>
            {order.address_street}, {order.address_number}
            {order.address_complement ? ` — ${order.address_complement}` : ""}
            {order.address_district ? `, ${order.address_district}` : ""}
            {order.address_reference ? ` (${order.address_reference})` : ""}
          </span>
        </p>
      )}

      <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id}>
            <span className="font-medium">
              {item.quantity}× {item.title}
            </span>
            {item.notes && (
              <span className="block text-xs italic text-amber-700">
                “{item.notes}”
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
          {order.notes}
        </p>
      )}

      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-xs text-muted">
          {PAYMENT_LABEL[order.payment_method]}
          {order.change_for ? ` · troco p/ ${money(order.change_for)}` : ""}
        </span>
        <span className="font-bold">{money(order.total)}</span>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {askCancel ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">Cancelar o pedido?</p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (o cliente vê)"
            className="mt-2 w-full rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => apply("cancelled", reason.trim() || undefined)}
              className="flex-1 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Confirmar cancelamento
            </button>
            <button
              type="button"
              onClick={() => setAskCancel(false)}
              className="grid size-8 place-items-center rounded-full border border-red-200"
              aria-label="Voltar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        (advance.length > 0 || canCancel) && (
          <div className="mt-3 flex gap-2">
            {advance.map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() => apply(status)}
                className="flex-1 rounded-full bg-foreground px-3 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {ACTION_LABEL[status] ?? STATUS_LABEL[status]}
              </button>
            ))}
            {canCancel && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setAskCancel(true)}
                className="rounded-full border border-line px-3 py-2.5 text-xs font-medium text-muted transition hover:border-red-300 hover:text-red-600"
              >
                Cancelar
              </button>
            )}
          </div>
        )
      )}
    </article>
  );
}
