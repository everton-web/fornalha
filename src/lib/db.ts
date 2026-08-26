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
