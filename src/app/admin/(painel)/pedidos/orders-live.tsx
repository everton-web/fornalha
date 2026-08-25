"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantém a tela de pedidos viva.
 *
 * Recarrega a cada 12 segundos e toca um alerta quando aparece um pedido que
 * não estava na tela antes — é assim que a cozinha percebe sem olhar o tablet.
 */
export function OrdersLive({ newestOrderId }: { newestOrderId: string | null }) {
  const router = useRouter();
  const known = useRef<string | null>(newestOrderId);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 12_000);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (newestOrderId === known.current) return;
    known.current = newestOrderId;
    if (!newestOrderId) return;

    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // O navegador só libera áudio depois de um clique na página; sem som, tudo bem.
    }
  }, [newestOrderId]);

  return null;
}
