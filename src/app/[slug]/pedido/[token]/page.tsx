import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageCircle } from "lucide-react";

import { formatTime, money } from "@/lib/format";
import { getTenantBySlug } from "@/lib/menu";
import { getOrderByToken } from "@/lib/orders";
import { latestChargeForOrder } from "@/lib/payments/charges";
import { PAYMENT_LABEL, STATUS_HINT, STATUS_LABEL, timelineFor } from "@/lib/status";
import { mapsUrl } from "@/lib/utils";

import { AutoRefresh } from "./auto-refresh";
import { PagamentoPendente } from "./pagamento";

export const metadata = { title: "Acompanhar pedido" };

export default async function OrderPage({
  params,
}: PageProps<"/[slug]/pedido/[token]">) {
  const { slug, token } = await params;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const order = await getOrderByToken(tenant.id, token);
  if (!order) notFound();

  const steps = timelineFor(order.delivery_type);
  const currentIndex = steps.indexOf(order.status);
  const cancelled = order.status === "cancelled";

  // O painel de pagamento só existe enquanto há o que pagar: forma online,
  // ainda pendente e pedido de pé.
  const online =
    order.payment_method === "pix_online" ||
    order.payment_method === "card_online";
  const cobranca =
    online && order.payment_status === "pending" && !cancelled
      ? await latestChargeForOrder(order.id)
      : null;

  const whatsappUrl = tenant.whatsapp
    ? `https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(
        `Olá! Sou ${order.customer_name}, acabei de fazer o pedido ${order.code}.`,
      )}`
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <AutoRefresh active={!cancelled && order.status !== "delivered"} />

      <div className="rounded-3xl border border-line bg-surface p-6 text-center">
        <span
          className="mx-auto grid size-14 place-items-center rounded-full"
          style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
        >
          <Check className="size-7" strokeWidth={3} />
        </span>
        <h1 className="mt-4 text-xl font-bold">
          {cancelled
            ? "Pedido cancelado"
            : cobranca
              ? "Falta pagar"
              : "Pedido recebido!"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {cobranca
            ? "Seu pedido está guardado. Assim que o pagamento cair, a pizzaria começa."
            : STATUS_HINT[order.status]}
        </p>
        <p className="mt-4 inline-block rounded-full bg-background px-4 py-1.5 font-mono text-sm font-bold tracking-wider">
          #{order.code}
        </p>
        <p className="mt-2 text-xs text-muted">
          Feito às {formatTime(order.created_at, tenant.timezone)} · previsão de{" "}
          {tenant.prep_time_min} min
        </p>
      </div>

      {cobranca && (
        <PagamentoPendente
          token={token}
          amount={cobranca.amount}
          pixCode={cobranca.pixCode}
          pixQrBase64={cobranca.pixQrBase64}
          checkoutUrl={cobranca.checkoutUrl}
          expiresAt={cobranca.expiresAt?.toISOString() ?? null}
        />
      )}

      {!cancelled && (
        <section className="mt-5 rounded-3xl border border-line bg-surface p-5">
          <ol className="space-y-4">
            {steps.map((step, index) => {
              const done = index <= currentIndex;
              const active = index === currentIndex;
              return (
                <li key={step} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full border-2 transition"
                      style={
                        done
                          ? {
                              background: "var(--brand)",
                              borderColor: "var(--brand)",
                              color: "var(--brand-ink)",
                            }
                          : { borderColor: "var(--line)" }
                      }
                    >
                      {done && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    {index < steps.length - 1 && (
                      <span
                        className="w-0.5 flex-1"
                        style={{
                          minHeight: 20,
                          background: done ? "var(--brand)" : "var(--line)",
                        }}
                      />
                    )}
                  </span>
                  <span className={`pb-1 text-sm ${active ? "font-semibold" : done ? "" : "text-muted"}`}>
                    {STATUS_LABEL[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {cancelled && order.cancel_reason && (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Motivo: {order.cancel_reason}
        </p>
      )}

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">
          Itens
        </h2>
        <ul className="divide-y divide-line">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-2.5 first:pt-0">
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {item.quantity}× {item.title}
                </span>
                {item.notes && (
                  <span className="block text-xs italic text-muted">
                    “{item.notes}”
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm font-semibold">
                {money(item.total_price)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Taxa de entrega</dt>
            <dd>{order.delivery_fee > 0 ? money(order.delivery_fee) : "Grátis"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 font-bold">
            <dt>Total</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted">
          {PAYMENT_LABEL[order.payment_method]}
          {order.change_for ? ` · troco para ${money(order.change_for)}` : ""}
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 text-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">
          {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
        </h2>
        {order.delivery_type === "delivery" ? (
          <p className="text-muted">
            {order.address_street}, {order.address_number}
            {order.address_complement ? ` — ${order.address_complement}` : ""}
            {order.address_district ? `, ${order.address_district}` : ""}
            {order.address_city ? ` — ${order.address_city}` : ""}
            {order.address_reference ? ` (${order.address_reference})` : ""}
          </p>
        ) : tenant.address ? (
          <a
            href={mapsUrl(tenant.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline decoration-dotted underline-offset-4 transition hover:text-foreground"
          >
            {tenant.address} · como chegar
          </a>
        ) : (
          <p className="text-muted">Retirar no balcão</p>
        )}
        <p className="mt-2 text-muted">
          {order.customer_name} · {order.customer_phone}
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold transition hover:border-stone-300"
          >
            <MessageCircle className="size-4" />
            Falar com a pizzaria
          </a>
        )}
        <Link
          href={`/${slug}`}
          className="flex flex-1 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
          style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
        >
          Fazer outro pedido
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Salve este link para acompanhar seu pedido.
      </p>
    </main>
  );
}
