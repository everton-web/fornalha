import "server-only";

import { renderEmail, renderText, type EmailContent } from "./template";

/**
 * Envio de e-mail.
 *
 * Usa o Resend quando há chave configurada. Sem chave, escreve a mensagem no
 * log do servidor em vez de falhar — assim o fluxo inteiro pode ser testado
 * antes de existir conta em serviço nenhum, e o link aparece no terminal.
 */

export type SendResult = { ok: true; delivered: boolean } | { ok: false; error: string };

function remetente(): string {
  return process.env.EMAIL_FROM ?? "Fornalha <onboarding@resend.dev>";
}

export async function sendEmail(
  to: string,
  subject: string,
  content: EmailContent,
): Promise<SendResult> {
  const html = renderEmail(content);
  const text = renderText(content);
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.info(
      [
        "",
        "──────── E-MAIL NÃO ENVIADO (sem RESEND_API_KEY) ────────",
        `Para:    ${to}`,
        `Assunto: ${subject}`,
        "",
        text,
        "─────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, delivered: false };
  }

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: remetente(), to, subject, html, text }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error("Resend recusou o envio:", resposta.status, detalhe);
      return { ok: false, error: "Não foi possível enviar o e-mail." };
    }

    return { ok: true, delivered: true };
  } catch (erro) {
    console.error("Falha de rede ao enviar e-mail", erro);
    return { ok: false, error: "Não foi possível enviar o e-mail." };
  }
}
