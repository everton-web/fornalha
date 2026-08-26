#!/usr/bin/env node
/**
 * Cria (ou atualiza) um login e o vincula a uma pizzaria que já existe.
 * Serve para dar acesso ao painel da pizzaria de demonstração ou para
 * adicionar alguém da equipe.
 *
 *   npm run vincular-dono -- --slug=bella-napoli --email=eu@x.com --senha=umaSenhaForte [--papel=staff]
 *
 * Com --sql, não conecta em nada: imprime o comando pronto para colar no SQL
 * Editor do Supabase (ou em qualquer psql). Serve para quem precisa liberar um
 * acesso sem ter o projeto rodando na máquina — a senha continua sendo
 * transformada em hash aqui, então ela nunca viaja nem fica gravada em texto.
 */

import { args, connect, die, hashPassword } from "./lib.mjs";

const { slug, email, senha, papel = "owner", sql: comoSql } = args();

if (!slug || !email || !senha) {
  die(
    "Faltam parâmetros. Exemplo:\n  npm run vincular-dono -- --slug=bella-napoli --email=eu@x.com --senha=umaSenhaForte",
  );
}
if (senha.length < 8) die("A senha precisa de pelo menos 8 caracteres.");
if (!["owner", "staff"].includes(papel)) die("--papel deve ser owner ou staff.");

/** Aspas simples dobradas: é assim que o Postgres escapa literal de texto. */
function lit(valor) {
  return `'${String(valor).replace(/'/g, "''")}'`;
}

if (comoSql !== undefined) {
  const emailNormalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(senha);

  // Bloco DO e não um insert solto: sem a conferência do slug, um erro de
  // digitação criaria o usuário e não o ligaria a pizzaria nenhuma — e o
  // login falharia depois, sem explicação.
  console.log(`
-- Libera acesso ${papel} de ${emailNormalized} à pizzaria "${slug}".
-- Gerado por: npm run vincular-dono -- --sql
-- A senha já vem em hash (scrypt); ela não aparece aqui.

do $$
declare
  v_tenant uuid;
  v_user   uuid;
begin
  select id into v_tenant from tenants where slug = ${lit(slug)};
  if v_tenant is null then
    raise exception 'Não existe pizzaria com o slug %', ${lit(slug)};
  end if;

  insert into users (email, password_hash)
  values (${lit(emailNormalized)}, ${lit(passwordHash)})
  on conflict (email) do update set password_hash = excluded.password_hash
  returning id into v_user;

  insert into tenant_members (tenant_id, user_id, role)
  values (v_tenant, v_user, ${lit(papel)})
  on conflict (tenant_id, user_id) do update set role = excluded.role;

  raise notice 'Acesso liberado para %', ${lit(emailNormalized)};
end $$;
`);
  process.exit(0);
}

const sql = connect();

try {
  const [tenant] = await sql`select id, name from tenants where slug = ${slug}`;
  if (!tenant) die(`Não achei nenhuma pizzaria com o slug "${slug}".`);

  const passwordHash = await hashPassword(senha);
  const emailNormalized = email.trim().toLowerCase();

  await sql.begin(async (tx) => {
    // Se o e-mail já existe, a senha informada passa a valer.
    const [user] = await tx`
      insert into users (email, password_hash)
      values (${emailNormalized}, ${passwordHash})
      on conflict (email) do update set password_hash = excluded.password_hash
      returning id
    `;

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${user.id}, ${papel})
      on conflict (tenant_id, user_id) do update set role = excluded.role
    `;
  });

  console.log(`
✓ ${emailNormalized} agora tem acesso ${papel} a "${tenant.name}".
  Entre em /admin com esse e-mail e a senha informada.
`);
} catch (error) {
  die(error.message);
} finally {
  await sql.end();
}
