#!/usr/bin/env node
/**
 * Põe o banco em dia e libera um acesso ao painel, num comando só.
 *
 *   npm run instalar -- --email=voce@exemplo.com --senha=umaSenhaForte
 *   npm run instalar -- --email=... --senha=... --demo   (cria a pizzaria de demonstração)
 *
 * Faz, nesta ordem:
 *   1. roda as migrations que faltarem (idempotentes)
 *   2. com --demo, cria a pizzaria de demonstração
 *   3. cria ou atualiza o login e o liga à pizzaria
 *   4. mostra o inventário do banco, para conferir o que ficou
 *
 * Existe porque a sequência acima era feita à mão, em três comandos e uma
 * conferência — e errar a ordem dá erro que não explica a causa. Aqui, ou
 * funciona inteiro, ou para no passo que falhou dizendo o que houve.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

import { args, die, hashPassword, loadEnv } from "./lib.mjs";

loadEnv();

const { email, senha, slug = "bella-napoli", papel = "owner", demo } = args();

const url = process.env.DATABASE_URL;
if (!url) {
  die(
    "DATABASE_URL não definida.\n\n" +
      "  Localmente:  preencha o .env.local\n" +
      "  Na Vercel:   Settings > Environment Variables (use a string do pooler,\n" +
      "               a que tem 'pooler' no host e porta 6543)",
  );
}
if (!email || !senha) {
  die(
    "Faltam parâmetros. Exemplo:\n" +
      "  npm run instalar -- --email=voce@exemplo.com --senha=umaSenhaForte",
  );
}
if (senha.length < 8) die("A senha precisa de pelo menos 8 caracteres.");
if (!["owner", "staff"].includes(papel)) die("--papel deve ser owner ou staff.");

const local = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, {
  ssl: local ? false : "require",
  prepare: false,
  max: 1,
  transform: { undefined: null },
  // As migrations são idempotentes e o Postgres avisa a cada "já existe,
  // pulando". São dezenas de avisos esperados, que só escondem o que importa.
  onnotice: () => {},
});

/** Mostra o host sem entregar usuário e senha no log. */
function hostDe(connString) {
  try {
    return new URL(connString).host;
  } catch {
    return "(não consegui ler o host)";
  }
}

try {
  console.log(`\n▸ Banco: ${hostDe(url)}\n`);

  // ------------------------------------------------------------- migrations
  const arquivos = readdirSync("db/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("Migrations");
  for (const arquivo of arquivos) {
    process.stdout.write(`  ${arquivo} … `);
    await sql.unsafe(readFileSync(join("db/migrations", arquivo), "utf8")).simple();
    console.log("ok");
  }

  // ------------------------------------------------------------------ demo
  if (demo !== undefined) {
    console.log("\nPizzaria de demonstração");
    process.stdout.write("  seed.sql … ");
    await sql.unsafe(readFileSync("db/seed.sql", "utf8")).simple();
    console.log("ok");
  }

  // ----------------------------------------------------------------- acesso
  console.log("\nAcesso ao painel");

  const [tenant] = await sql`select id, name from tenants where slug = ${slug}`;
  if (!tenant) {
    const [{ qtd }] = await sql`select count(*)::int as qtd from tenants`;
    if (qtd === 0) {
      die(
        `Não há nenhuma pizzaria neste banco.\n` +
          `  Rode de novo com --demo para criar a de demonstração, ou use\n` +
          `  npm run nova-pizzaria para criar uma de verdade.`,
      );
    }
    const disponiveis = await sql`select slug from tenants order by slug`;
    die(
      `Não achei a pizzaria "${slug}".\n` +
        `  Disponíveis: ${disponiveis.map((r) => r.slug).join(", ")}\n` +
        `  Escolha uma com --slug=...`,
    );
  }

  const emailNormalizado = email.trim().toLowerCase();
  const passwordHash = await hashPassword(senha);

  await sql.begin(async (tx) => {
    const [user] = await tx`
      insert into users (email, password_hash)
      values (${emailNormalizado}, ${passwordHash})
      on conflict (email) do update set password_hash = excluded.password_hash
      returning id
    `;
    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${user.id}, ${papel})
      on conflict (tenant_id, user_id) do update set role = excluded.role
    `;
  });
  console.log(`  ${emailNormalizado} → ${papel} em "${tenant.name}"`);

  // -------------------------------------------------------------- conferência
  // Ler de volta é o que separa "o comando não deu erro" de "está funcionando".
  const [resumo] = await sql`
    select
      (select count(*) from tenants)::int  as pizzarias,
      (select count(*) from flavors)::int  as sabores,
      (select count(*) from orders)::int   as pedidos,
      (select count(*) from users)::int    as contas,
      (select count(*) from price_groups)::int as faixas
  `;
  const [confere] = await sql`
    select 1 from users u
    join tenant_members tm on tm.user_id = u.id
    where u.email = ${emailNormalizado} and tm.tenant_id = ${tenant.id}
  `;

  console.log(`
Inventário
  pizzarias ....... ${resumo.pizzarias}
  sabores ......... ${resumo.sabores}
  faixas de preço . ${resumo.faixas}
  pedidos ......... ${resumo.pedidos}
  contas de login . ${resumo.contas}
`);

  if (!confere) die("O acesso não ficou gravado. Rode de novo.");

  console.log(`✓ Pronto. Entre em /admin com ${emailNormalizado}.\n`);
} catch (error) {
  console.error(`\n✖ ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
