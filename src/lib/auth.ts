import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { asJson, num, sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { Tenant } from "@/lib/types";

const COOKIE = "fornalha_session";
const MAX_AGE_DAYS = 30;

export type Session = {
  userId: string;
  email: string;
  tenant: Tenant;
  role: "owner" | "staff";
};

/** O banco guarda só o hash do token — o valor original vive no cookie. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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

/**
 * Quem está logado e de qual pizzaria.
 *
 * Toda página e Server Action do painel chama isso — Server Actions são
 * endpoints POST abertos, então proteger só a tela não bastaria.
 */
export const getSession = cache(async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  // Colunas listadas uma a uma: `t.*` traria logo_data, que é a imagem inteira.
  const rows = await sql`
    select
      u.id    as user_id,
      u.email as email,
      m.role  as role,
      t.id, t.slug, t.name, t.tagline, t.logo_url, t.cover_url, t.primary_color,
      t.phone, t.whatsapp, t.address, t.is_active, t.is_open_override,
      t.opening_hours, t.timezone, t.prep_time_min, t.delivery_enabled,
      t.pickup_enabled, t.delivery_fee, t.min_order_value, t.accepts_cash,
      t.accepts_card_delivery, t.accepts_pix_manual, t.pix_key,
      t.online_payment_enabled, t.payment_provider, t.half_pricing,
      (t.logo_data is not null) as has_logo
    from sessions s
    join users u on u.id = s.user_id
    join tenant_members m on m.user_id = u.id
    join tenants t on t.id = m.tenant_id
    where s.token_hash = ${hashToken(token)}
      and s.expires_at > now()
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    userId: row.user_id as string,
    email: row.email as string,
    role: row.role as "owner" | "staff",
    tenant: normalizeTenant(row),
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Confere e-mail e senha. Retorna o id do usuário, ou null se não bater. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<string | null> {
  const rows = await sql`
    select id, password_hash from users where email = ${email.trim().toLowerCase()}
  `;
  const user = rows[0];
  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash as string);
  return valid ? (user.id as string) : null;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 86_400_000);

  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, ${expiresAt})
  `;

  // Faxina barata: aproveita o login para limpar sessões vencidas.
  await sql`delete from sessions where expires_at < now()`;

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 86_400,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await sql`delete from sessions where token_hash = ${hashToken(token)}`;
  }
  store.delete(COOKIE);
}
