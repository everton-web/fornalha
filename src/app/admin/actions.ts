"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createSession,
  destroySession,
  requireSession,
  verifyCredentials,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { checkRate, clientIp, minutosEmTexto } from "@/lib/rate-limit";
import { nextStatuses } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

/** Login do painel. Mensagem genérica de propósito: não revela se o e-mail existe. */
export async function signIn(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Dois freios: por aparelho, contra quem varre senhas; por e-mail, contra
  // quem ataca uma conta específica de vários lugares.
  const ip = await clientIp();
  const alvo = parsed.data.email.toLowerCase();

  for (const chave of [`login:ip:${ip}`, `login:conta:${alvo}`]) {
    const freio = await checkRate(chave, 10, 900);
    if (!freio.ok) {
      return {
        error: `Muitas tentativas. Tente de novo em ${minutosEmTexto(freio.retryAfterSeconds)}.`,
      };
    }
  }

  const userId = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!userId) return { error: "E-mail ou senha incorretos." };

  await createSession(userId);
  redirect("/admin");
}

export async function signOut() {
  await destroySession();
  redirect("/admin/login");
}

const statusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  reason: z.string().trim().max(200).optional(),
});

/**
 * Avança (ou cancela) um pedido.
 *
 * Só aceita transições que fazem sentido a partir do status atual: sem isso,
 * um clique duplo no tablet da cozinha poderia pular etapas.
 */
export async function setOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  reason?: string;
}): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const rows = await sql`
    select id, status, delivery_type from orders
    where id = ${parsed.data.orderId} and tenant_id = ${session.tenant.id}
    limit 1
  `;
  const order = rows[0];
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  const allowed = nextStatuses(
    order.status as OrderStatus,
    order.delivery_type as "delivery" | "pickup",
  );
  if (!allowed.includes(parsed.data.status)) {
    return { ok: false, error: "Essa mudança de status não é permitida agora." };
  }

  const cancelReason =
    parsed.data.status === "cancelled" ? (parsed.data.reason ?? null) : null;

  if (parsed.data.status === "delivered") {
    // Pedido entregue e pago na entrega: quita o pagamento junto.
    await sql`
      update orders
      set status = 'delivered', cancel_reason = null, payment_status = 'paid'
      where id = ${order.id}
    `;
  } else {
    await sql`
      update orders
      set status = ${parsed.data.status}, cancel_reason = ${cancelReason}
      where id = ${order.id}
    `;
  }

  revalidatePath("/admin/pedidos");
  return { ok: true };
}

/** Abre ou fecha a loja manualmente; null devolve o controle ao horário. */
export async function setOpenOverride(value: boolean | null): Promise<ActionResult> {
  const session = await requireSession();

  await sql`
    update tenants set is_open_override = ${value} where id = ${session.tenant.id}
  `;

  revalidatePath("/admin", "layout");
  revalidatePath(`/${session.tenant.slug}`, "layout");
  return { ok: true };
}
