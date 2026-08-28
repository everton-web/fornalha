"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

import { sendTestPush, subscribeToPush, unsubscribeFromPush } from "../../push-actions";

type Estado = "carregando" | "indisponivel" | "negado" | "desligado" | "ligado";

/**
 * A chave pública do VAPID vem em base64url e o navegador espera bytes.
 * O ArrayBuffer é criado explicitamente porque a API de push não aceita
 * uma view sobre buffer compartilhado.
 */
function chaveParaBytes(base64: string): ArrayBuffer {
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binario = atob(preenchido.replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(binario.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return buffer;
}

/**
 * Liga e desliga o aviso de pedido novo neste aparelho.
 *
 * A permissão é por aparelho, não por conta: quem usa o painel no computador
 * do balcão e no celular precisa ligar nos dois.
 */
export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let ativo = true;

    async function verificar() {
      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (ativo) setEstado("indisponivel");
        return;
      }
      if (Notification.permission === "denied") {
        if (ativo) setEstado("negado");
        return;
      }

      try {
        const registro = await navigator.serviceWorker.register("/sw.js");
        const assinatura = await registro.pushManager.getSubscription();
        if (ativo) setEstado(assinatura ? "ligado" : "desligado");
      } catch {
        if (ativo) setEstado("indisponivel");
      }
    }

    verificar();
    return () => {
      ativo = false;
    };
  }, [vapidKey]);

  async function ligar() {
    setMensagem(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "desligado");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const assinatura = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(vapidKey),
      });

      const bruto = assinatura.toJSON();
      startTransition(async () => {
        const r = await subscribeToPush({
          endpoint: assinatura.endpoint,
          p256dh: bruto.keys?.p256dh ?? "",
          auth: bruto.keys?.auth ?? "",
          userAgent: navigator.userAgent.slice(0, 300),
        });

        if (!r.ok) {
          setMensagem(r.error);
          return;
        }
        setEstado("ligado");
        setMensagem("Avisos ligados neste aparelho.");
      });
    } catch {
      setMensagem("Não foi possível ativar os avisos neste aparelho.");
    }
  }

  async function desligar() {
    const registro = await navigator.serviceWorker.ready;
    const assinatura = await registro.pushManager.getSubscription();
    if (assinatura) {
      await assinatura.unsubscribe();
      startTransition(async () => {
        await unsubscribeFromPush(assinatura.endpoint);
        setEstado("desligado");
        setMensagem(null);
      });
    }
  }

  if (estado === "carregando" || estado === "indisponivel") return null;

  if (estado === "negado") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <BellOff className="mb-1 inline size-4" /> Os avisos estão bloqueados
        neste aparelho. Libere as notificações deste site nas configurações do
        navegador para voltar a receber.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {estado === "ligado" ? (
          <BellRing className="size-5 shrink-0 text-emerald-600" />
        ) : (
          <Bell className="size-5 shrink-0 text-muted-foreground" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {estado === "ligado"
              ? "Avisos ligados neste aparelho"
              : "Avisar quando entrar pedido"}
          </p>
          <p className="text-sm text-muted-foreground">
            {estado === "ligado"
              ? "Você recebe a notificação mesmo com o painel fechado."
              : "Receba a notificação no celular mesmo com o painel fechado."}
          </p>
        </div>

        {estado === "ligado" ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await sendTestPush();
                  setMensagem(r.ok ? "Aviso de teste enviado." : r.error);
                })
              }
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium transition hover:border-stone-300"
            >
              Testar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={desligar}
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-stone-300"
            >
              Desligar
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={ligar}
            className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Ligar avisos
          </button>
        )}
      </div>

      {mensagem && <p className="mt-2 text-xs text-muted-foreground">{mensagem}</p>}
    </div>
  );
}
