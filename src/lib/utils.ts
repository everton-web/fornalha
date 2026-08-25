import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Código curto e legível do pedido: A4K9 (sem 0/O/1/I para não confundir). */
export function generateOrderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Onde buscar a logo da pizzaria: a enviada pelo painel tem prioridade sobre
 * a URL colada, porque é a mais recente que o dono mexeu.
 */
export function logoSrc(tenant: {
  slug: string;
  logo_url: string | null;
  has_logo: boolean;
}): string | null {
  if (tenant.has_logo) return `/api/logo/${tenant.slug}`;
  return tenant.logo_url;
}

/**
 * Link que abre o endereço no aplicativo de mapas.
 *
 * Este formato do Google Maps é entendido pelo app nativo no Android e no
 * iPhone, e cai no site quando aberto no computador — um link só resolve os
 * três casos, sem chave de API nem mapa embutido pesando na página.
 */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
