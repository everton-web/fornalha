import "server-only";

import { num, sql } from "@/lib/db";

export type AdminCategory = { id: string; name: string; is_active: boolean };
export type AdminSize = {
  id: string;
  name: string;
  slices: number | null;
  max_flavors: number;
  is_active: boolean;
};
export type AdminFlavor = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price_group_id: string | null;
  is_sweet: boolean;
  is_active: boolean;
  has_image: boolean;
  /**
   * Só os preços próprios do sabor — o do grupo **não** entra aqui.
   *
   * No painel os dois precisam aparecer separados: quem edita tem de ver que
   * está criando uma exceção à faixa, não corrigindo o preço dela. Misturar os
   * dois aqui faria o editor gravar como exceção todo preço que ele mostra.
   */
  prices: Record<string, number>;
};

export type AdminPriceGroup = {
  id: string;
  name: string;
  is_active: boolean;
  prices: Record<string, number>;
};
export type AdminSimple = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
};
export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_active: boolean;
  has_image: boolean;
};

export type AdminMenu = {
  categories: AdminCategory[];
  sizes: AdminSize[];
  priceGroups: AdminPriceGroup[];
  flavors: AdminFlavor[];
  crusts: AdminSimple[];
  addons: AdminSimple[];
  products: AdminProduct[];
};

/** Igual ao cardápio público, mas inclui o que está desativado — o painel vê tudo. */
export async function getAdminMenu(tenantId: string): Promise<AdminMenu> {
  const [
    categories,
    sizes,
    grupos,
    grupoPrecos,
    flavors,
    prices,
    crusts,
    addons,
    products,
  ] = await Promise.all([
    sql`
        select id, name, is_active from categories
        where tenant_id = ${tenantId} order by sort_order, name
      `,
    sql`
        select id, name, slices, max_flavors, is_active from sizes
        where tenant_id = ${tenantId} order by sort_order, name
      `,
    sql`
        select id, name, is_active from price_groups
        where tenant_id = ${tenantId} order by sort_order, name
      `,
    sql`
        select gp.group_id, gp.size_id, gp.price
        from price_group_prices gp
        join price_groups g on g.id = gp.group_id
        where g.tenant_id = ${tenantId}
      `,
    sql`
        select id, name, description, category_id, price_group_id, is_sweet,
               is_active, (image_data is not null) as has_image
        from flavors where tenant_id = ${tenantId} order by name
      `,
    sql`
        select fp.flavor_id, fp.size_id, fp.price
        from flavor_prices fp
        join flavors f on f.id = fp.flavor_id
        where f.tenant_id = ${tenantId}
      `,
    sql`
        select id, name, price, is_active from crusts
        where tenant_id = ${tenantId} order by sort_order, name
      `,
    sql`
        select id, name, price, is_active from addons
        where tenant_id = ${tenantId} order by sort_order, name
      `,
    sql`
        select id, name, description, price, category_id, is_active,
               (image_data is not null) as has_image
        from products
        where tenant_id = ${tenantId} and kind = 'simple'
        order by sort_order, name
      `,
  ]);

  function agrupaPrecos(linhas: readonly Record<string, unknown>[], chave: string) {
    const mapa = new Map<string, Record<string, number>>();
    for (const linha of linhas) {
      const id = linha[chave] as string;
      const entry = mapa.get(id) ?? {};
      entry[linha.size_id as string] = num(linha.price);
      mapa.set(id, entry);
    }
    return mapa;
  }

  const priceMap = agrupaPrecos(prices, "flavor_id");
  const grupoMap = agrupaPrecos(grupoPrecos, "group_id");

  return {
    categories: categories as unknown as AdminCategory[],
    sizes: sizes.map((s) => ({
      ...(s as unknown as AdminSize),
      max_flavors: Number(s.max_flavors),
    })),
    priceGroups: grupos.map((g) => ({
      ...(g as unknown as Omit<AdminPriceGroup, "prices">),
      prices: grupoMap.get(g.id as string) ?? {},
    })),
    flavors: flavors.map((f) => ({
      ...(f as unknown as Omit<AdminFlavor, "prices">),
      has_image: Boolean(f.has_image),
      prices: priceMap.get(f.id) ?? {},
    })),
    crusts: crusts.map((c) => ({ ...(c as unknown as AdminSimple), price: num(c.price) })),
    addons: addons.map((a) => ({ ...(a as unknown as AdminSimple), price: num(a.price) })),
    products: products.map((p) => ({
      ...(p as unknown as AdminProduct),
      has_image: Boolean(p.has_image),
      price: num(p.price),
    })),
  };
}
