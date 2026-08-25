"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { money } from "@/lib/format";
import type { Flavor, Menu, Product } from "@/lib/types";

import { useCart } from "./cart-provider";
import { PizzaBuilder } from "./pizza-builder";

export function MenuBrowser({ menu }: { menu: Menu }) {
  const { add } = useCart();
  // A chave muda a cada abertura para remontar o montador já zerado.
  const [builder, setBuilder] = useState<{
    key: number;
    flavor: Flavor | null;
  } | null>(null);

  /** Cada categoria vira uma seção; sabores e produtos convivem na mesma lista. */
  const sections = useMemo(() => {
    const withoutCategory = {
      id: "outros",
      name: "Outros",
      flavors: menu.flavors.filter((f) => !f.category_id),
      products: menu.products.filter((p) => !p.category_id),
    };

    const list = menu.categories.map((c) => ({
      id: c.id,
      name: c.name,
      flavors: menu.flavors.filter((f) => f.category_id === c.id),
      products: menu.products.filter((p) => p.category_id === c.id),
    }));

    if (withoutCategory.flavors.length || withoutCategory.products.length) {
      list.push(withoutCategory);
    }
    return list.filter((s) => s.flavors.length + s.products.length > 0);
  }, [menu]);

  function openBuilder(flavor: Flavor | null) {
    setBuilder((prev) => ({ key: (prev?.key ?? 0) + 1, flavor }));
  }

  return (
    <>
      <nav className="no-scrollbar sticky top-[65px] z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#cat-${s.id}`}
            className="shrink-0 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium transition hover:border-stone-300"
          >
            {s.name}
          </a>
        ))}
      </nav>

      {menu.sizes.length > 0 && (
        <button
          type="button"
          onClick={() => openBuilder(null)}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-4 text-left transition hover:border-stone-300"
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
          >
            <Plus className="size-5" />
          </span>
          <span>
            <span className="block font-semibold">Montar pizza do zero</span>
            <span className="block text-sm text-muted">
              Escolha o tamanho, combine sabores e a borda
            </span>
          </span>
        </button>
      )}

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={`cat-${section.id}`} className="scroll-mt-32">
            <h2 className="mb-3 text-lg font-bold tracking-tight">
              {section.name}
            </h2>
            <ul className="space-y-2">
              {section.flavors.map((flavor) => (
                <li key={flavor.id}>
                  <FlavorCard
                    flavor={flavor}
                    menu={menu}
                    onClick={() => openBuilder(flavor)}
                  />
                </li>
              ))}
              {section.products.map((product) => (
                <li key={product.id}>
                  <ProductCard
                    product={product}
                    onAdd={() =>
                      add({ kind: "simple", productId: product.id, quantity: 1 })
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {builder && (
        <PizzaBuilder
          key={builder.key}
          menu={menu}
          initialFlavor={builder.flavor}
          onClose={() => setBuilder(null)}
        />
      )}
    </>
  );
}

function FlavorCard({
  flavor,
  menu,
  onClick,
}: {
  flavor: Flavor;
  menu: Menu;
  onClick: () => void;
}) {
  const prices = menu.sizes
    .map((s) => flavor.prices[s.id])
    .filter((p): p is number => p != null);
  const from = prices.length ? Math.min(...prices) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-stone-300 active:scale-[0.995]"
    >
      {flavor.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flavor.image_url}
          alt={flavor.name}
          className="size-20 shrink-0 rounded-xl object-cover"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{flavor.name}</span>
        {flavor.description && (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">
            {flavor.description}
          </span>
        )}
        {from != null && (
          <span className="mt-1 block text-sm">
            <span className="text-muted">a partir de </span>
            <span className="font-semibold">{money(from)}</span>
          </span>
        )}
      </span>
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full"
        style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
      >
        <Plus className="size-4" />
      </span>
    </button>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
      {product.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="size-20 shrink-0 rounded-xl object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            {product.description}
          </p>
        )}
        <p className="mt-1 text-sm font-semibold">{money(product.price)}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Adicionar ${product.name}`}
        className="grid size-8 shrink-0 place-items-center rounded-full transition active:scale-90"
        style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
