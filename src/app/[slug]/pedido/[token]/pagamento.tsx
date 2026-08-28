"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

import { money } from "@/lib/format";

type Props = {
  token: string;
  amount: number;
  pixCode: string | null;
  pixQrBase64: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
};

/** De quanto em quanto tempo a tela pergunta se o pagamento caiu. */
const INTERVALO_MS = 6_000;

/**
 * O painel que aparece enquanto o pedido não foi pago.
 *
 * Fica no topo da tela de acompanhamento de propósito: com o pagamento
 * pendente, essa é a única coisa que importa na página. Some sozinho quando o
 * pagamento confirma.
 */
export function PagamentoPendente({
  token,
  amount,
  pixCode,
  pixQrBase64,
  checkoutUrl,
  expiresAt,
}: Props) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState<number | null>(null);

  // Pergunta ao servidor, que pergunta ao gateway. É este ciclo que faz o Pix
  // ser reconhecido mesmo quando o aviso do gateway não chega.
  useEffect(() => {
    let vivo = true;

    async function conferir() {
      try {
        const resposta = await fetch("/api/pagamentos/conferir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!resposta.ok || !vivo) return;

        const dados = (await resposta.json()) as { status: string | null };
        if (vivo && dados.status && dados.status !== "pending") {
          router.refresh();
        }
      } catch {
        // Sem rede agora não quer dizer sem rede daqui a seis segundos.
      }
    }

    const id = setInterval(conferir, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [token, router]);

  // Contagem regressiva do Pix.
  useEffect(() => {
    if (!expiresAt) return;
    const alvo = new Date(expiresAt).getTime();

    function tick() {
      setRestante(Math.max(0, Math.floor((alvo - Date.now()) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const copiar = useCallback(async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Navegador sem permissão de área de transferência: o código continua
      // na tela, selecionável na mão.
    }
  }, [pixCode]);

  const expirado = restante !== null && restante === 0;

  return (
    <section className="mt-5 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5">
      <header className="flex items-center gap-2">
        <QrCode className="size-5 text-amber-700" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">
          Aguardando pagamento
        </h2>
      </header>

      <p className="mt-2 text-sm text-amber-900">
        {expirado
          ? "O prazo deste código acabou. Fale com a pizzaria para gerar outro."
          : `A pizzaria começa a preparar assim que o pagamento de ${money(amount)} for confirmado.`}
      </p>

      {pixCode && !expirado && (
        <div className="mt-4">
          {pixQrBase64 && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${pixQrBase64}`}
                alt="QR Code do Pix"
                width={192}
                height={192}
                className="size-48 rounded-2xl border border-amber-200 bg-white p-2"
              />
            </div>
          )}

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Pix copia e cola
          </p>
          <p className="mt-1 break-all rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-stone-700">
            {pixCode}
          </p>

          <Button
            type="button"
            size="pill"
            onClick={copiar}
            className="mt-3 w-full bg-amber-600 text-white hover:bg-amber-700"
          >
            {copiado ? (
              <>
                <Check className="size-4" /> Código copiado
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copiar código Pix
              </>
            )}
          </Button>
        </div>
      )}

      {checkoutUrl && !expirado && (
        <a
          href={checkoutUrl}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          <ExternalLink className="size-4" />
          Pagar com cartão
        </a>
      )}

      {restante !== null && !expirado && (
        <p className="mt-3 text-center text-xs text-amber-700">
          O código vale por mais {Math.floor(restante / 60)}min{" "}
          {String(restante % 60).padStart(2, "0")}s
        </p>
      )}

      <p className="mt-3 text-center text-xs text-amber-700">
        Esta tela se atualiza sozinha. Não precisa enviar comprovante.
      </p>
    </section>
  );
}
