import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * Batimento da tela de pedidos.
 *
 * Responde pouco de propósito: quantos pedidos ativos existem e qual é o mais
 * recente. Serve para duas coisas ao mesmo tempo — saber se ainda há conexão
 * (a resposta chegou?) e saber se entrou pedido novo, sem recarregar a página
 * inteira a cada poucos segundos.
 */

const ATIVOS = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"];

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const rows = await sql`
    select
      count(*)::int as ativos,
      max(created_at) as mais_recente
    from orders
    where tenant_id = ${session.tenant.id} and status::text = any(${ATIVOS})
  `;

  return Response.json(
    {
      ativos: (rows[0]?.ativos as number) ?? 0,
      maisRecente: rows[0]?.mais_recente
        ? new Date(rows[0].mais_recente as string).toISOString()
        : null,
      agora: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
