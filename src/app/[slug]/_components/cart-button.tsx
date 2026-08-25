"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { useCart } from "./cart-provider";

export function CartButton({ slug }: { slug: string }) {
  const { count } = useCart();

  return (
    <Link
      href={`/${slug}/checkout`}
      aria-label={`Carrinho com ${count} item(ns)`}
      className="relative grid size-10 place-items-center rounded-full border border-line bg-surface transition hover:border-stone-300"
    >
      <ShoppingBag className="size-5" strokeWidth={1.8} />
      {count > 0 && (
        <span
          className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold leading-5"
          style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
