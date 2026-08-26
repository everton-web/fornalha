import "server-only";

import { FORNALHA, type Brand, type EmailContent } from "./template";

/** As mensagens que o sistema envia, num lugar só — é aqui que se ajusta o tom. */

export function resetPasswordEmail(url: string, minutos: number): EmailContent {
  return {
    brand: FORNALHA,
    preheader: `Link para criar uma senha nova. Vale por ${minutos} minutos.`,
    heading: "Criar uma senha nova",
    paragraphs: [
      "Recebemos um pedido para redefinir a senha do seu painel.",
      `O link abaixo vale por <strong>${minutos} minutos</strong> e só pode ser usado uma vez.`,
    ],
    action: { label: "Criar senha nova", url },
    note: "Se não foi você que pediu, ignore este e-mail — sua senha atual continua valendo e ninguém tem acesso ao painel.",
  };
}

export function inviteEmail(
  url: string,
  pizzaria: string,
  dias: number,
  brand: Brand = FORNALHA,
): EmailContent {
  return {
    brand,
    preheader: `Você foi convidado para o painel da ${pizzaria}.`,
    heading: `Seu acesso ao painel da ${pizzaria}`,
    paragraphs: [
      `Você foi convidado para acessar o painel de pedidos da <strong>${pizzaria}</strong>.`,
      `Defina sua senha pelo link abaixo. Ele vale por ${dias} dias.`,
    ],
    action: { label: "Definir minha senha", url },
    note: "Depois de definir a senha, você entra pelo painel com este mesmo e-mail.",
  };
}

export function passwordChangedEmail(quando: string): EmailContent {
  return {
    brand: FORNALHA,
    preheader: "A senha do seu painel foi alterada.",
    heading: "Sua senha foi alterada",
    paragraphs: [
      `A senha do seu painel foi alterada em <strong>${quando}</strong>, e todas as sessões abertas foram encerradas.`,
    ],
    note: "Se não foi você, fale com a gente agora: alguém com acesso ao seu e-mail conseguiu entrar no painel.",
  };
}
