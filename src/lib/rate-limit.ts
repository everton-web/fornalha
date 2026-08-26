import "server-only";

import { headers } from "next/headers";

import { sql } from "@/lib/db";

/**
 * Freio de repetição por janela fixa.
 *
 * Serve para os três lugares onde repetir sai barato para quem ataca e caro
 * para a pizzaria: fechar pedido, tentar senha e pedir link de recuperação.
 *
 * Janela fixa em vez de deslizante porque é uma linha de SQL e resolve o
 * problema real — enxurrada de repetição —, não um adversário determinado
 * medindo a virada da janela.
 */

export type RateResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** IP de quem chamou, atrás do proxy da hospedagem. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

export async function checkRate(
  chave: string,
  limite: number,
  janelaSegundos: number,
): Promise<RateResult> {
  try {
    const [linha] = await sql`
      insert into rate_limits (bucket, hits, expires_at)
      values (${chave}, 1, now() + ${`${janelaSegundos} seconds`}::interval)
      on conflict (bucket) do update set
        -- janela vencida recomeça a contagem; janela viva soma mais um
        hits = case
                 when rate_limits.expires_at < now() then 1
                 else rate_limits.hits + 1
               end,
        expires_at = case
                       when rate_limits.expires_at < now()
                         then now() + ${`${janelaSegundos} seconds`}::interval
                       else rate_limits.expires_at
                     end
      returning hits, expires_at
    `;

    const hits = Number(linha.hits);
    if (hits <= limite) return { ok: true };

    const faltam = Math.max(
      1,
      Math.ceil((new Date(linha.expires_at as string).getTime() - Date.now()) / 1000),
    );
    return { ok: false, retryAfterSeconds: faltam };
  } catch (erro) {
    // Freio quebrado não pode derrubar a loja: na dúvida, deixa passar.
    console.error("Falha ao verificar limite de repetição", erro);
    return { ok: true };
  }
}

/** Faxina das janelas vencidas — chamada de vez em quando, sem cerimônia. */
export async function cleanupRateLimits(): Promise<void> {
  try {
    await sql`delete from rate_limits where expires_at < now() - interval '1 hour'`;
  } catch {
    // sem consequência: linha vencida não bloqueia ninguém
  }
}

export function minutosEmTexto(segundos: number): string {
  if (segundos < 60) return `${segundos} segundos`;
  const minutos = Math.ceil(segundos / 60);
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}
