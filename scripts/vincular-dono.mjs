#!/usr/bin/env node
/**
 * Cria (ou atualiza) um login e o vincula a uma pizzaria que já existe.
 * Serve para dar acesso ao painel da pizzaria de demonstração ou para
 * adicionar alguém da equipe.
 *
 *   npm run vincular-dono -- --slug=bella-napoli --email=eu@x.com --senha=umaSenhaForte [--papel=staff]
 */

import { args, connect, die, hashPassword } from "./lib.mjs";

const { slug, email, senha, papel = "owner" } = args();

if (!slug || !email || !senha) {
  die(
    "Faltam parâmetros. Exemplo:\n  npm run vincular-dono -- --slug=bella-napoli --email=eu@x.com --senha=umaSenhaForte",
  );
}
if (senha.length < 8) die("A senha precisa de pelo menos 8 caracteres.");
if (!["owner", "staff"].includes(papel)) die("--papel deve ser owner ou staff.");

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
