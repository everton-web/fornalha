"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Repuxa o status a cada 20s enquanto o pedido está em andamento.
 * Simples de propósito: uma página aberta na mesa não justifica
 * manter uma conexão realtime viva.
 */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
