#!/usr/bin/env node
/**
 * Backup do banco em JSON, para dentro de backups/ (fora do Git).
 *
 * Não substitui o backup do provedor — é a cópia que fica com você, que você
 * consegue abrir e conferir, e que não depende de continuar cliente de ninguém.
 * Para o tamanho de dado de uma pizzaria, JSON é suficiente e legível.
 *
 *   npm run db:backup
 *
 * Restauração ainda é manual: o JSON é legível e as tabelas estão na ordem
 * certa para reinserir (pai antes de filho). Um comando de restore só vale
 * a pena depois de existir dado real que justifique testá-lo a sério.
 */

import { mkdirSync, writeFileSync } from "node:fs";

import { connect, die } from "./lib.mjs";

// Ordem importa na restauração: pai antes de filho.
const TABELAS = [
  "users",
  "tenants",
  "tenant_members",
  "categories",
  "sizes",
  "flavors",
  "flavor_prices",
  "crusts",
  "addons",
  "products",
  "orders",
  "order_items",
];

const sql = connect();

try {
  const dump = { gerado_em: new Date().toISOString(), tabelas: {} };
  let total = 0;

  for (const tabela of TABELAS) {
    const linhas = await sql`select * from ${sql(tabela)}`;
    dump.tabelas[tabela] = linhas;
    total += linhas.length;
    console.log(`  ${tabela.padEnd(16)} ${String(linhas.length).padStart(5)} linha(s)`);
  }

  mkdirSync("backups", { recursive: true });
  const nome = `backups/${new Date().toISOString().slice(0, 16).replace(/:/g, "h")}.json`;
  writeFileSync(nome, JSON.stringify(dump, null, 2), "utf8");

  console.log(`
✓ ${total} linhas salvas em ${nome}

  O hash das senhas vai junto: guarde este arquivo como guardaria a senha.
`);
} catch (erro) {
  die(erro.message);
} finally {
  await sql.end();
}
