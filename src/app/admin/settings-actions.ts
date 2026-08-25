"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { onlyDigits } from "@/lib/format";

export type ActionResult = { ok: true } | { ok: false; error: string };

const hourSchema = z.object({
  day: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da pizzaria."),
  tagline: z.string().trim().max(120).optional().default(""),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)."),
  phone: z.string().trim().max(30).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  logoUrl: z.string().trim().url("URL do logo inválida.").or(z.literal("")).optional(),
  prepTimeMin: z.coerce.number().int().min(5).max(240),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryFee: z.coerce.number().min(0).max(999),
  minOrderValue: z.coerce.number().min(0).max(9999),
  acceptsCash: z.boolean(),
  acceptsCardDelivery: z.boolean(),
  acceptsPixManual: z.boolean(),
  pixKey: z.string().trim().max(120).optional().default(""),
  halfPricing: z.enum(["max", "avg"]),
  openingHours: z.array(hourSchema).max(21),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const session = await requireSession();

  if (session.role !== "owner") {
    return { ok: false, error: "Só o dono pode mudar as configurações." };
  }

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  if (!data.deliveryEnabled && !data.pickupEnabled) {
    return { ok: false, error: "Deixe pelo menos entrega ou retirada ativa." };
  }
  if (!data.acceptsCash && !data.acceptsCardDelivery && !data.acceptsPixManual) {
    return { ok: false, error: "Deixe pelo menos uma forma de pagamento ativa." };
  }

  // O WhatsApp entra no link wa.me, que exige DDI: 55 + DDD + número.
  const whatsappDigits = onlyDigits(data.whatsapp);
  const whatsapp = whatsappDigits
    ? whatsappDigits.startsWith("55")
      ? whatsappDigits
      : `55${whatsappDigits}`
    : null;

  try {
    await sql`
      update tenants set
        name = ${data.name},
        tagline = ${data.tagline || null},
        primary_color = ${data.primaryColor},
        phone = ${data.phone || null},
        whatsapp = ${whatsapp},
        address = ${data.address || null},
        logo_url = ${data.logoUrl || null},
        prep_time_min = ${data.prepTimeMin},
        delivery_enabled = ${data.deliveryEnabled},
        pickup_enabled = ${data.pickupEnabled},
        delivery_fee = ${data.deliveryFee},
        min_order_value = ${data.minOrderValue},
        accepts_cash = ${data.acceptsCash},
        accepts_card_delivery = ${data.acceptsCardDelivery},
        accepts_pix_manual = ${data.acceptsPixManual},
        pix_key = ${data.pixKey || null},
        half_pricing = ${data.halfPricing},
        opening_hours = ${sql.json(data.openingHours)}
      where id = ${session.tenant.id}
    `;
  } catch (error) {
    console.error("Falha ao salvar configurações", error);
    return { ok: false, error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/admin", "layout");
  revalidatePath(`/${session.tenant.slug}`, "layout");
  return { ok: true };
}
