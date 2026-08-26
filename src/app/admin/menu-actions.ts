"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Tabelas que o painel pode editar — lista fechada, nunca vem do cliente livre. */
const EDITABLE = [
  "categories",
  "sizes",
  "flavors",
  "crusts",
  "addons",
  "products",
  "price_groups",
] as const;
type Editable = (typeof EDITABLE)[number];

function revalidateAll(slug: string) {
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${slug}`, "layout");
}

const priceSchema = z.coerce.number().min(0).max(9999);
const uuid = z.string().uuid();

const flavorSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome do sabor."),
  description: z.string().trim().max(300).optional().default(""),
  categoryId: uuid.nullable().optional(),
  /** faixa de preço; null = o sabor tem preço próprio */
  priceGroupId: uuid.nullable().optional(),
  isSweet: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  /**
   * { [size_id]: preço } — exceções à faixa, não a tabela inteira.
   *
   * Com grupo, o que estiver aqui passa por cima do preço da faixa naquele
   * tamanho; em branco, vale a faixa. Sem grupo, é o preço do sabor e ponto —
   * sem preço, ele não aparece naquele tamanho.
   */
  prices: z.record(uuid, priceSchema.nullable()),
});

export async function saveFlavor(
  input: z.input<typeof flavorSchema>,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = flavorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const tenantId = session.tenant.id;

  try {
    await sql.begin(async (tx) => {
      // O id do grupo chega do navegador, e a chave estrangeira só garante que
      // ele existe — não que é desta pizzaria. Sem esta conferência, um id de
      // outra loja colaria o sabor na tabela de preços dela.
      if (data.priceGroupId) {
        const dono = await tx`
          select 1 from price_groups
          where id = ${data.priceGroupId} and tenant_id = ${tenantId}
        `;
        if (!dono[0]) throw new Error("grupo_invalido");
      }

      let flavorId = data.id;

      if (flavorId) {
        const rows = await tx`
          update flavors set
            name = ${data.name},
            description = ${data.description || null},
            category_id = ${data.categoryId ?? null},
            price_group_id = ${data.priceGroupId ?? null},
            is_sweet = ${data.isSweet},
            is_active = ${data.isActive}
          where id = ${flavorId} and tenant_id = ${tenantId}
          returning id
        `;
        if (!rows[0]) throw new Error("not_found");
      } else {
        const rows = await tx`
          insert into flavors (tenant_id, name, description, category_id,
                               price_group_id, is_sweet, is_active)
          values (
            ${tenantId}, ${data.name}, ${data.description || null},
            ${data.categoryId ?? null}, ${data.priceGroupId ?? null},
            ${data.isSweet}, ${data.isActive}
          )
          returning id
        `;
        flavorId = rows[0].id as string;
      }

      // Preços: grava os informados, apaga os que ficaram em branco.
      for (const [sizeId, price] of Object.entries(data.prices)) {
        if (price == null) {
          await tx`
            delete from flavor_prices
            where flavor_id = ${flavorId} and size_id = ${sizeId}
          `;
        } else {
          await tx`
            insert into flavor_prices (flavor_id, size_id, price)
            values (${flavorId}, ${sizeId}, ${price})
            on conflict (flavor_id, size_id) do update set price = excluded.price
          `;
        }
      }
    });
  } catch (error) {
    if ((error as Error).message === "not_found") {
      return { ok: false, error: "Sabor não encontrado." };
    }
    if ((error as Error).message === "grupo_invalido") {
      return { ok: false, error: "A faixa de preço escolhida não existe." };
    }
    console.error("Falha ao salvar sabor", error);
    return { ok: false, error: "Não foi possível salvar o sabor." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

const simpleSchema = z.object({
  table: z.enum(["crusts", "addons"]),
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome."),
  price: priceSchema,
  isActive: z.boolean().optional().default(true),
});

/** Bordas e adicionais têm a mesma forma: nome + preço. */
export async function saveSimpleItem(
  input: z.input<typeof simpleSchema>,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = simpleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { table, id, name, price, isActive } = parsed.data;

  try {
    if (id) {
      await sql`
        update ${sql(table)} set name = ${name}, price = ${price}, is_active = ${isActive}
        where id = ${id} and tenant_id = ${session.tenant.id}
      `;
    } else {
      await sql`
        insert into ${sql(table)} (tenant_id, name, price, is_active)
        values (${session.tenant.id}, ${name}, ${price}, ${isActive})
      `;
    }
  } catch (error) {
    console.error("Falha ao salvar item", error);
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

const productSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome."),
  description: z.string().trim().max(300).optional().default(""),
  price: priceSchema,
  categoryId: uuid.nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function saveProduct(
  input: z.input<typeof productSchema>,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      await sql`
        update products set
          name = ${data.name},
          description = ${data.description || null},
          price = ${data.price},
          category_id = ${data.categoryId ?? null},
          is_active = ${data.isActive}
        where id = ${data.id} and tenant_id = ${session.tenant.id}
      `;
    } else {
      await sql`
        insert into products (tenant_id, kind, name, description, price, category_id, is_active)
        values (
          ${session.tenant.id}, 'simple', ${data.name},
          ${data.description || null}, ${data.price},
          ${data.categoryId ?? null}, ${data.isActive}
        )
      `;
    }
  } catch (error) {
    console.error("Falha ao salvar produto", error);
    return { ok: false, error: "Não foi possível salvar o item." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

const sizeSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Informe o nome do tamanho."),
  slices: z.coerce.number().int().min(0).max(30).nullable().optional(),
  maxFlavors: z.coerce.number().int().min(1).max(4),
  isActive: z.boolean().optional().default(true),
});

export async function saveSize(
  input: z.input<typeof sizeSchema>,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = sizeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      await sql`
        update sizes set
          name = ${data.name},
          slices = ${data.slices ?? null},
          max_flavors = ${data.maxFlavors},
          is_active = ${data.isActive}
        where id = ${data.id} and tenant_id = ${session.tenant.id}
      `;
    } else {
      await sql`
        insert into sizes (tenant_id, name, slices, max_flavors, is_active)
        values (
          ${session.tenant.id}, ${data.name}, ${data.slices ?? null},
          ${data.maxFlavors}, ${data.isActive}
        )
      `;
    }
  } catch (error) {
    console.error("Falha ao salvar tamanho", error);
    return { ok: false, error: "Não foi possível salvar o tamanho." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

const categorySchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome da categoria."),
  isActive: z.boolean().optional().default(true),
});

export async function saveCategory(
  input: z.input<typeof categorySchema>,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      await sql`
        update categories set name = ${data.name}, is_active = ${data.isActive}
        where id = ${data.id} and tenant_id = ${session.tenant.id}
      `;
    } else {
      await sql`
        insert into categories (tenant_id, name, is_active)
        values (${session.tenant.id}, ${data.name}, ${data.isActive})
      `;
    }
  } catch (error) {
    console.error("Falha ao salvar categoria", error);
    return { ok: false, error: "Não foi possível salvar a categoria." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

export async function setItemActive(
  table: Editable,
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!EDITABLE.includes(table)) return { ok: false, error: "Tabela inválida." };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Item inválido." };

  await sql`
    update ${sql(table)} set is_active = ${isActive}
    where id = ${id} and tenant_id = ${session.tenant.id}
  `;

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

/**
 * Some com o item do cardápio.
 *
 * Desativar é o padrão recomendado: o pedido antigo guarda o nome em snapshot,
 * mas apagar um sabor leva junto os preços dele.
 */
export async function deleteItem(table: Editable, id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!EDITABLE.includes(table)) return { ok: false, error: "Tabela inválida." };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Item inválido." };

  try {
    await sql`
      delete from ${sql(table)} where id = ${id} and tenant_id = ${session.tenant.id}
    `;
  } catch (error) {
    console.error("Falha ao excluir item", error);
    return { ok: false, error: "Não foi possível excluir." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

// ------------------------------------------------------- faixas de preço

const groupSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome da faixa."),
  isActive: z.boolean().optional().default(true),
  /** { [size_id]: preço } — sem preço, a faixa não cobre aquele tamanho */
  prices: z.record(uuid, priceSchema.nullable()),
});

/**
 * Cria ou atualiza uma faixa de preço.
 *
 * Mexer no preço daqui move todos os sabores da faixa de uma vez — que é o
 * motivo de ela existir. Quem tem preço próprio no mesmo tamanho não se move:
 * exceção continua exceção.
 */
export async function savePriceGroup(
  input: z.input<typeof groupSchema>,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const tenantId = session.tenant.id;

  try {
    await sql.begin(async (tx) => {
      let groupId = data.id;

      if (groupId) {
        const rows = await tx`
          update price_groups
          set name = ${data.name}, is_active = ${data.isActive}
          where id = ${groupId} and tenant_id = ${tenantId}
          returning id
        `;
        if (!rows[0]) throw new Error("not_found");
      } else {
        const rows = await tx`
          insert into price_groups (tenant_id, name, is_active)
          values (${tenantId}, ${data.name}, ${data.isActive})
          returning id
        `;
        groupId = rows[0].id as string;
      }

      for (const [sizeId, price] of Object.entries(data.prices)) {
        if (price == null) {
          await tx`
            delete from price_group_prices
            where group_id = ${groupId} and size_id = ${sizeId}
          `;
        } else {
          await tx`
            insert into price_group_prices (group_id, size_id, price)
            values (${groupId}, ${sizeId}, ${price})
            on conflict (group_id, size_id) do update set price = excluded.price
          `;
        }
      }
    });
  } catch (error) {
    if ((error as Error).message === "not_found") {
      return { ok: false, error: "Faixa não encontrada." };
    }
    console.error("Falha ao salvar faixa de preço", error);
    return { ok: false, error: "Não foi possível salvar a faixa." };
  }

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

// -------------------------------------------------------------- fotos

/** Tipos que o navegador gera e a tela do cliente aguenta bem. */
const TIPOS_FOTO = ["image/webp", "image/png", "image/jpeg"] as const;
/** Depois do redimensionamento no navegador, 300 KB é folga larga. */
const LIMITE_FOTO = 300 * 1024;

const ALVOS = { sabor: "flavors", produto: "products" } as const;
type AlvoFoto = keyof typeof ALVOS;

/**
 * Guarda a foto de um sabor ou produto.
 *
 * A imagem chega como data URI já reduzida pelo navegador. Validamos de novo
 * aqui — tipo e tamanho — porque o navegador é do cliente e pode mentir sobre
 * as duas coisas.
 */
export async function uploadFoto(
  alvo: AlvoFoto,
  id: string,
  dataUri: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!(alvo in ALVOS)) return { ok: false, error: "Alvo inválido." };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Item inválido." };

  const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
  if (!match) return { ok: false, error: "Arquivo de imagem inválido." };

  const [, tipo, base64] = match;
  if (!TIPOS_FOTO.includes(tipo as (typeof TIPOS_FOTO)[number])) {
    return { ok: false, error: "Use uma imagem PNG, JPG ou WebP." };
  }

  // base64 ocupa ~4/3 do binário: comparamos o tamanho real.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > LIMITE_FOTO) {
    return { ok: false, error: "A imagem ficou grande demais. Tente uma menor." };
  }

  const rows = await sql`
    update ${sql(ALVOS[alvo])}
    set image_data = ${dataUri}, image_type = ${tipo}
    where id = ${id} and tenant_id = ${session.tenant.id}
    returning id
  `;
  if (!rows[0]) return { ok: false, error: "Item não encontrado." };

  revalidateAll(session.tenant.slug);
  return { ok: true };
}

export async function removeFoto(
  alvo: AlvoFoto,
  id: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!(alvo in ALVOS)) return { ok: false, error: "Alvo inválido." };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Item inválido." };

  await sql`
    update ${sql(ALVOS[alvo])}
    set image_data = null, image_type = null
    where id = ${id} and tenant_id = ${session.tenant.id}
  `;

  revalidateAll(session.tenant.slug);
  return { ok: true };
}
