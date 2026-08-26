import "server-only";

import { decryptJson, encryptJson } from "@/lib/crypto";
import { sql } from "@/lib/db";
import { getProvider } from "@/lib/payments/registry";
import type { Credentials, PaymentKind } from "@/lib/payments/types";

/**
 * Onde cada pizzaria recebe.
 *
 * A credencial nunca sai daqui em texto puro para camada de tela: o painel
 * recebe `PaymentAccount` (sem segredo, com uma dica de quatro letras para a
 * pessoa reconhecer qual token está ligado), e só o caminho que vai chamar o
 * gateway pede `withCredentials`.
 */

export type PaymentAccount = {
  provider: string;
  label: string;
  acceptsPix: boolean;
  acceptsCard: boolean;
  isActive: boolean;
  sortOrder: number;
  hint: string | null;
  updatedAt: Date;
};

export type PaymentAccountWithCredentials = PaymentAccount & {
  credentials: Credentials;
};

type Row = {
  provider: string;
  credentials: Uint8Array;
  accepts_pix: boolean;
  accepts_card: boolean;
  is_active: boolean;
  sort_order: number;
  hint: string | null;
  updated_at: string;
};

function toAccount(row: Row): PaymentAccount {
  return {
    provider: row.provider,
    label: getProvider(row.provider)?.label ?? row.provider,
    acceptsPix: row.accepts_pix,
    acceptsCard: row.accepts_card,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    hint: row.hint,
    updatedAt: new Date(row.updated_at),
  };
}

export async function listAccounts(tenantId: string): Promise<PaymentAccount[]> {
  const rows = (await sql`
    select provider, credentials, accepts_pix, accepts_card, is_active,
           sort_order, hint, updated_at
    from tenant_payment_accounts
    where tenant_id = ${tenantId}
    order by sort_order, provider
  `) as unknown as Row[];

  return rows.map(toAccount);
}

/**
 * O gateway que vai processar esta cobrança.
 *
 * Com mais de um ligado, ganha o de menor `sort_order` que aceite a forma
 * escolhida — é assim que a pizzaria diz qual prefere, sem o cliente precisar
 * escolher marca de gateway na hora de pagar (para ele, Pix é Pix).
 */
export async function accountForKind(
  tenantId: string,
  kind: PaymentKind,
): Promise<PaymentAccountWithCredentials | null> {
  const querPix = kind === "pix";

  const rows = (await sql`
    select provider, credentials, accepts_pix, accepts_card, is_active,
           sort_order, hint, updated_at
    from tenant_payment_accounts
    where tenant_id = ${tenantId}
      and is_active
      and (case when ${querPix} then accepts_pix else accepts_card end)
    order by sort_order, provider
    limit 1
  `) as unknown as Row[];

  const row = rows[0];
  if (!row) return null;
  // Um gateway ligado no banco cujo adaptador não existe mais no código não
  // pode derrubar o checkout: some da escolha como se estivesse desligado.
  if (!getProvider(row.provider)) return null;

  return {
    ...toAccount(row),
    credentials: decryptJson<Credentials>(row.credentials),
  };
}

export async function accountByProvider(
  tenantId: string,
  provider: string,
): Promise<PaymentAccountWithCredentials | null> {
  const rows = (await sql`
    select provider, credentials, accepts_pix, accepts_card, is_active,
           sort_order, hint, updated_at
    from tenant_payment_accounts
    where tenant_id = ${tenantId} and provider = ${provider}
    limit 1
  `) as unknown as Row[];

  const row = rows[0];
  if (!row) return null;

  return {
    ...toAccount(row),
    credentials: decryptJson<Credentials>(row.credentials),
  };
}

/** Quais formas online a pizzaria consegue oferecer agora, de fato. */
export async function availableKinds(tenantId: string): Promise<PaymentKind[]> {
  const contas = await listAccounts(tenantId);
  const ativas = contas.filter((c) => c.isActive && getProvider(c.provider));

  const kinds: PaymentKind[] = [];
  if (ativas.some((c) => c.acceptsPix)) kinds.push("pix");
  if (ativas.some((c) => c.acceptsCard)) kinds.push("card");
  return kinds;
}

export async function saveAccount(
  tenantId: string,
  provider: string,
  credentials: Credentials,
  options: { acceptsPix: boolean; acceptsCard: boolean; sortOrder?: number },
): Promise<void> {
  const blob = encryptJson(credentials);

  // A dica é sempre do campo secreto principal, para a tela conseguir dizer
  // "termina em ...8f2c" sem decifrar nada depois.
  const principal =
    getProvider(provider)?.credentialFields.find((f) => f.secret)?.name ?? "";
  const valor = credentials[principal] ?? "";
  const hint = valor ? valor.slice(-4) : null;

  await sql`
    insert into tenant_payment_accounts
      (tenant_id, provider, credentials, accepts_pix, accepts_card, sort_order, hint)
    values
      (${tenantId}, ${provider}, ${blob}, ${options.acceptsPix},
       ${options.acceptsCard}, ${options.sortOrder ?? 0}, ${hint})
    on conflict (tenant_id, provider) do update set
      credentials  = excluded.credentials,
      accepts_pix  = excluded.accepts_pix,
      accepts_card = excluded.accepts_card,
      sort_order   = excluded.sort_order,
      hint         = excluded.hint,
      is_active    = true,
      updated_at   = now()
  `;
}

export async function setAccountActive(
  tenantId: string,
  provider: string,
  isActive: boolean,
): Promise<void> {
  await sql`
    update tenant_payment_accounts
    set is_active = ${isActive}, updated_at = now()
    where tenant_id = ${tenantId} and provider = ${provider}
  `;
}

export async function removeAccount(
  tenantId: string,
  provider: string,
): Promise<void> {
  await sql`
    delete from tenant_payment_accounts
    where tenant_id = ${tenantId} and provider = ${provider}
  `;
}
