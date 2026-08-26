#!/usr/bin/env node
/**
 * Roda as migrations (db/migrations/*.sql) em ordem alfabética.
 * Com --seed, roda também db/seed.sql (pizzaria de demonstração).
 *
 *   node scripts/migrate.mjs
 *   node scripts/migrate.mjs --seed
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(file, "utf8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // arquivo ausente é normal
    }
  }
}

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n✖ DATABASE_URL não definida. Preencha o .env.local.\n");
  process.exit(1);
}

// Mesma regra do src/lib/db.ts: Postgres local não fala TLS, e exigir SSL aqui
// quebraria o `npm run db:migrate` contra um banco na própria máquina.
const local = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, { ssl: local ? false : "require", prepare: false, max: 1 });

const files = readdirSync("db/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

try {
  for (const file of files) {
    process.stdout.write(`• ${file} … `);
    await sql.unsafe(readFileSync(join("db/migrations", file), "utf8")).simple();
    console.log("ok");
  }

  if (process.argv.includes("--seed")) {
    process.stdout.write("• seed.sql … ");
    await sql.unsafe(readFileSync("db/seed.sql", "utf8")).simple();
    console.log("ok");
  }

  // Sempre por último: depende da pizzaria de demonstração existir, e o seed
  // apaga e recria esse tenant. Ver o cabeçalho de db/demo.sql.
  process.stdout.write("• demo.sql … ");
  await sql.unsafe(readFileSync("db/demo.sql", "utf8")).simple();
  console.log("ok");

  console.log("\n✓ Banco pronto.\n");
} catch (error) {
  console.error(`\n✖ ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
