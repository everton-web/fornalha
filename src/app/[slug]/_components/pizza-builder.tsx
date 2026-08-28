"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

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

  /*
   * Dialog do Radix no lugar do modal à mão.
   *
   * O que era feito aqui: uma <div> por cima da página, um <button> gigante
   * de fundo para fechar no clique fora, e um useEffect que ouvia Escape e
   * travava a rolagem do body. Funcionava, e faltava o resto — o foco não
   * ficava preso dentro do modal, então tabular saía por baixo dele e mexia
   * na página atrás; o leitor de tela não anunciava que uma janela abriu; e
   * ao fechar o foco não voltava para o sabor que a pessoa clicou.
   *
   * Nada disso aparece num screenshot, e é por isso que passou tanto tempo.
   */
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] w-full max-w-lg translate-y-0 flex-col gap-0 rounded-t-3xl border-0 bg-surface p-0 shadow-2xl top-auto bottom-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-3xl"
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <DialogTitle className="flex-1 text-lg font-bold">
            Montar pizza
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Group title="Tamanho">
            <div className="grid grid-cols-3 gap-2">
              {menu.sizes.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  variant="ghost"
                  onClick={() => changeSize(s.id)}
                  className="h-auto flex-col rounded-2xl border p-3 text-center font-normal whitespace-normal hover:bg-transparent"
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
                </Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={unavailable}
                      onClick={() => toggleFlavor(f.id)}
                      className="h-auto w-full justify-start gap-3 rounded-xl border p-3 text-left font-normal whitespace-normal hover:bg-transparent disabled:opacity-40"
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
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Group>

          {menu.crusts.length > 0 && (
            <Group title="Borda">
              <div className="grid grid-cols-2 gap-2">
                {menu.crusts.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setCrustId(c.id)}
                    className="h-auto justify-start rounded-xl border px-3 py-2.5 text-left text-sm font-normal whitespace-normal hover:bg-transparent"
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
                  </Button>
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
                    <Button
                      key={a.id}
                      type="button"
                      variant="ghost"
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
                    </Button>
                  );
                })}
              </div>
            </Group>
          )}

          <Group title="Observações">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Ex: sem cebola, bem assada, cortar em 8 pedaços"
              className="resize-none"
              aria-label="Observações da pizza"
            />
          </Group>
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-5 py-4">
          <div className="flex items-center gap-1 rounded-full border border-line p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="size-8 rounded-full"
              aria-label="Diminuir"
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="size-8 rounded-full"
              aria-label="Aumentar"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            size="pill"
            onClick={submit}
            disabled={chosen.length === 0}
            className="flex-1 disabled:cursor-not-allowed"
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
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
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
