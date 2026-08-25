"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Link2, Trash2 } from "lucide-react";

import type { Tenant } from "@/lib/types";
import { logoSrc } from "@/lib/utils";

import { removeLogo, uploadLogo } from "../../settings-actions";

/** Lado maior da imagem depois do corte — suficiente para tela e impressão. */
const LADO = 512;

/**
 * Reduz a imagem no próprio navegador antes de enviar.
 *
 * Foto de celular tem vários megabytes; a logo aparece num círculo de 44px.
 * Cortamos no quadrado central e mandamos WebP, que é uma fração do tamanho.
 */
function prepararImagem(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Esse arquivo não é uma imagem."));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = LADO;
        canvas.height = LADO;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não consegui processar a imagem."));

        // Fundo branco: PNG com transparência vira preto em algumas impressoras.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, LADO, LADO);
        ctx.drawImage(
          img,
          (img.width - lado) / 2,
          (img.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          LADO,
          LADO,
        );

        resolve(canvas.toDataURL("image/webp", 0.9));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export function LogoField({
  tenant,
  urlValue,
  onUrlChange,
  canEdit,
}: {
  tenant: Tenant;
  urlValue: string;
  onUrlChange: (value: string) => void;
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const atual = preview ?? logoSrc(tenant) ?? (urlValue || null);

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);

    try {
      const dataUri = await prepararImagem(arquivo);
      setPreview(dataUri);

      startTransition(async () => {
        const r = await uploadLogo(dataUri);
        if (!r.ok) {
          setErro(r.error);
          setPreview(null);
          return;
        }
        onUrlChange("");
        router.refresh();
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui usar essa imagem.");
    }
  }

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-stone-500">Logo</span>

      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-background text-xl font-bold">
          {atual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={atual} alt="Logo atual" className="size-full object-cover" />
          ) : (
            tenant.name.charAt(0)
          )}
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => aoEscolher(e.target.files?.[0])}
        />

        <button
          type="button"
          disabled={!canEdit || pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-stone-300 disabled:opacity-40"
        >
          <ImageUp className="size-4" />
          {pending ? "Enviando…" : "Enviar imagem"}
        </button>

        {tenant.has_logo && (
          <button
            type="button"
            disabled={!canEdit || pending}
            onClick={() =>
              startTransition(async () => {
                await removeLogo();
                setPreview(null);
                router.refresh();
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm text-muted transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
            Remover
          </button>
        )}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          <Link2 className="size-3" />
          ou cole o endereço de uma imagem na internet
        </span>
        <input
          value={urlValue}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://..."
          disabled={tenant.has_logo}
          className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400 disabled:opacity-50"
        />
      </label>

      {tenant.has_logo && (
        <p className="mt-1 text-xs text-muted">
          Remova a imagem enviada para voltar a usar um endereço.
        </p>
      )}

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
