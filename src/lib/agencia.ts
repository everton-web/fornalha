import "server-only";

import { num, sql } from "@/lib/db";

/** Uma pizzaria na visão da agência: identidade, dono e movimento. */
export type PizzariaNaAgencia = {
  id: string;
  slug: string;
  dominio: string | null;
  nome: string;
  cor: string;
  ativa: boolean;
  criadaEm: string;
  donoEmail: string | null;
  sabores: number;
  pedidos: number;
  pedidos30d: number;
  faturamento30d: number;
  ultimoPedido: string | null;
};

/**
 * A carteira de pizzarias.
 *
 * Uma consulta só, com subqueries agregadas: a lista é curta (dezenas, não
 * milhares) e buscar o movimento de cada uma em separado seria N+1 numa tela
 * que a agência abre o dia inteiro.
 */
export async function listarPizzarias(): Promise<PizzariaNaAgencia[]> {
  const rows = await sql`
    select
      t.id, t.slug, t.custom_domain, t.name, t.primary_color, t.is_active, t.created_at,
      (
        select u.email from tenant_members m
        join users u on u.id = m.user_id
        where m.tenant_id = t.id and m.role = 'owner'
        order by u.created_at limit 1
      ) as dono_email,
      (select count(*) from flavors f
        where f.tenant_id = t.id and f.is_active)::int as sabores,
      (select count(*) from orders o where o.tenant_id = t.id)::int as pedidos,
      (select count(*) from orders o
        where o.tenant_id = t.id
          and o.created_at > now() - interval '30 days')::int as pedidos_30d,
      (select coalesce(sum(o.total), 0) from orders o
        where o.tenant_id = t.id
          and o.status <> 'cancelled'
          and o.created_at > now() - interval '30 days') as faturamento_30d,
      (select max(o.created_at) from orders o where o.tenant_id = t.id) as ultimo_pedido
    from tenants t
    order by t.is_active desc, t.name
  `;

  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    dominio: (r.custom_domain as string | null) ?? null,
    nome: r.name as string,
    cor: r.primary_color as string,
    ativa: Boolean(r.is_active),
    criadaEm: new Date(r.created_at as string).toISOString(),
    donoEmail: (r.dono_email as string | null) ?? null,
    sabores: Number(r.sabores),
    pedidos: Number(r.pedidos),
    pedidos30d: Number(r.pedidos_30d),
    faturamento30d: num(r.faturamento_30d),
    ultimoPedido: r.ultimo_pedido
      ? new Date(r.ultimo_pedido as string).toISOString()
      : null,
  }));
}
