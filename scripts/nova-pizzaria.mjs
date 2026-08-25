#!/usr/bin/env node
/**
 * Provisiona uma pizzaria nova: cria o login do dono, o tenant e um cardápio
 * base (tamanhos, categorias e bordas) para o cliente já abrir o painel e
 * começar a cadastrar sabores.
 *
 *   npm run nova-pizzaria -- --slug=dom-luigi --nome="Dom Luigi" \
 *     --email=dono@domluigi.com.br --senha=umaSenhaForte \
 *     [--cor=#1e5c2f] [--whatsapp=11987654321]
 */

import { args, connect, die, hashPassword } from "./lib.mjs";

const { slug, nome, email, senha, cor, whatsapp } = args();

if (!slug || !nome || !email || !senha) {
  die(
    'Faltam parâmetros. Exemplo:\n  npm run nova-pizzaria -- --slug=dom-luigi --nome="Dom Luigi" --email=dono@x.com --senha=umaSenhaForte',
  );
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  die("O slug só pode ter letras minúsculas, números e hífen.");
}
if (senha.length < 8) die("A senha precisa de pelo menos 8 caracteres.");

const sql = connect();

try {
  const existing = await sql`select id from tenants where slug = ${slug}`;
  if (existing[0]) die(`Já existe uma pizzaria com o slug "${slug}".`);

  const passwordHash = await hashPassword(senha);
  const emailNormalized = email.trim().toLowerCase();
  const whats = whatsapp
    ? whatsapp.replace(/\D/g, "").startsWith("55")
      ? whatsapp.replace(/\D/g, "")
      : `55${whatsapp.replace(/\D/g, "")}`
    : null;

  // Tudo numa transação: ou nasce completa, ou não nasce.
  const { tenantId } = await sql.begin(async (tx) => {
    const [user] = await tx`
      insert into users (email, password_hash, name)
      values (${emailNormalized}, ${passwordHash}, ${nome})
      on conflict (email) do update set email = excluded.email
      returning id
    `;

    const [tenant] = await tx`
      insert into tenants (slug, name, primary_color, whatsapp, opening_hours)
      values (
        ${slug}, ${nome}, ${cor || "#c81e1e"}, ${whats},
        ${tx.json(
          [2, 3, 4, 5, 6, 0].map((day) => ({ day, open: "18:00", close: "23:30" })),
        )}
      )
      returning id
    `;

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${user.id}, 'owner')
    `;

    await tx`
      insert into sizes ${tx([
        { tenant_id: tenant.id, name: "Pequena", slices: 4, max_flavors: 1, sort_order: 1 },
        { tenant_id: tenant.id, name: "Média", slices: 6, max_flavors: 2, sort_order: 2 },
        { tenant_id: tenant.id, name: "Grande", slices: 8, max_flavors: 2, sort_order: 3 },
      ])}
    `;

    await tx`
      insert into categories ${tx([
        { tenant_id: tenant.id, name: "Pizzas salgadas", sort_order: 1 },
        { tenant_id: tenant.id, name: "Pizzas doces", sort_order: 2 },
        { tenant_id: tenant.id, name: "Bebidas", sort_order: 3 },
      ])}
    `;

    await tx`
      insert into crusts ${tx([
        { tenant_id: tenant.id, name: "Sem borda recheada", price: 0, sort_order: 1 },
        { tenant_id: tenant.id, name: "Catupiry", price: 9, sort_order: 2 },
        { tenant_id: tenant.id, name: "Cheddar", price: 9, sort_order: 3 },
      ])}
    `;

    return { tenantId: tenant.id };
  });

  console.log(`
✓ Pizzaria criada! (${tenantId})

  Cardápio do cliente : /${slug}
  Painel              : /admin
  Login               : ${emailNormalized}

  Próximo passo: entrar no painel e cadastrar os sabores com os preços.
`);
} catch (error) {
  die(error.message);
} finally {
  await sql.end();
}
