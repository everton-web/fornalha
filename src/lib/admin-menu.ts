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
  is_sweet: boolean;
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
};

export type AdminMenu = {
  categories: AdminCategory[];
  sizes: AdminSize[];
  flavors: AdminFlavor[];
  crusts: AdminSimple[];
  addons: AdminSimple[];
  products: AdminProduct[];
};

/** Igual ao cardápio público, mas inclui o que está desativado — o painel vê tudo. */
export async function getAdminMenu(tenantId: string): Promise<AdminMenu> {
  const [categories, sizes, flavors, prices, crusts, addons, products] =
    await Promise.all([
      sql`
        select id, name, is_active from categories
        where tenant_id = ${tenantId} order by sort_order, name
      `,
      sql`
        select id, name, slices, max_flavors, is_active from sizes
        where tenant_id = ${tenantId} order by sort_order, name
      `,
      sql`
        select id, name, description, category_id, is_sweet, is_active
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
        select id, name, description, price, category_id, is_active
        from products
        where tenant_id = ${tenantId} and kind = 'simple'
        order by sort_order, name
      `,
    ]);

  const priceMap = new Map<string, Record<string, number>>();
  for (const row of prices) {
    const entry = priceMap.get(row.flavor_id) ?? {};
    entry[row.size_id] = num(row.price);
    priceMap.set(row.flavor_id, entry);
  }

  return {
    categories: categories as unknown as AdminCategory[],
    sizes: sizes.map((s) => ({
      ...(s as unknown as AdminSize),
      max_flavors: Number(s.max_flavors),
    })),
    flavors: flavors.map((f) => ({
      ...(f as unknown as Omit<AdminFlavor, "prices">),
      prices: priceMap.get(f.id) ?? {},
    })),
    crusts: crusts.map((c) => ({ ...(c as unknown as AdminSimple), price: num(c.price) })),
    addons: addons.map((a) => ({ ...(a as unknown as AdminSimple), price: num(a.price) })),
    products: products.map((p) => ({
      ...(p as unknown as AdminProduct),
      price: num(p.price),
    })),
  };
}
