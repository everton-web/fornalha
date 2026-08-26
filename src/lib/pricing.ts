import type {
  CartItem,
  DeliveryType,
  JsonObject,
  Menu,
  OrderSummary,
  PricedItem,
} from "@/lib/types";

/**
 * Preço de uma pizza com N sabores.
 *
 * Duas escolas no Brasil: cobrar o sabor mais caro ("max") ou a média
 * proporcional ("avg"). A pizzaria escolhe em `tenant.half_pricing` —
 * mudar essa configuração muda o preço de toda meio a meio do cardápio.
 */
export function pizzaBasePrice(
  flavorPrices: number[],
  rule: "max" | "avg",
): number {
  if (flavorPrices.length === 0) return 0;
  if (rule === "max") return Math.max(...flavorPrices);
  const sum = flavorPrices.reduce((acc, p) => acc + p, 0);
  return round2(sum / flavorPrices.length);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export class PricingError extends Error {}

/**
 * Transforma o carrinho (só IDs) em itens precificados.
 *
 * O navegador nunca manda preço: tudo é recalculado aqui a partir do
 * cardápio atual. Se um sabor saiu do ar entre montar e finalizar,
 * o pedido falha em vez de gravar um valor inventado.
 */
export function priceCart(menu: Menu, items: CartItem[]): PricedItem[] {
  const sizeById = new Map(menu.sizes.map((s) => [s.id, s]));
  const flavorById = new Map(menu.flavors.map((f) => [f.id, f]));
  const crustById = new Map(menu.crusts.map((c) => [c.id, c]));
  const addonById = new Map(menu.addons.map((a) => [a.id, a]));
  const productById = new Map(menu.products.map((p) => [p.id, p]));

  return items.map((item): PricedItem => {
    const quantity = Math.max(1, Math.trunc(item.quantity));

    if (item.kind === "simple") {
      const product = productById.get(item.productId);
      if (!product) {
        throw new PricingError("Um item do seu carrinho saiu do cardápio.");
      }
      return {
        uid: item.uid,
        kind: "simple",
        title: product.name,
        subtitle: product.description ?? "",
        details: { product_id: product.id } satisfies JsonObject,
        quantity,
        unitPrice: product.price,
        totalPrice: round2(product.price * quantity),
        notes: item.notes,
      } satisfies PricedItem;
    }

    const size = sizeById.get(item.sizeId);
    if (!size) throw new PricingError("O tamanho escolhido não está disponível.");

    if (item.flavorIds.length === 0) {
      throw new PricingError("Escolha pelo menos um sabor.");
    }
    if (item.flavorIds.length > size.max_flavors) {
      throw new PricingError(
        `A pizza ${size.name} aceita no máximo ${size.max_flavors} sabor(es).`,
      );
    }

    const flavors = item.flavorIds.map((id) => {
      const flavor = flavorById.get(id);
      if (!flavor) throw new PricingError("Um sabor escolhido saiu do cardápio.");
      const price = flavor.prices[size.id];
      if (price == null) {
        throw new PricingError(
          `${flavor.name} não está disponível no tamanho ${size.name}.`,
        );
      }
      return { flavor, price };
    });

    const crust = item.crustId ? crustById.get(item.crustId) : null;
    if (item.crustId && !crust) {
      throw new PricingError("A borda escolhida não está disponível.");
    }

    const addons = item.addonIds.map((id) => {
      const addon = addonById.get(id);
      if (!addon) throw new PricingError("Um adicional saiu do cardápio.");
      return addon;
    });

    const base = pizzaBasePrice(
      flavors.map((f) => f.price),
      menu.tenant.half_pricing,
    );
    const extras =
      (crust?.price ?? 0) + addons.reduce((acc, a) => acc + a.price, 0);
    const unitPrice = round2(base + extras);

    const flavorNames = flavors.map((f) => f.flavor.name);
    const subtitleParts = [
      flavorNames.length > 1 ? `${flavorNames.length} sabores` : "1 sabor",
      crust && crust.price > 0 ? `borda ${crust.name}` : null,
      ...addons.map((a) => a.name),
    ].filter(Boolean);

    return {
      uid: item.uid,
      kind: "pizza",
      title: `Pizza ${size.name} — ${flavorNames.join(" / ")}`,
      subtitle: subtitleParts.join(" · "),
      details: {
        size_id: size.id,
        size_name: size.name,
        flavors: flavors.map((f) => ({ id: f.flavor.id, name: f.flavor.name })),
        crust: crust ? { id: crust.id, name: crust.name, price: crust.price } : null,
        addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      } satisfies JsonObject,
      quantity,
      unitPrice,
      totalPrice: round2(unitPrice * quantity),
      notes: item.notes,
    } satisfies PricedItem;
  });
}

/**
 * Fecha a conta.
 *
 * `feeOverride` entra quando a taxa depende do endereço — o servidor resolve
 * o bairro antes de chamar aqui. Sem ele, vale a taxa única da pizzaria.
 */
export function summarize(
  menu: Menu,
  items: CartItem[],
  deliveryType: DeliveryType,
  feeOverride?: number,
): OrderSummary {
  const priced = priceCart(menu, items);
  const subtotal = round2(priced.reduce((acc, i) => acc + i.totalPrice, 0));
  const deliveryFee =
    deliveryType === "delivery"
      ? Number(feeOverride ?? menu.tenant.delivery_fee)
      : 0;

  return {
    items: priced,
    subtotal,
    deliveryFee,
    total: round2(subtotal + deliveryFee),
  };
}
