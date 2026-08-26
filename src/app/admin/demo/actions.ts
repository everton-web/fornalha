"use server";

import { redirect } from "next/navigation";

import { createSession } from "@/lib/auth";
import { opcional, sql } from "@/lib/db";
import { DEMO_EMAIL } from "@/lib/demo";

/**
 * Abre o painel em modo demonstração.
 *
 * Cria sessão para a conta de demonstração sem pedir senha — e pode, porque
 * a conta não escreve nada: `requireEscrita()` a barra em toda ação do painel,
 * e `scripts/testa-demo.mjs` confere que nenhuma escapou. Uma sessão aberta
 * aqui não é um acesso privilegiado a nada; é uma janela.
 *
 * A conta é procurada por `is_demo`, não pelo e-mail: assim, se alguém um dia
 * cadastrar um dono com esse endereço, ele não vira porta de entrada.
 */
export async function entrarNaDemo(): Promise<{ ok: false; error: string }> {
  // opcional: num banco anterior à 0013 a coluna is_demo ainda não existe, e
  // a consulta crua derrubaria a página em vez de dizer o que falta fazer.
  const userId = await opcional(async () => {
    const [r] = await sql`
      select u.id
      from users u
      join tenant_members m on m.user_id = u.id
      where u.is_demo and u.email = ${DEMO_EMAIL}
      limit 1
    `;
    return (r?.id as string | undefined) ?? null;
  }, null as string | null);

  if (!userId) {
    return {
      ok: false,
      error:
        "A demonstração ainda não foi preparada neste banco. " +
        "Na agência, use “Atualizar o banco”.",
    };
  }

  await createSession(userId);
  redirect("/admin/pedidos");
}
