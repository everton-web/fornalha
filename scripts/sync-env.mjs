#!/usr/bin/env node
/**
 * Sincroniza variáveis do .env.local com os três ambientes da Vercel.
 *
 * Existe para que credencial nenhuma precise ser digitada duas vezes nem
 * copiada para outro lugar: você cola no .env.local, roda isto, e a Vercel
 * fica igual. O valor nunca é impresso na tela.
 *
 *   npm run env:sync                  # sincroniza DATABASE_URL
 *   npm run env:sync -- OUTRA_CHAVE   # sincroniza outra variável
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const AMBIENTES = ["production", "preview", "development"];

function die(mensagem) {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(1);
}

const chave = process.argv[2] || "DATABASE_URL";

let conteudo;
try {
  conteudo = readFileSync(".env.local", "utf8");
} catch {
  die("Não achei o .env.local nesta pasta.");
}

// Aceita com ou sem aspas ao redor do valor.
const linha = conteudo
  .split("\n")
  .find((l) => l.trim().startsWith(`${chave}=`));

if (!linha) die(`${chave} não está definida no .env.local.`);

const valor = linha.slice(linha.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
if (!valor) die(`${chave} está vazia no .env.local.`);

// Não imprimimos o valor: só o suficiente para conferir que é o esperado.
const impressao =
  valor.length > 18 ? `${valor.slice(0, 10)}…${valor.slice(-6)}` : "(curto)";
console.log(`\nSincronizando ${chave} — ${impressao}\n`);

for (const ambiente of AMBIENTES) {
  // Remover antes de adicionar: a Vercel não sobrescreve valor existente.
  try {
    execFileSync("vercel", ["env", "rm", chave, ambiente, "--yes"], {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // não existia ainda — seguir em frente
  }

  try {
    execFileSync("vercel", ["env", "add", chave, ambiente], {
      input: valor,
      stdio: ["pipe", "ignore", "ignore"],
      shell: true,
    });
    console.log(`  ✓ ${ambiente}`);
  } catch {
    die(`Falhou ao gravar em ${ambiente}. Rode 'vercel link' e tente de novo.`);
  }
}

console.log(`
✓ ${chave} sincronizada nos três ambientes.

  As funções em produção só passam a usar o valor novo no próximo deploy:
  vercel deploy --prod
`);
