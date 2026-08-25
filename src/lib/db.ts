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
