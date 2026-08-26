import { requireSession } from "@/lib/auth";
import {
  inviteEmail,
  passwordChangedEmail,
  resetPasswordEmail,
} from "@/lib/email/messages";
import { renderEmail } from "@/lib/email/template";
import type { EmailContent } from "@/lib/email/template";

/**
 * Prévia dos e-mails do sistema, com dados de exemplo.
 *
 * Existe porque e-mail não tem como ser conferido depois de enviado: ou se
 * olha antes, ou se descobre pelo cliente reclamando. Exige sessão do painel.
 */

const EXEMPLOS: Record<string, () => EmailContent> = {
  senha: () => resetPasswordEmail("https://exemplo.com/admin/redefinir/token", 30),
  convite: () => inviteEmail("https://exemplo.com/admin/convite/token", "Bella Napoli", 7),
  alterada: () => passwordChangedEmail("25/08, 21:40"),
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  await requireSession();
  const { tipo } = await params;

  const exemplo = EXEMPLOS[tipo];
  if (!exemplo) {
    return new Response(
      `Prévia não encontrada. Use: ${Object.keys(EXEMPLOS).join(", ")}`,
      { status: 404 },
    );
  }

  return new Response(renderEmail(exemplo()), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
