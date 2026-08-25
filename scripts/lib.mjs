import { randomBytes, scrypt } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import postgres from "postgres";

const scryptAsync = promisify(scrypt);

/** .env.local não é carregado automaticamente fora do Next. */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
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

export function args() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    out[key] = rest.join("=");
  }
  return out;
}

export function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

export function connect() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) die("DATABASE_URL não definida. Preencha o .env.local.");
  return postgres(url, { ssl: "require", prepare: false, max: 1 });
}

/** Mesmo formato de src/lib/password.ts: "salt_hex:hash_hex". */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}
