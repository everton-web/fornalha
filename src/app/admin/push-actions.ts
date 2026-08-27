"use server";

import { z } from "zod";

import { requireEscrita } from "@/lib/auth";
import { sql } from "@/lib/db";
import { notifyTenant } from "@/lib/push";

export type ActionResult = { ok: true } | { ok: false; error: string };

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(5).max(500),
  userAgent: z.string().max(300).optional().default(""),
});

/** Registra este aparelho para receber aviso de pedido novo. */
export async function subscribeToPush(
  input: z.input<typeof subscriptionSchema>,
): Promise<ActionResult> {
  const guarda = await requireEscrita();
  if (!guarda.ok) return guarda;
  const session = guarda.session;
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Assinatura inválida." };

  const { endpoint, p256dh, auth, userAgent } = parsed.data;

  try {
    // O mesmo aparelho reinstalando reaproveita a linha em vez de duplicar.
    await sql`
      insert into push_subscriptions (endpoint, tenant_id, user_id, p256dh, auth, user_agent)
      values (${endpoint}, ${session.tenant.id}, ${session.userId}, ${p256dh}, ${auth}, ${userAgent || null})
      on conflict (endpoint) do update set
        tenant_id = excluded.tenant_id,
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent
    `;
  } catch (erro) {
    console.error("Falha ao registrar aparelho para push", erro);
    return { ok: false, error: "Não foi possível ativar os avisos." };
  }

  return { ok: true };
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const guarda = await requireEscrita();
  if (!guarda.ok) return guarda;
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
  return { ok: true };
}

/** Manda um aviso de teste para os aparelhos desta pizzaria. */
export async function sendTestPush(): Promise<ActionResult> {
  const guarda = await requireEscrita();
  if (!guarda.ok) return guarda;
  const session = guarda.session;

  const { enviados } = await notifyTenant(session.tenant.id, {
    title: "Aviso de teste",
    body: "Se você está lendo isto, os avisos estão funcionando.",
    url: "/admin/pedidos",
    tag: "teste",
  });

  return enviados > 0
    ? { ok: true }
    : { ok: false, error: "Nenhum aparelho recebeu. Ative os avisos primeiro." };
}
