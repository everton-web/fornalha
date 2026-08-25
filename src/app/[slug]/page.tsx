import { notFound } from "next/navigation";
import { Clock, MapPin, Bike, ShoppingBag } from "lucide-react";

import { mapsUrl } from "@/lib/utils";

import { money } from "@/lib/format";
import { isOpenNow, nextOpening } from "@/lib/hours";
import { getMenu } from "@/lib/menu";

import { CartBar } from "./_components/cart-bar";
import { MenuBrowser } from "./_components/menu-browser";

export default async function StorePage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) notFound();

  const { tenant } = menu;
  const open = isOpenNow(tenant);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32">
      <section className="py-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {tenant.name}
        </h1>
        {tenant.tagline && (
          <p className="mt-1 text-muted">{tenant.tagline}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge icon={<Clock className="size-3.5" />}>
            {open ? `Entrega em ~${tenant.prep_time_min} min` : (nextOpening(tenant) ?? "Fechado agora")}
          </Badge>
          {tenant.delivery_enabled && (
            <Badge icon={<Bike className="size-3.5" />}>
              {tenant.delivery_fee > 0
                ? `Entrega ${money(tenant.delivery_fee)}`
                : "Entrega grátis"}
            </Badge>
          )}
          {tenant.pickup_enabled && (
            <Badge icon={<ShoppingBag className="size-3.5" />}>Retirada</Badge>
          )}
          {tenant.min_order_value > 0 && (
            <Badge>Pedido mínimo {money(tenant.min_order_value)}</Badge>
          )}
        </div>

        {tenant.address && (
          <a
            href={mapsUrl(tenant.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-start gap-1.5 text-sm text-muted underline decoration-dotted underline-offset-4 transition hover:text-foreground"
          >
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {tenant.address}
              <span className="ml-1 whitespace-nowrap font-medium">&middot; como chegar</span>
            </span>
          </a>
        )}

        {!open && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Fechado no momento.</strong> Você
            pode montar seu pedido, mas só conseguirá enviar quando abrirmos.
          </div>
        )}
      </section>

      <MenuBrowser menu={menu} />
      <CartBar slug={slug} />
    </main>
  );
}

function Badge({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-stone-600">
      {icon}
      {children}
    </span>
  );
}
