import "server-only";

import { cache } from "react";

export type CepAddress = {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

/** Só dígitos, oito posições. */
export function normalizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

export function formatCep(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * Consulta o CEP na BrasilAPI, que é pública e não pede chave.
 *
 * Usamos rua, bairro e cidade — não as coordenadas: elas vêm aproximadas
 * demais (bairros distantes retornam o mesmo ponto) para servir de base
 * a cobrança.
 *
 * O cache do React evita consultar o mesmo CEP duas vezes na mesma
 * requisição, o que acontece ao validar o pedido logo após a busca.
 */
export const lookupCep = cache(async function lookupCep(
  cep: string,
): Promise<CepAddress | null> {
  const limpo = normalizeCep(cep);
  if (!limpo) return null;

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${limpo}`, {
      // O CEP de uma rua não muda; um dia de cache é conservador.
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(6_000),
    });

    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as {
      street?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };

    return {
      cep: limpo,
      street: dados.street ?? "",
      district: dados.neighborhood ?? "",
      city: dados.city ?? "",
      state: dados.state ?? "",
    };
  } catch {
    // API fora do ar ou demorando: o cliente digita o endereço na mão.
    return null;
  }
});
