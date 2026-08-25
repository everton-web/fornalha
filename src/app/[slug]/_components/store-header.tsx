import Link from "next/link";

import { isOpenNow, nextOpening } from "@/lib/hours";
import type { Tenant } from "@/lib/types";

import { CartButton } from "./cart-button";

export function StoreHeader({ tenant }: { tenant: Tenant }) {
  const open = isOpenNow(tenant);
  const next = open ? null : nextOpening(tenant);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href={`/${tenant.slug}`} className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl text-lg font-bold"
            style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
          >
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="size-full object-cover"
              />
            ) : (
              tenant.name.charAt(0)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">
              {tenant.name}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className={`size-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-stone-400"}`}
              />
              {open ? `Aberto · ~${tenant.prep_time_min} min` : (next ?? "Fechado")}
            </span>
          </span>
        </Link>

        <div className="ml-auto">
          <CartButton slug={tenant.slug} />
        </div>
      </div>
    </header>
  );
}
