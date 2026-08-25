import "server-only";

import { cache } from "react";

import { num, sql } from "@/lib/db";
import type { Menu, Tenant } from "@/lib/types";

function normalizeTenant(row: Record<string, unknown>): Tenant {
  return {
    ...(row as unknown as Tenant),
    delivery_fee: num(row.delivery_fee),
    min_order_value: num(row.min_order_value),
    prep_time_min: Number(row.prep_time_min),
    opening_hours: (row.opening_hours ?? []) as Tenant["opening_hours"],
  };
}

/** Carrega a pizzaria pelo slug. Retorna null se não existe ou está inativa. */
export const getTenantBySlug = cache(async function getTenantBySlug(
  slug: string,
): Promise<Tenant | null> {
  const rows = await sql`
    select * from tenants where slug = ${slug} and is_active = true limit 1
  `;
  return rows[0] ? normalizeTenant(rows[0]) : null;
});

export const getTenantById = cache(async function getTenantById(
  id: string,
): Promise<Tenant | null> {
  const rows = await sql`select * from tenants where id = ${id} limit 1`;
  return rows[0] ? normalizeTenant(rows[0]) : null;
});

/**
 * Cardápio completo de uma pizzaria.
 * Seis consultas em paralelo — o cardápio inteiro cabe folgado na memória e
 * evita seis idas e voltas em série ao banco.
 */
export const getMenu = cache(async function getMenu(
  slug: string,
): Promise<Menu | null> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return null;

  const t = tenant.id;

  const [categories, sizes, flavors, prices, crusts, addons, products] =
    await Promise.all([
      sql`
        select id, name, sort_order from categories
        where tenant_id = ${t} and is_active = true
        order by sort_order, name
      `,
      sql`
        select id, name, slices, max_flavors, sort_order from sizes
        where tenant_id = ${t} and is_active = true
        order by sort_order, name
      `,
      sql`
        select id, category_id, name, description, image_url, is_sweet, sort_order
        from flavors
        where tenant_id = ${t} and is_active = true
        order by sort_order, name
      `,
      sql`
        select fp.flavor_id, fp.size_id, fp.price
        from flavor_prices fp
        join flavors f on f.id = fp.flavor_id
        where f.tenant_id = ${t}
      `,
      sql`
        select id, name, price from crusts
        where tenant_id = ${t} and is_active = true
        order by sort_order, name
      `,
      sql`
        select id, name, price from addons
        where tenant_id = ${t} and is_active = true
        order by sort_order, name
      `,
      sql`
        select id, category_id, kind, name, description, image_url, price, sort_order
        from products
        where tenant_id = ${t} and is_active = true and kind = 'simple'
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
    tenant,
    categories: categories as unknown as Menu["categories"],
    sizes: sizes.map((s) => ({
      ...(s as unknown as Menu["sizes"][number]),
      max_flavors: Number(s.max_flavors),
    })),
    flavors: flavors.map((f) => ({
      ...(f as unknown as Menu["flavors"][number]),
      prices: priceMap.get(f.id) ?? {},
    })),
    crusts: crusts.map((c) => ({ id: c.id, name: c.name, price: num(c.price) })),
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: num(a.price) })),
    products: products.map((p) => ({
      ...(p as unknown as Menu["products"][number]),
      price: num(p.price),
    })),
  };
});
