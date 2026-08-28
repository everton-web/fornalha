"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { removeFoto, uploadFoto } from "@/app/admin/menu-actions";
import { prepararImagemQuadrada } from "@/lib/browser-image";

/**
 * Lado da foto no cardápio.
 *
 * 600px cobre o maior tamanho que a vitrine usa hoje e ainda fica nítida numa
 * tela retina. Em WebP, cada foto sai por volta de 50 KB — sessenta sabores
 * cabem em uns 3 MB, que é o que justificou guardar no próprio banco.
 */
const LADO = 600;
const QUALIDADE = 0.82;

/**
 * Envio de foto de um sabor ou produto.
 *
 * Só aparece depois que o item existe: a foto precisa de um id para pendurar.
 * Enquanto o sabor é novo, o campo explica isso em vez de sumir sem motivo.
 */
export function FotoField({
  tipo,
  id,
  hasImage,
  nome,
}: {
  tipo: "sabor" | "produto";
  id: string | null;
  hasImage: boolean;
  nome: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!id) {
    return (
      <p className="text-xs text-muted-foreground">
        Salve o {tipo} para poder enviar uma foto.
      </p>
    );
  }

  const atual = preview ?? (hasImage ? `/api/foto/${tipo}/${id}` : null);

  async function aoEscolher(arquivo: File | undefined) {
    if (!arquivo || !id) return;
    setErro(null);

    try {
      const dataUri = await prepararImagemQuadrada(arquivo, LADO, QUALIDADE);
      setPreview(dataUri);

      startTransition(async () => {
        const r = await uploadFoto(tipo, id, dataUri);
        if (!r.ok) {
          setErro(r.error);
          setPreview(null);
          return;
        }
        router.refresh();
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui usar essa imagem.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-background">
          {atual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={atual}
              alt={`Foto de ${nome}`}
              className="size-full object-cover"
            />
          ) : (
            <ImageUp className="size-5 text-stone-400" />
          )}
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => aoEscolher(e.target.files?.[0])}
        />

        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="rounded-full px-3.5 py-1.5"
        >
          <ImageUp className="size-3.5" />
          {pending ? "Enviando…" : hasImage ? "Trocar foto" : "Enviar foto"}
        </Button>

        {hasImage && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeFoto(tipo, id);
                setPreview(null);
                router.refresh();
              })
            }
            className="rounded-full px-3 py-1.5 text-muted-foreground hover:border-red-300 hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
            Remover
          </Button>
        )}
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
