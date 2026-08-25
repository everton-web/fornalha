"use client";

import Link from "next/link";

import { money } from "@/lib/format";

import { useCart } from "./cart-provider";

/** Barra fixa que só aparece quando há algo no carrinho. */
export function CartBar({ slug }: { slug: string }) {
  const { count, subtotal, ready } = useCart();

  if (!ready || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur">
      <Link
        href={`/${slug}/checkout`}
        className="animate-rise mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full px-5 py-3.5 text-sm font-semibold"
        style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
      >
        <span className="grid size-6 place-items-center rounded-full bg-black/15 text-xs">
          {count}
        </span>
        <span>Ver carrinho</span>
        <span>{money(subtotal)}</span>
      </Link>
    </div>
  );
}
