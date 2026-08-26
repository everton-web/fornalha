import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

import { sql } from "@/lib/db";

export type Purpose = "reset" | "invite";

const VALIDADE_MINUTOS: Record<Purpose, number> = {
  reset: 30,
  invite: 60 * 24 * 7,
};

export function minutesFor(purpose: Purpose): number {
  return VALIDADE_MINUTOS[purpose];
}

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Endereço público do sistema, para montar o link do e-mail.
 *
 * Sai do host da própria requisição: assim o link continua certo em produção,
 * em preview e no computador de quem estiver desenvolvendo, sem configurar nada.
 */
export async function baseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Cria um link de uso único. Os anteriores do mesmo tipo são descartados —
 * pedir um segundo link invalida o primeiro, que é o que a pessoa espera.
 */
export async function createAuthToken(
  userId: string,
  purpose: Purpose,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const minutos = VALIDADE_MINUTOS[purpose];

  await sql`
    delete from auth_tokens where user_id = ${userId} and purpose = ${purpose}
  `;
  await sql`
    insert into auth_tokens (token_hash, user_id, purpose, expires_at)
    values (${hash(token)}, ${userId}, ${purpose}, now() + ${`${minutos} minutes`}::interval)
  `;
  await sql`delete from auth_tokens where expires_at < now()`;

  return token;
}

export type TokenCheck =
  | { valid: true; userId: string; email: string }
  | { valid: false; reason: "invalid" | "expired" | "used" };

export async function checkAuthToken(
  token: string,
  purpose: Purpose,
): Promise<TokenCheck> {
  const rows = await sql`
    select t.user_id, t.expires_at, t.used_at, u.email
    from auth_tokens t
    join users u on u.id = t.user_id
    where t.token_hash = ${hash(token)} and t.purpose = ${purpose}
    limit 1
  `;

  const row = rows[0];
  if (!row) return { valid: false, reason: "invalid" };
  if (row.used_at) return { valid: false, reason: "used" };
  if (new Date(row.expires_at) < new Date()) return { valid: false, reason: "expired" };

  return { valid: true, userId: row.user_id as string, email: row.email as string };
}

export async function consumeAuthToken(token: string): Promise<void> {
  await sql`
    update auth_tokens set used_at = now() where token_hash = ${hash(token)}
  `;
}
