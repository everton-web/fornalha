import "server-only";

import { cache } from "react";

import { asJson, num, sql, TENANT_COLUMNS } from "@/lib/db";
import type { Menu, Tenant } from "@/lib/types";

function normalizeTenant(row: Record<string, unknown>): Tenant {
  return {
    ...(row as unknown as Tenant),
    delivery_fee: num(row.delivery_fee),
    min_order_value: num(row.min_order_value),
    prep_time_min: Number(row.prep_time_min),
    has_logo: Boolean(row.has_logo),
    opening_hours: asJson<Tenant["opening_hours"]>(row.opening_hours, []),
  };
}

/** Carrega a pizzaria pelo slug. Retorna null se não existe ou está inativa. */
export const getTenantBySlug = cache(async function getTenantBySlug(
  slug: string,
): Promise<Tenant | null> {
  const rows = await sql`
    select ${sql.unsafe(TENANT_COLUMNS)} from tenants
    where slug = ${slug} and is_active = true
    limit 1
  `;
  return rows[0] ? normalizeTenant(rows[0]) : null;
});

export const getTenantById = cache(async function getTenantById(
  id: string,
): Promise<Tenant | null> {
  const rows = await sql`
    select ${sql.unsafe(TENANT_COLUMNS)} from tenants where id = ${id} limit 1
  `;
  return rows[0] ? normalizeTenant(rows[0]) : null;
});

/**
 * Cardápio completo de uma pizzaria.
 * Oito consultas em paralelo — o cardápio inteiro cabe folgado na memória e
 * evita oito idas e voltas em série ao banco.
 *
 * As fotos ficam de fora de propósito: `has_image` diz apenas que existe uma,
 * e os bytes saem por `/api/foto/...`. Carregar as imagens junto faria o
 * cardápio inteiro viajar com alguns megabytes a cada visita.
 */
export const getMenu = cache(async function getMenu(
  slug: string,
): Promise<Menu | null> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return null;

  const t = tenant.id;

  const [
    categories,
    sizes,
    flavors,
    prices,
    groupPrices,
    crusts,
    addons,
    products,
  ] = await Promise.all([
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
        select id, category_id, price_group_id, name, description, image_url,
               is_sweet, sort_order, (image_data is not null) as has_image
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
        select gp.group_id, gp.size_id, gp.price
        from price_group_prices gp
        join price_groups g on g.id = gp.group_id
        where g.tenant_id = ${t} and g.is_active = true
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
        select id, category_id, kind, name, description, image_url, price,
               sort_order, (image_data is not null) as has_image
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

  const groupMap = new Map<string, Record<string, number>>();
  for (const row of groupPrices) {
    const entry = groupMap.get(row.group_id) ?? {};
    entry[row.size_id] = num(row.price);
    groupMap.set(row.group_id, entry);
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
      has_image: Boolean(f.has_image),
      // O grupo dá a base e o preço próprio passa por cima, tamanho a tamanho.
      // É aqui — e só aqui — que a regra do grupo existe: `pricing.ts` continua
      // lendo `flavor.prices[size]` sem saber que grupo é coisa deste mundo.
      prices: {
        ...(f.price_group_id ? (groupMap.get(f.price_group_id) ?? {}) : {}),
        ...(priceMap.get(f.id) ?? {}),
      },
    })),
    crusts: crusts.map((c) => ({ id: c.id, name: c.name, price: num(c.price) })),
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: num(a.price) })),
    products: products.map((p) => ({
      ...(p as unknown as Menu["products"][number]),
      has_image: Boolean(p.has_image),
      price: num(p.price),
    })),
  };
});
