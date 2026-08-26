"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  criarPizzaria,
  ProvisioningError,
  redefinirSenhaDoDono,
} from "@/lib/provisioning";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { dados: T }))
  | { ok: false; error: string };

const novaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da pizzaria."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Informe o endereço.")
    .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen."),
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.").optional(),
  whatsapp: z.string().trim().max(30).optional(),
});

export async function cadastrarPizzaria(
  input: z.input<typeof novaSchema>,
): Promise<ActionResult<{ slug: string; email: string }>> {
  // Reconferido no servidor, sempre: Server Action é endpoint POST aberto.
  await requirePlatformAdmin();

  const parsed = novaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const r = await criarPizzaria(parsed.data);
    revalidatePath("/agencia");
    return { ok: true, dados: { slug: r.slug, email: r.email } };
  } catch (error) {
    if (error instanceof ProvisioningError) {
      return { ok: false, error: error.message };
    }
    console.error("Falha ao cadastrar pizzaria", error);
    return { ok: false, error: "Não foi possível cadastrar. Tente de novo." };
  }
}

/**
 * Liga e desliga uma pizzaria.
 *
 * É o controle de assinatura da agência: desligada, o cardápio sai do ar para
 * o cliente final e o dono não entra no painel. Nada é apagado — quem volta a
 * pagar volta com o cardápio intacto.
 */
export async function alternarPizzaria(
  tenantId: string,
  ativa: boolean,
): Promise<ActionResult> {
  await requirePlatformAdmin();
  if (!z.string().uuid().safeParse(tenantId).success) {
    return { ok: false, error: "Pizzaria inválida." };
  }

  await sql`
    update tenants set is_active = ${ativa}, updated_at = now()
    where id = ${tenantId}
  `;
  revalidatePath("/agencia");
  return { ok: true };
}

/**
 * Aponta um domínio próprio para a pizzaria.
 *
 * Guarda normalizado — minúsculas, sem "www", sem protocolo, sem barra — que
 * é a forma como o host chega na requisição. Aceitar "https://www.X.com.br/"
 * e comparar cru faria o domínio nunca bater, e o erro apareceria só quando o
 * cliente abrisse o site.
 */
export async function definirDominio(
  tenantId: string,
  dominio: string,
): Promise<ActionResult<{ dominio: string | null }>> {
  await requirePlatformAdmin();
  if (!z.string().uuid().safeParse(tenantId).success) {
    return { ok: false, error: "Pizzaria inválida." };
  }

  const limpo = dominio
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  if (limpo && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(limpo)) {
    return {
      ok: false,
      error: "Domínio inválido. Exemplo: pizzariadobairro.com.br",
    };
  }

  try {
    await sql`
      update tenants
      set custom_domain = ${limpo || null}, updated_at = now()
      where id = ${tenantId}
    `;
  } catch (error) {
    // 23505 = unique_violation: outra pizzaria já usa este domínio.
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "Esse domínio já está em outra pizzaria." };
    }
    throw error;
  }

  revalidatePath("/agencia");
  return { ok: true, dados: { dominio: limpo || null } };
}

export async function trocarSenhaDoDono(
  tenantId: string,
  novaSenha: string,
): Promise<ActionResult<{ email: string }>> {
  await requirePlatformAdmin();
  if (!z.string().uuid().safeParse(tenantId).success) {
    return { ok: false, error: "Pizzaria inválida." };
  }

  try {
    const email = await redefinirSenhaDoDono(tenantId, novaSenha);
    revalidatePath("/agencia");
    return { ok: true, dados: { email } };
  } catch (error) {
    if (error instanceof ProvisioningError) {
      return { ok: false, error: error.message };
    }
    console.error("Falha ao trocar senha do dono", error);
    return { ok: false, error: "Não foi possível trocar a senha." };
  }
}
