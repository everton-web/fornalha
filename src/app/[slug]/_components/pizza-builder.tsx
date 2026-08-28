"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";

import { money } from "@/lib/format";
import { pizzaBasePrice } from "@/lib/pricing";
import type { Flavor, Menu } from "@/lib/types";
import { fotoSrc } from "@/lib/utils";

import { useCart } from "./cart-provider";

/**
 * Montado sob demanda e descartado ao fechar: quem chama passa uma `key`
 * nova a cada abertura, então o estado inicial abaixo já é o estado limpo.
 */
export function PizzaBuilder({
  menu,
  initialFlavor,
  onClose,
}: {
  menu: Menu;
  initialFlavor: Flavor | null;
  onClose: () => void;
}) {
  const { add } = useCart();

  // Começa no tamanho do meio: é o que a maioria pede e evita ancorar no mais caro.
  const defaultSize = menu.sizes[Math.floor(menu.sizes.length / 2)]?.id ?? "";

  const [sizeId, setSizeId] = useState(defaultSize);
  const [flavorIds, setFlavorIds] = useState<string[]>(
    initialFlavor ? [initialFlavor.id] : [],
  );
  const [crustId, setCrustId] = useState<string | null>(
    menu.crusts[0]?.id ?? null,
  );
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const size = menu.sizes.find((s) => s.id === sizeId) ?? menu.sizes[0];
  const maxFlavors = size?.max_flavors ?? 1;

  const chosen = useMemo(
    () =>
      flavorIds
        .map((id) => menu.flavors.find((f) => f.id === id))
        .filter((f): f is Flavor => Boolean(f)),
    [flavorIds, menu.flavors],
  );

  const unitPrice = useMemo(() => {
    if (!size || chosen.length === 0) return 0;
    const base = pizzaBasePrice(
      chosen.map((f) => f.prices[size.id] ?? 0),
      menu.tenant.half_pricing,
    );
    const crust = menu.crusts.find((c) => c.id === crustId)?.price ?? 0;
    const addons = addonIds.reduce(
      (acc, id) => acc + (menu.addons.find((a) => a.id === id)?.price ?? 0),
      0,
    );
    return base + crust + addons;
  }, [size, chosen, crustId, addonIds, menu]);

  function toggleFlavor(id: string) {
    setFlavorIds((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      if (prev.length >= maxFlavors) {
        // Cheio: o novo sabor entra no lugar do primeiro escolhido.
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }

  // Trocar para um tamanho com menos divisões não pode deixar sabor sobrando.
  function changeSize(id: string) {
    const next = menu.sizes.find((s) => s.id === id);
    setSizeId(id);
    if (next) setFlavorIds((prev) => prev.slice(0, next.max_flavors));
  }

  function submit() {
    if (!size || chosen.length === 0) return;
    add({
      kind: "pizza",
      sizeId: size.id,
      flavorIds,
      crustId,
      addonIds,
      quantity,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
      />

      <div className="animate-sheet relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="flex-1 text-lg font-bold">Montar pizza</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full hover:bg-stone-100"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Group title="Tamanho">
            <div className="grid grid-cols-3 gap-2">
              {menu.sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => changeSize(s.id)}
                  className="rounded-2xl border p-3 text-center transition"
                  style={
                    s.id === sizeId
                      ? {
                          borderColor: "var(--brand)",
                          background: "color-mix(in srgb, var(--brand) 8%, white)",
                        }
                      : { borderColor: "var(--line)" }
                  }
                >
                  <span className="block text-sm font-semibold">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.slices ? `${s.slices} fatias · ` : ""}
                    até {s.max_flavors} sabor{s.max_flavors > 1 ? "es" : ""}
                  </span>
                </button>
              ))}
            </div>
          </Group>

          <Group
            title={`Sabores (${chosen.length}/${maxFlavors})`}
            hint={
              maxFlavors > 1
                ? menu.tenant.half_pricing === "max"
                  ? "Vale o preço do sabor mais caro"
                  : "Preço é a média dos sabores"
                : undefined
            }
          >
            <ul className="space-y-1.5">
              {menu.flavors.map((f) => {
                const price = size ? f.prices[size.id] : undefined;
                const unavailable = price == null;
                const selected = flavorIds.includes(f.id);

                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      disabled={unavailable}
                      onClick={() => toggleFlavor(f.id)}
                      className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-40"
                      style={
                        selected
                          ? {
                              borderColor: "var(--brand)",
                              background: "color-mix(in srgb, var(--brand) 6%, white)",
                            }
                          : { borderColor: "var(--line)" }
                      }
                    >
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-md border"
                        style={
                          selected
                            ? {
                                background: "var(--brand)",
                                borderColor: "var(--brand)",
                                color: "var(--brand-ink)",
                              }
                            : { borderColor: "var(--line)" }
                        }
                      >
                        {selected && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      {fotoSrc("sabor", f) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fotoSrc("sabor", f)!}
                          alt=""
                          loading="lazy"
                          className="size-12 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{f.name}</span>
                        {f.description && (
                          <span className="line-clamp-1 block text-xs text-muted-foreground">
                            {f.description}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {unavailable ? "—" : money(price)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Group>

          {menu.crusts.length > 0 && (
            <Group title="Borda">
              <div className="grid grid-cols-2 gap-2">
                {menu.crusts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCrustId(c.id)}
                    className="rounded-xl border px-3 py-2.5 text-left text-sm transition"
                    style={
                      c.id === crustId
                        ? {
                            borderColor: "var(--brand)",
                            background: "color-mix(in srgb, var(--brand) 6%, white)",
                          }
                        : { borderColor: "var(--line)" }
                    }
                  >
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.price > 0 ? `+ ${money(c.price)}` : "Grátis"}
                    </span>
                  </button>
                ))}
              </div>
            </Group>
          )}

          {menu.addons.length > 0 && (
            <Group title="Adicionais">
              <div className="flex flex-wrap gap-2">
                {menu.addons.map((a) => {
                  const selected = addonIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setAddonIds((prev) =>
                          selected
                            ? prev.filter((x) => x !== a.id)
                            : [...prev, a.id],
                        )
                      }
                      className="rounded-full border px-3.5 py-1.5 text-sm transition"
                      style={
                        selected
                          ? {
                              borderColor: "var(--brand)",
                              background: "var(--brand)",
                              color: "var(--brand-ink)",
                            }
                          : { borderColor: "var(--line)" }
                      }
                    >
                      {a.name} · + {money(a.price)}
                    </button>
                  );
                })}
              </div>
            </Group>
          )}

          <Group title="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Ex: sem cebola, bem assada, cortar em 8 pedaços"
              className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-stone-400"
            />
          </Group>
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-5 py-4">
          <div className="flex items-center gap-1 rounded-full border border-line p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="grid size-8 place-items-center rounded-full hover:bg-stone-100"
              aria-label="Diminuir"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="grid size-8 place-items-center rounded-full hover:bg-stone-100"
              aria-label="Aumentar"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={chosen.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
          >
            {chosen.length === 0 ? (
              "Escolha um sabor"
            ) : (
              <>
                Adicionar
                <span className="opacity-80">·</span>
                {money(unitPrice * quantity)}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          {title}
        </h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
