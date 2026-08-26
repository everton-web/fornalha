"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireEscrita } from "@/lib/auth";
import { sql } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const areaSchema = z.object({
  id: z.string().uuid().optional(),
  district: z.string().trim().min(2, "Informe o bairro."),
  city: z.string().trim().max(80).optional().default(""),
  fee: z.coerce.number().min(0).max(999),
});

export async function saveArea(
  input: z.input<typeof areaSchema>,
): Promise<ActionResult> {
  const session = await requireEscrita();
  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode mudar a área de entrega." };
  }

  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, district, city, fee } = parsed.data;

  try {
    if (id) {
      await sql`
        update delivery_zones
        set district = ${district}, city = ${city || null}, fee = ${fee}
        where id = ${id} and tenant_id = ${session.tenant.id}
      `;
    } else {
      await sql`
        insert into delivery_zones (tenant_id, district, city, fee)
        values (${session.tenant.id}, ${district}, ${city || null}, ${fee})
      `;
    }
  } catch (error) {
    console.error("Falha ao salvar área de entrega", error);
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath(`/${session.tenant.slug}`, "layout");
  return { ok: true };
}

export async function deleteArea(id: string): Promise<ActionResult> {
  const session = await requireEscrita();
  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode mudar a área de entrega." };
  }
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Área inválida." };
  }

  await sql`
    delete from delivery_zones where id = ${id} and tenant_id = ${session.tenant.id}
  `;

  revalidatePath("/admin/configuracoes");
  revalidatePath(`/${session.tenant.slug}`, "layout");
  return { ok: true };
}

/** Recusar endereço fora dos bairros cadastrados, ou cobrar a taxa padrão. */
export async function setRefuseOutside(value: boolean): Promise<ActionResult> {
  const session = await requireEscrita();
  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode mudar a área de entrega." };
  }

  await sql`
    update tenants set refuse_outside_zones = ${value} where id = ${session.tenant.id}
  `;

  revalidatePath("/admin/configuracoes");
  revalidatePath(`/${session.tenant.slug}`, "layout");
  return { ok: true };
}
