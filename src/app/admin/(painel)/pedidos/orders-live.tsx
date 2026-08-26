"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";

const INTERVALO_MS = 10_000;
/** Duas falhas seguidas antes de acusar queda: uma sozinha costuma ser soluço. */
const FALHAS_PARA_ALERTAR = 2;

type Status = {
  ativos: number;
  maisRecente: string | null;
};

/**
 * Mantém a tela de pedidos viva e, principalmente, honesta.
 *
 * Antes, a tela recarregava sozinha e parava em silêncio quando a internet
 * caía — dando a impressão de uma noite parada em vez de uma conexão morta.
 * Agora, cada batimento diz se chegou resposta: sem resposta, a faixa vermelha
 * aparece com a hora da última atualização e não sai até a rede voltar.
 */
export function OrdersLive({ activeCount }: { activeCount: number }) {
  const router = useRouter();

  const [online, setOnline] = useState(true);
  const [ultimaSync, setUltimaSync] = useState<Date>(() => new Date());
  const [entraramOffline, setEntraramOffline] = useState(0);

  const falhas = useRef(0);
  const conhecido = useRef<Status>({ ativos: activeCount, maisRecente: null });
  const audio = useRef<AudioContext | null>(null);
  const tituloOriginal = useRef<string>("");

  const tocarAlerta = useCallback(() => {
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
      // O navegador libera áudio só depois de um clique na página.
    }
  }, []);

  const bater = useCallback(async () => {
    try {
      const resposta = await fetch("/api/pedidos/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!resposta.ok) throw new Error(String(resposta.status));

      const status = (await resposta.json()) as Status;

      // Voltou depois de cair: conta o que entrou no intervalo e recarrega.
      if (falhas.current >= FALHAS_PARA_ALERTAR) {
        const novos = Math.max(0, status.ativos - conhecido.current.ativos);
        setEntraramOffline(novos);
        if (novos > 0) tocarAlerta();
        router.refresh();
      } else if (
        status.maisRecente &&
        status.maisRecente !== conhecido.current.maisRecente &&
        conhecido.current.maisRecente !== null
      ) {
        // Pedido novo em operação normal.
        tocarAlerta();
        router.refresh();
      }

      falhas.current = 0;
      conhecido.current = status;
      setOnline(true);
      setUltimaSync(new Date());
    } catch {
      falhas.current += 1;
      if (falhas.current >= FALHAS_PARA_ALERTAR) setOnline(false);
    }
  }, [router, tocarAlerta]);

  useEffect(() => {
    bater();
    const id = setInterval(bater, INTERVALO_MS);

    // Voltar para a aba é o momento mais provável de ter perdido alguma coisa.
    const aoVoltar = () => document.visibilityState === "visible" && bater();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", bater);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", bater);
    };
  }, [bater]);

  // O aviso precisa aparecer mesmo com a aba em segundo plano.
  useEffect(() => {
    if (!tituloOriginal.current) tituloOriginal.current = document.title;
    document.title = online
      ? activeCount > 0
        ? `(${activeCount}) ${tituloOriginal.current}`
        : tituloOriginal.current
      : `⚠ Sem conexão — ${tituloOriginal.current}`;
  }, [online, activeCount]);

  const hora = ultimaSync.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!online) {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3"
      >
        <CloudOff className="size-5 shrink-0 text-red-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-900">
            Sem conexão — esta tela parou às {hora}
          </p>
          <p className="text-sm text-red-800">
            Os pedidos continuam entrando e nada se perde. Acompanhe pelo celular
            usando os dados móveis até a internet voltar.
          </p>
        </div>
        <button
          type="button"
          onClick={bater}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100"
        >
          <RefreshCw className="size-3.5" />
          Tentar agora
        </button>
      </div>
    );
  }

  if (entraramOffline > 0) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3">
        <Wifi className="size-5 shrink-0 text-emerald-700" />
        <p className="min-w-0 flex-1 text-sm text-emerald-900">
          <strong className="font-semibold">Conexão restabelecida.</strong>{" "}
          {entraramOffline === 1
            ? "1 pedido entrou enquanto a tela estava fora do ar."
            : `${entraramOffline} pedidos entraram enquanto a tela estava fora do ar.`}
        </p>
        <button
          type="button"
          onClick={() => setEntraramOffline(0)}
          className="rounded-full border border-emerald-300 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Entendi
        </button>
      </div>
    );
  }

  return null;
}
