"use server";

import { z } from "zod";

import { createSession } from "@/lib/auth";
import { instalar, type ResultadoInstalacao } from "@/lib/install";
import { sql } from "@/lib/db";

export type InstallResult =
  | { ok: true; resumo: ResultadoInstalacao }
  | { ok: false; error: string };

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
  criarDemo: z.boolean().optional().default(true),
});

export async function instalarSistema(
  input: z.input<typeof schema>,
): Promise<InstallResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const resumo = await instalar(parsed.data);

    // Já entra logado: a pessoa acabou de provar que é dona do sistema ao
    // instalá-lo, e mandá-la digitar a mesma senha na tela seguinte só
    // acrescenta um passo onde algo pode dar errado.
    const [user] = await sql`
      select id from users where email = ${resumo.email} limit 1
    `;
    if (user) await createSession(user.id as string);

    return { ok: true, resumo };
  } catch (error) {
    console.error("Falha na instalação", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível instalar. Tente de novo.",
    };
  }
}
