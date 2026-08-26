import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { asJson, num, opcional, sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { Tenant } from "@/lib/types";

const COOKIE = "fornalha_session";
const MAX_AGE_DAYS = 30;

export type Session = {
  userId: string;
  email: string;
  tenant: Tenant;
  role: "owner" | "staff";
  /**
   * Conta de demonstração: vê tudo, não muda nada. Quem lê isto para decidir
   * o que mostrar na tela está fazendo cortesia; quem impede a escrita é o
   * `requireEscrita()`, no servidor.
   */
  isDemo: boolean;
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
      t.phone, t.whatsapp, t.address, t.zip, t.refuse_outside_zones,
      t.is_active, t.is_open_override,
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

  /*
   * Consulta à parte, e tolerante: um deploy leva o código antes de alguém
   * apertar "Atualizar o banco", e nesse intervalo a coluna ainda não existe.
   * Lida junto na consulta acima, a ausência dela derrubaria o painel inteiro
   * — justamente para o dono que precisa entrar e apertar o botão. Sem a
   * coluna, ninguém é demo, que é a resposta certa: a conta nem existe ainda.
   */
  const isDemo = await opcional(async () => {
    const [r] = await sql`select is_demo from users where id = ${row.user_id}`;
    return Boolean(r?.is_demo);
  }, false);

  return {
    userId: row.user_id as string,
    email: row.email as string,
    role: row.role as "owner" | "staff",
    isDemo,
    tenant: normalizeTenant(row),
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Lançado quando a conta de demonstração tenta escrever. */
export class DemoSomenteLeitura extends Error {
  constructor() {
    super("Modo demonstração: nada aqui é salvo de verdade.");
    this.name = "DemoSomenteLeitura";
  }
}

/**
 * A sessão de quem pode mudar as coisas.
 *
 * Toda Server Action que escreve chama isto no lugar de `requireSession()` —
 * e `scripts/testa-demo.mjs` confere que nenhuma escapou, porque esquecer uma
 * só é o bastante para um visitante apagar o cardápio da demonstração.
 *
 * A trava mora aqui, no servidor, e não em botão desabilitado na tela: Server
 * Action é endpoint POST aberto, e esconder o botão não fecha a porta.
 */
export async function requireEscrita(): Promise<Session> {
  const session = await requireSession();
  if (session.isDemo) throw new DemoSomenteLeitura();
  return session;
}

/**
 * Quem está logado, sem exigir vínculo com pizzaria.
 *
 * `getSession` faz join com tenant_members porque o painel da pizzaria não
 * existe sem uma pizzaria. Quem administra a plataforma pode não ser dono de
 * loja nenhuma — e nesse caso aquele join devolveria null, deixando a pessoa
 * "logada" e sem sessão ao mesmo tempo.
 */
export type Account = {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
};

export const getAccount = cache(async function getAccount(): Promise<Account | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const rows = await opcional(
    async () =>
      await sql`
        select u.id, u.email, u.is_platform_admin
        from sessions s
        join users u on u.id = s.user_id
        where s.token_hash = ${hashToken(token)} and s.expires_at > now()
        limit 1
      `,
    // Banco ainda sem a 0010: ninguém é da agência, e o painel da pizzaria
    // segue funcionando normalmente.
    null,
  );

  const row = rows?.[0];
  if (!row) return null;

  return {
    userId: row.id as string,
    email: row.email as string,
    isPlatformAdmin: Boolean(row.is_platform_admin),
  };
});

export async function requirePlatformAdmin(): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect("/admin/login");
  // Quem está logado mas não é da agência não descobre que esta área existe.
  if (!account.isPlatformAdmin) notFound();
  return account;
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
