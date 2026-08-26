import "server-only";

import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/**
 * Nascimento de uma pizzaria.
 *
 * Esta é a versão que vale: é a que a tela da agência usa, e é por ela que
 * toda pizzaria nova deve nascer.
 *
 * `scripts/nova-pizzaria.mjs` mantém uma cópia própria porque scripts .mjs não
 * importam TypeScript sem etapa de build. Mexeu no cardápio base aqui, mexa lá
 * também — ou a pizzaria criada pelo terminal nasce diferente da criada pela
 * tela. Quando o script deixar de ser necessário, ele sai e esta nota some.
 */

/** Cardápio base: o suficiente para o dono abrir o painel e já ter onde mexer. */
const TAMANHOS = [
  { name: "Pequena", slices: 4, max_flavors: 1, sort_order: 1 },
  { name: "Média", slices: 6, max_flavors: 2, sort_order: 2 },
  { name: "Grande", slices: 8, max_flavors: 3, sort_order: 3 },
];

const CATEGORIAS = [
  { name: "Pizzas salgadas", sort_order: 1 },
  { name: "Pizzas doces", sort_order: 2 },
  { name: "Bebidas", sort_order: 3 },
];

const BORDAS = [
  { name: "Sem borda recheada", price: 0, sort_order: 1 },
  { name: "Catupiry", price: 9, sort_order: 2 },
  { name: "Cheddar", price: 9, sort_order: 3 },
];

/** Faixas vazias: a pizzaria só preenche o preço e o cardápio inteiro anda. */
const FAIXAS = [
  { name: "Tradicionais", sort_order: 1 },
  { name: "Especiais", sort_order: 2 },
];

export class ProvisioningError extends Error {}

export type NovaPizzaria = {
  slug: string;
  nome: string;
  email: string;
  senha: string;
  cor?: string;
  whatsapp?: string;
};

/** Guarda o WhatsApp sempre com DDI, que é o formato que o link wa.me exige. */
export function normalizaWhatsapp(valor: string | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

export async function criarPizzaria(input: NovaPizzaria): Promise<{
  tenantId: string;
  slug: string;
  email: string;
}> {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ProvisioningError(
      "O endereço só pode ter letras minúsculas, números e hífen.",
    );
  }
  if (input.senha.length < 8) {
    throw new ProvisioningError("A senha precisa de pelo menos 8 caracteres.");
  }

  const [existente] = await sql`select id from tenants where slug = ${slug}`;
  if (existente) {
    throw new ProvisioningError(`Já existe uma pizzaria em /${slug}.`);
  }

  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.senha);
  const whats = normalizaWhatsapp(input.whatsapp);

  // Tudo numa transação: ou nasce completa, ou não nasce. Uma pizzaria sem
  // tamanhos é pior que nenhuma — o montador de pizza não abre.
  const { tenantId } = await sql.begin(async (tx) => {
    const [user] = await tx`
      insert into users (email, password_hash, name)
      values (${email}, ${passwordHash}, ${input.nome})
      on conflict (email) do update set password_hash = excluded.password_hash
      returning id
    `;

    const [tenant] = await tx`
      insert into tenants (slug, name, primary_color, whatsapp, opening_hours)
      values (
        ${slug}, ${input.nome}, ${input.cor || "#c81e1e"}, ${whats},
        ${tx.json(
          [2, 3, 4, 5, 6, 0].map((day) => ({
            day,
            open: "18:00",
            close: "23:30",
          })),
        )}
      )
      returning id
    `;

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${user.id}, 'owner')
      on conflict (tenant_id, user_id) do update set role = excluded.role
    `;

    await tx`
      insert into sizes ${tx(
        TAMANHOS.map((s) => ({ ...s, tenant_id: tenant.id as string })),
      )}
    `;
    await tx`
      insert into categories ${tx(
        CATEGORIAS.map((c) => ({ ...c, tenant_id: tenant.id as string })),
      )}
    `;
    await tx`
      insert into crusts ${tx(
        BORDAS.map((b) => ({ ...b, tenant_id: tenant.id as string })),
      )}
    `;
    await tx`
      insert into price_groups ${tx(
        FAIXAS.map((f) => ({ ...f, tenant_id: tenant.id as string })),
      )}
    `;

    return { tenantId: tenant.id as string };
  });

  return { tenantId, slug, email };
}

/** Troca a senha do dono — o pedido de suporte mais comum de todos. */
export async function redefinirSenhaDoDono(
  tenantId: string,
  novaSenha: string,
): Promise<string> {
  if (novaSenha.length < 8) {
    throw new ProvisioningError("A senha precisa de pelo menos 8 caracteres.");
  }

  const [dono] = await sql`
    select u.id, u.email from users u
    join tenant_members m on m.user_id = u.id
    where m.tenant_id = ${tenantId} and m.role = 'owner'
    order by u.created_at
    limit 1
  `;
  if (!dono) throw new ProvisioningError("Esta pizzaria não tem dono cadastrado.");

  await sql`
    update users set password_hash = ${await hashPassword(novaSenha)}
    where id = ${dono.id}
  `;

  // Sessões abertas com a senha antiga deixam de valer: trocar senha por
  // suporte costuma ser resposta a acesso indevido, e manter o intruso logado
  // esvaziaria o sentido da troca.
  await sql`delete from sessions where user_id = ${dono.id}`;

  return dono.email as string;
}
