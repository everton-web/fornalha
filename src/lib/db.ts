import "server-only";

import postgres from "postgres";

/**
 * Conexão única com o Postgres.
 *
 * Funciona com Neon, Vercel Postgres, Supabase ou um Postgres seu — só muda a
 * DATABASE_URL. `prepare: false` é o que permite usar a string com pooler
 * (PgBouncer em modo transaction), o padrão nesses provedores.
 */
function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Copie .env.example para .env.local e preencha.",
    );
  }

  return postgres(url, {
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    prepare: false,
    max: 5,
    idle_timeout: 20,
    transform: { undefined: null },
  });
}

// O hot reload do dev recria os módulos; sem este cache, cada salvamento
// abriria um pool novo até estourar o limite de conexões.
const globalForDb = globalThis as unknown as {
  __fornalhaDb?: ReturnType<typeof connect>;
};

export const sql = globalForDb.__fornalhaDb ?? connect();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fornalhaDb = sql;
}

/**
 * Consulta que tolera tabela ainda inexistente.
 *
 * O banco pode estar uma migration atrás do código — é exatamente o estado
 * entre publicar uma versão nova e rodar a instalação. Sem isto, o cardápio
 * inteiro cai com erro 500 nessa janela, e a página de instalação, que é a
 * saída, ficaria inalcançável junto.
 *
 * São dois códigos, não um: 42P01 é tabela inexistente e 42703 é coluna
 * inexistente. A migration 0009 acrescenta as duas coisas — tabelas novas
 * (price_groups) e colunas em tabelas antigas (flavors.image_data) — e tratar
 * só o primeiro deixaria metade dos casos derrubando a página.
 *
 * Qualquer outro erro sobe: o que falta por migration é previsível, o resto é
 * problema de verdade e não pode ser engolido.
 */
const FALTA_NO_BANCO = new Set(["42P01", "42703"]);

export async function opcional<T>(
  consulta: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code && FALTA_NO_BANCO.has(code)) return fallback;
    throw error;
  }
}

/** numeric do Postgres chega como string — dinheiro sempre passa por aqui. */
export function num(value: unknown): number {
  return value == null ? 0 : Number(value);
}

export function numOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

/**
 * Lê uma coluna jsonb com tolerância a registro antigo.
 *
 * Até 25/08/2026 alguns valores foram gravados com JSON.stringify, o que os
 * guardou como string escapada dentro do jsonb. A gravação já foi corrigida;
 * isto mantém legível o que ficou para trás.
 */
export function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/**
 * Colunas do tenant para leitura comum.
 *
 * `logo_data` fica de fora de propósito: é a imagem inteira em base64, e o
 * cardápio lê o tenant a cada visita. Quem precisa dos bytes é só a rota que
 * serve a imagem.
 */
export const TENANT_COLUMNS = `
  id, slug, name, tagline, logo_url, cover_url, primary_color, phone, whatsapp,
  address, zip, refuse_outside_zones, is_active, is_open_override,
  opening_hours, timezone, prep_time_min,
  delivery_enabled, pickup_enabled, delivery_fee, min_order_value,
  accepts_cash, accepts_card_delivery, accepts_pix_manual, pix_key,
  online_payment_enabled, payment_provider, half_pricing, created_at, updated_at,
  (logo_data is not null) as has_logo
`;
