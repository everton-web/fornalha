import "server-only";

/**
 * Molde dos e-mails do sistema.
 *
 * Cliente de e-mail não é navegador: não há CSS externo, não há fonte da web,
 * e o Outlook ainda renderiza com um motor antigo. Por isso tudo aqui é
 * tabela com estilo escrito no próprio elemento — feio de escrever, mas é o
 * que chega igual na caixa de entrada de todo mundo.
 */

export type Brand = {
  name: string;
  /** cor de destaque; a da pizzaria quando o e-mail for dela */
  color: string;
  footer: string;
};

export const FORNALHA: Brand = {
  name: "Fornalha",
  color: "#c81e1e",
  footer: "Fornalha — sistema de pedidos para pizzarias",
};

/** Preto ou branco sobre a cor da marca, o que tiver contraste. */
function inkFor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#1c1917" : "#ffffff";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailContent = {
  brand?: Brand;
  preheader: string;
  heading: string;
  /** cada item vira um parágrafo */
  paragraphs: string[];
  action?: { label: string; url: string };
  /** texto pequeno depois do botão, para o aviso de "se não foi você" */
  note?: string;
};

export function renderEmail(content: EmailContent): string {
  const brand = content.brand ?? FORNALHA;
  const ink = inkFor(brand.color);

  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#44403c;">${p}</p>`,
    )
    .join("");

  const action = content.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
         <tr><td style="border-radius:999px;background:${brand.color};">
           <a href="${escapeHtml(content.action.url)}"
              style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;
                     color:${ink};text-decoration:none;border-radius:999px;">
             ${escapeHtml(content.action.label)}
           </a>
         </td></tr>
       </table>
       <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#78716c;">
         Se o botão não funcionar, copie este endereço no navegador:<br>
         <span style="color:#57534e;word-break:break-all;">${escapeHtml(content.action.url)}</span>
       </p>`
    : "";

  const note = content.note
    ? `<p style="margin:0;padding-top:20px;border-top:1px solid #e7e2da;
                 font-size:13px;line-height:1.6;color:#78716c;">${content.note}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#faf7f2;">
  <!-- prévia que aparece na lista de e-mails, antes de abrir -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(content.preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#faf7f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border:1px solid #e7e2da;border-radius:16px;">
        <tr><td style="padding:28px 32px 0;">
          <span style="display:inline-block;font-size:13px;font-weight:700;
                       letter-spacing:.08em;text-transform:uppercase;color:${brand.color};">
            ${escapeHtml(brand.name)}
          </span>
        </td></tr>

        <tr><td style="padding:12px 32px 0;">
          <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#1c1917;
                     font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ${escapeHtml(content.heading)}
          </h1>
        </td></tr>

        <tr><td style="padding:0 32px 28px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          ${paragraphs}
          ${action}
          ${note}
        </td></tr>
      </table>

      <p style="margin:20px 0 0;font-size:12px;color:#a8a29e;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        ${escapeHtml(brand.footer)}
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Versão em texto puro — alguns clientes mostram ela, e ajuda contra spam. */
export function renderText(content: EmailContent): string {
  const linhas = [
    content.heading,
    "",
    ...content.paragraphs.map((p) => p.replace(/<[^>]+>/g, "")),
  ];
  if (content.action) linhas.push("", `${content.action.label}: ${content.action.url}`);
  if (content.note) linhas.push("", content.note.replace(/<[^>]+>/g, ""));
  return linhas.join("\n");
}
