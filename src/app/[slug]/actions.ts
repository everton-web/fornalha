"use server";

import { z } from "zod";

import { lookupCep } from "@/lib/cep";
import { sql } from "@/lib/db";
import { feeForDistrict } from "@/lib/delivery";
import { formatPhone, onlyDigits } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { getMenu } from "@/lib/menu";
import { PricingError, summarize } from "@/lib/pricing";
import type { PaymentMethod } from "@/lib/types";
import { generateOrderCode } from "@/lib/utils";

const cartItemSchema = z.discriminatedUnion("kind", [
  z.object({
    uid: z.string(),
    kind: z.literal("pizza"),
    sizeId: z.string().uuid(),
    flavorIds: z.array(z.string().uuid()).min(1).max(4),
    crustId: z.string().uuid().nullable(),
    addonIds: z.array(z.string().uuid()).max(10),
    quantity: z.number().int().min(1).max(20),
    notes: z.string().max(200).optional(),
  }),
  z.object({
    uid: z.string(),
    kind: z.literal("simple"),
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
    notes: z.string().max(200).optional(),
  }),
]);

const checkoutSchema = z.object({
  slug: z.string().min(1),
  items: z.array(cartItemSchema).min(1, "Seu carrinho está vazio.").max(40),
  name: z.string().trim().min(2, "Informe seu nome."),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido."),
  deliveryType: z.enum(["delivery", "pickup"]),
  street: z.string().trim().max(120).optional().default(""),
  number: z.string().trim().max(20).optional().default(""),
  complement: z.string().trim().max(60).optional().default(""),
  district: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  zip: z.string().trim().max(12).optional().default(""),
  reference: z.string().trim().max(120).optional().default(""),
  paymentMethod: z.enum([
    "cash",
    "card_delivery",
    "pix_manual",
    "pix_online",
    "card_online",
  ]),
  changeFor: z.number().nonnegative().nullable().optional(),
  notes: z.string().trim().max(300).optional().default(""),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type AddressLookup =
  | {
      ok: true;
      street: string;
      district: string;
      city: string;
      /** null quando a pizzaria não entrega nesse bairro */
      fee: number | null;
      /** nome do bairro como a pizzaria cadastrou, quando bate com uma área */
      matchedArea: string | null;
    }
  | { ok: false; error: string };

/**
 * Busca o endereço do CEP e já devolve quanto custa entregar ali.
 *
 * A taxa sai daqui e não do navegador — o mesmo cálculo roda de novo ao
 * fechar o pedido, então mexer nisto pelo console não muda o que se paga.
 */
export async function lookupAddress(
  slug: string,
  cep: string,
): Promise<AddressLookup> {
  const menu = await getMenu(slug);
  if (!menu) return { ok: false, error: "Pizzaria indisponível." };

  const endereco = await lookupCep(cep);
  if (!endereco) {
    return { ok: false, error: "CEP não encontrado. Preencha o endereço na mão." };
  }

  const taxa = await feeForDistrict(menu.tenant, endereco.district);

  return {
    ok: true,
    street: endereco.street,
    district: endereco.district,
    city: endereco.city,
    fee: taxa.status === "outside" ? null : taxa.fee,
    matchedArea: taxa.status === "ok" ? taxa.district : null,
  };
}

export type CheckoutResult =
  | { ok: true; code: string; token: string }
  | { ok: false; error: string };

/**
 * Fecha o pedido.
 *
 * Nada que veio do navegador é usado como preço: o carrinho traz IDs,
 * o servidor recalcula com o cardápio atual e grava o resultado congelado.
 */
export async function createOrder(raw: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input = parsed.data;

  const menu = await getMenu(input.slug);
  if (!menu) return { ok: false, error: "Pizzaria indisponível." };
  const { tenant } = menu;

  if (!isOpenNow(tenant)) {
    return { ok: false, error: "A pizzaria está fechada no momento." };
  }
  if (input.deliveryType === "delivery" && !tenant.delivery_enabled) {
    return { ok: false, error: "Esta pizzaria não faz entrega." };
  }
  if (input.deliveryType === "pickup" && !tenant.pickup_enabled) {
    return { ok: false, error: "Esta pizzaria não aceita retirada." };
  }
  if (input.deliveryType === "delivery" && (!input.street || !input.number)) {
    return { ok: false, error: "Informe o endereço de entrega." };
  }
  if (!isPaymentAllowed(input.paymentMethod, tenant)) {
    return { ok: false, error: "Forma de pagamento indisponível." };
  }

  // A taxa é recalculada aqui, a partir do bairro informado: o que veio da
  // tela serve para mostrar, nunca para cobrar.
  let deliveryFee = tenant.delivery_fee;
  if (input.deliveryType === "delivery") {
    // O CEP manda, não o campo de bairro: o cliente pode digitar o bairro que
    // quiser, mas o CEP é conferível na base dos Correios.
    const porCep = await lookupCep(input.zip);
    const bairro = porCep?.district || input.district || "";
    const taxa = await feeForDistrict(tenant, bairro);

    if (taxa.status === "outside") {
      return {
        ok: false,
        error: "Esse endereço está fora da nossa área de entrega.",
      };
    }
    deliveryFee = taxa.fee;
  }

  let summary;
  try {
    summary = summarize(menu, input.items, input.deliveryType, deliveryFee);
  } catch (error) {
    if (error instanceof PricingError) return { ok: false, error: error.message };
    throw error;
  }

  if (summary.subtotal < tenant.min_order_value) {
    return {
      ok: false,
      error: `O pedido mínimo é de R$ ${tenant.min_order_value.toFixed(2).replace(".", ",")}.`,
    };
  }
  if (
    input.paymentMethod === "cash" &&
    input.changeFor &&
    input.changeFor < summary.total
  ) {
    return { ok: false, error: "O valor do troco é menor que o total do pedido." };
  }

  // O código curto é único por pizzaria; colisão é rara, mas acontece.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateOrderCode();

    try {
      const result = await sql.begin(async (tx) => {
        const [order] = await tx`
          insert into orders (
            tenant_id, code, customer_name, customer_phone, delivery_type,
            address_street, address_number, address_complement, address_district,
            address_city, address_zip, address_reference,
            payment_method, change_for, subtotal, delivery_fee, total, notes
          ) values (
            ${tenant.id}, ${code}, ${input.name}, ${formatPhone(input.phone)},
            ${input.deliveryType},
            ${input.street || null}, ${input.number || null},
            ${input.complement || null}, ${input.district || null},
            ${input.city || null}, ${input.zip || null}, ${input.reference || null},
            ${input.paymentMethod},
            ${input.paymentMethod === "cash" ? (input.changeFor ?? null) : null},
            ${summary.subtotal}, ${summary.deliveryFee}, ${summary.total},
            ${input.notes || null}
          )
          returning id, code, public_token
        `;

        await tx`
          insert into order_items ${tx(
            summary.items.map((item) => ({
              order_id: order.id as string,
              kind: item.kind,
              title: item.title,
              // sql.json marca o valor como JSON; JSON.stringify aqui gravaria
              // uma string escapada dentro do jsonb, e o snapshot viraria texto morto.
              details: tx.json(item.details),
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice,
              notes: item.notes ?? null,
            })),
          )}
        `;

        return order;
      });

      return {
        ok: true,
        code: result.code as string,
        token: result.public_token as string,
      };
    } catch (error) {
      // 23505 = unique_violation: o código sorteado já existe, tenta outro
      if ((error as { code?: string }).code === "23505") continue;
      console.error("Falha ao criar pedido", error);
      return {
        ok: false,
        error: "Não foi possível registrar o pedido. Tente de novo.",
      };
    }
  }

  return { ok: false, error: "Não foi possível gerar o código do pedido." };
}

function isPaymentAllowed(
  method: PaymentMethod,
  tenant: {
    accepts_cash: boolean;
    accepts_card_delivery: boolean;
    accepts_pix_manual: boolean;
    online_payment_enabled: boolean;
  },
): boolean {
  switch (method) {
    case "cash":
      return tenant.accepts_cash;
    case "card_delivery":
      return tenant.accepts_card_delivery;
    case "pix_manual":
      return tenant.accepts_pix_manual;
    case "pix_online":
    case "card_online":
      return tenant.online_payment_enabled;
  }
}
