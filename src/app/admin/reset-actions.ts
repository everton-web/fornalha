"use server";

import { z } from "zod";

import {
  baseUrl,
  checkAuthToken,
  consumeAuthToken,
  createAuthToken,
  minutesFor,
} from "@/lib/auth-tokens";
import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail, resetPasswordEmail } from "@/lib/email/messages";
import { formatDateTime } from "@/lib/format";
import { hashPassword } from "@/lib/password";

export type FormState = { error?: string; sent?: boolean } | null;

const emailSchema = z.string().trim().email();

/**
 * Pede o link de redefinição.
 *
 * A resposta é sempre a mesma, exista o e-mail ou não: se dissesse "não achei
 * esse e-mail", qualquer um poderia descobrir quem tem conta no sistema.
 */
export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };

  const email = parsed.data.toLowerCase();
  const rows = await sql`select id from users where email = ${email}`;
  const user = rows[0];

  if (user) {
    const token = await createAuthToken(user.id as string, "reset");
    const url = `${await baseUrl()}/admin/redefinir/${token}`;
    await sendEmail(
      email,
      "Criar uma senha nova — Fornalha",
      resetPasswordEmail(url, minutesFor("reset")),
    );
  }

  return { sent: true };
}

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(10, "Use pelo menos 10 caracteres."),
  confirm: z.string(),
});

export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { token, password, confirm } = parsed.data;

  if (password !== confirm) return { error: "As duas senhas não são iguais." };

  const check = await checkAuthToken(token, "reset");
  if (!check.valid) {
    return {
      error:
        check.reason === "expired"
          ? "Este link expirou. Peça um novo."
          : check.reason === "used"
            ? "Este link já foi usado. Peça um novo."
            : "Link inválido. Peça um novo.",
    };
  }

  await sql`
    update users set password_hash = ${await hashPassword(password)}
    where id = ${check.userId}
  `;
  // Trocar a senha expulsa quem estava logado, inclusive um invasor.
  await sql`delete from sessions where user_id = ${check.userId}`;
  await consumeAuthToken(token);

  await sendEmail(
    check.email,
    "Sua senha foi alterada — Fornalha",
    passwordChangedEmail(formatDateTime(new Date().toISOString())),
  );

  return { sent: true };
}
