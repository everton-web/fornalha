"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  removeAccount,
  saveAccount,
  setAccountActive,
} from "@/lib/payments/accounts";
import { getProvider } from "@/lib/payments/registry";

export type ActionResult = { ok: true } | { ok: false; error: string };

const conectarSchema = z.object({
  provider: z.string().min(2).max(40),
  credentials: z.record(z.string(), z.string().trim().max(500)),
  acceptsPix: z.boolean(),
  acceptsCard: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(99).optional(),
});

export type ConectarInput = z.input<typeof conectarSchema>;

/**
 * Liga um gateway à pizzaria.
 *
 * Só o dono mexe aqui: é a conta que recebe o dinheiro da loja, não uma
 * preferência de tela.
 */
export async function conectarGateway(
  input: ConectarInput,
): Promise<ActionResult> {
  const session = await requireSession();
  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode ligar um gateway." };
  }

  const parsed = conectarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const dados = parsed.data;

  const provider = getProvider(dados.provider);
  if (!provider) return { ok: false, error: "Gateway desconhecido." };

  if (!dados.acceptsPix && !dados.acceptsCard) {
    return { ok: false, error: "Escolha ao menos uma forma: Pix ou cartão." };
  }
  if (dados.acceptsPix && !provider.supports.includes("pix")) {
    return { ok: false, error: `${provider.label} não faz Pix.` };
  }
  if (dados.acceptsCard && !provider.supports.includes("card")) {
    return { ok: false, error: `${provider.label} não faz cartão.` };
  }

  // Campo obrigatório vazio é erro com nome: "preencha as credenciais" não
  // ajuda quem tem dois tokens parecidos na tela.
  for (const campo of provider.credentialFields) {
    if (campo.optional) continue;
    if (!dados.credentials[campo.name]?.trim()) {
      return { ok: false, error: `Preencha: ${campo.label}.` };
    }
  }

  // Só os campos que o gateway declarou entram no banco. Qualquer coisa a mais
  // que venha na requisição é descartada aqui.
  const limpas: Record<string, string> = {};
  for (const campo of provider.credentialFields) {
    const valor = dados.credentials[campo.name]?.trim();
    if (valor) limpas[campo.name] = valor;
  }

  try {
    await saveAccount(session.tenant.id, dados.provider, limpas, {
      acceptsPix: dados.acceptsPix,
      acceptsCard: dados.acceptsCard,
      sortOrder: dados.sortOrder ?? 0,
    });
  } catch (error) {
    // A falta da chave de cifra é erro de instalação, não do usuário — e a
    // mensagem precisa dizer isso, senão o dono fica tentando outro token.
    const detalhe = error instanceof Error ? error.message : "";
    if (detalhe.includes("PAYMENTS_ENCRYPTION_KEY")) {
      return {
        ok: false,
        error:
          "O sistema está sem a chave de criptografia configurada. Avise quem cuida da instalação.",
      };
    }
    console.error("Falha ao salvar gateway", error);
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }

  // Ligar um gateway liga o pagamento online; sem isto o checkout continuaria
  // escondendo a forma que a pizzaria acabou de configurar.
  await sql`
    update tenants set online_payment_enabled = true, updated_at = now()
    where id = ${session.tenant.id}
  `;

  revalidatePath("/admin/pagamentos");
  return { ok: true };
}

export async function alternarGateway(
  provider: string,
  ativo: boolean,
): Promise<ActionResult> {
  const session = await requireSession();
  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode mudar isto." };
  }

  await setAccountActive(session.tenant.id, provider, ativo);
  revalidatePath("/admin/pagamentos");
  return { ok: true };
}

export async function desconectarGateway(
  provider: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode desconectar um gateway." };
  }

  await removeAccount(session.tenant.id, provider);

  // Sem nenhum gateway sobrando, o pagamento online se desliga junto: deixar a
  // chave ligada ofereceria ao cliente uma forma que ninguém processa.
  const [{ restantes }] = (await sql`
    select count(*)::int as restantes
    from tenant_payment_accounts
    where tenant_id = ${session.tenant.id} and is_active
  `) as unknown as { restantes: number }[];

  if (restantes === 0) {
    await sql`
      update tenants set online_payment_enabled = false, updated_at = now()
      where id = ${session.tenant.id}
    `;
  }

  revalidatePath("/admin/pagamentos");
  return { ok: true };
}
