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

  // Pedido online ainda não pago fica de fora da contagem: ele já existe no
  // banco, mas não é trabalho para a cozinha. Contá-lo faria o alerta de
  // "pedido novo" tocar no momento em que o cliente ainda está olhando o QR.
  const rows = await sql`
    select
      count(*)::int as ativos,
      max(created_at) as mais_recente
    from orders
    where tenant_id = ${session.tenant.id}
      and status::text = any(${ATIVOS})
      and not (
        payment_method in ('pix_online', 'card_online')
        and payment_status = 'pending'
      )
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
