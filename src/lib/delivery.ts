import "server-only";

import { num, sql } from "@/lib/db";
import type { Tenant } from "@/lib/types";

export type DeliveryArea = {
  id: string;
  district: string;
  city: string | null;
  fee: number;
};

/**
 * Bairros comparáveis: "Vila Madalena", "vila madalena" e "VILA MADALENA"
 * são o mesmo lugar, e o acento não pode decidir o preço da entrega.
 */
function chave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // tira os acentos separados pelo NFD
    .trim()
    .toLowerCase();
}

export async function listAreas(tenantId: string): Promise<DeliveryArea[]> {
  const rows = await sql`
    select id, district, city, fee from delivery_zones
    where tenant_id = ${tenantId} and district is not null
    order by district
  `;
  return rows.map((r) => ({
    id: r.id as string,
    district: r.district as string,
    city: (r.city as string) ?? null,
    fee: num(r.fee),
  }));
}

export type FeeResult =
  | { status: "ok"; fee: number; district: string }
  | { status: "default"; fee: number }
  | { status: "outside" };

/**
 * Quanto custa entregar num bairro.
 *
 * Sem nenhum bairro cadastrado, a pizzaria segue no modelo antigo de taxa
 * única — ninguém é obrigado a configurar área para continuar vendendo.
 * Com bairros cadastrados e um endereço fora deles, a loja decide entre
 * recusar ou cobrar a taxa padrão.
 */
export async function feeForDistrict(
  tenant: Tenant,
  district: string,
): Promise<FeeResult> {
  const areas = await listAreas(tenant.id);
  if (areas.length === 0) return { status: "default", fee: tenant.delivery_fee };

  const alvo = chave(district);
  const achou = areas.find((a) => chave(a.district) === alvo);
  if (achou) return { status: "ok", fee: achou.fee, district: achou.district };

  return tenant.refuse_outside_zones
    ? { status: "outside" }
    : { status: "default", fee: tenant.delivery_fee };
}
