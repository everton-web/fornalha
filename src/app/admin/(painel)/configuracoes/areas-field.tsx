"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

import type { DeliveryArea } from "@/lib/delivery";
import { money } from "@/lib/format";

import { deleteArea, saveArea, setRefuseOutside } from "../../delivery-actions";

export function AreasField({
  areas,
  taxaPadrao,
  refuseOutside,
  canEdit,
}: {
  areas: DeliveryArea[];
  taxaPadrao: number;
  refuseOutside: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [novoBairro, setNovoBairro] = useState("");
  const [novaTaxa, setNovaTaxa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function adicionar() {
    setErro(null);
    startTransition(async () => {
      const r = await saveArea({
        district: novoBairro,
        fee: Number(novaTaxa.replace(",", ".") || 0),
      });
      if (!r.ok) return setErro(r.error);
      setNovoBairro("");
      setNovaTaxa("");
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Cadastre o quanto custa entregar em cada bairro. O cliente digita o CEP
        no pedido e a taxa aparece sozinha.
      </p>

      {areas.length === 0 ? (
        <p className="rounded-xl bg-background px-3 py-2.5 text-sm text-muted-foreground">
          Nenhum bairro cadastrado. Enquanto for assim, toda entrega custa a taxa
          única de <strong className="text-foreground">{money(taxaPadrao)}</strong>.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {areas.map((area) => (
            <AreaRow key={area.id} area={area} canEdit={canEdit} />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1">
          <span className="mb-1 block text-xs font-medium text-stone-500">Bairro</span>
          <input
            value={novoBairro}
            onChange={(e) => setNovoBairro(e.target.value)}
            placeholder="Vila Madalena"
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400"
          />
        </label>
        <label className="w-28">
          <span className="mb-1 block text-xs font-medium text-stone-500">Taxa</span>
          <input
            value={novaTaxa}
            onChange={(e) => setNovaTaxa(e.target.value)}
            placeholder="8,00"
            inputMode="decimal"
            className="w-full rounded-lg border border-line bg-background px-2.5 py-2 text-sm outline-none focus:border-stone-400"
          />
        </label>
        <button
          type="button"
          disabled={!canEdit || pending || novoBairro.trim().length < 2}
          onClick={adicionar}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      {areas.length > 0 && (
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={refuseOutside}
            disabled={!canEdit || pending}
            onChange={(e) =>
              startTransition(async () => {
                await setRefuseOutside(e.target.checked);
                router.refresh();
              })
            }
            className="mt-0.5 size-4"
          />
          <span>
            Recusar endereço fora desses bairros
            <span className="block text-xs text-muted-foreground">
              Desmarcado, o pedido é aceito e cobra a taxa única de{" "}
              {money(taxaPadrao)}.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

function AreaRow({ area, canEdit }: { area: DeliveryArea; canEdit: boolean }) {
  const router = useRouter();
  const [taxa, setTaxa] = useState(area.fee.toString());
  const [pending, startTransition] = useTransition();
  const mudou = Number(taxa.replace(",", ".")) !== area.fee;

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className="flex-1 truncate text-sm font-medium">{area.district}</span>

      <input
        value={taxa}
        onChange={(e) => setTaxa(e.target.value)}
        inputMode="decimal"
        disabled={!canEdit}
        className="w-20 rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-stone-400"
      />

      {mudou && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await saveArea({
                id: area.id,
                district: area.district,
                fee: Number(taxa.replace(",", ".")),
              });
              router.refresh();
            })
          }
          className="grid size-8 place-items-center rounded-full bg-foreground text-white"
          aria-label="Salvar taxa"
        >
          <Check className="size-3.5" />
        </button>
      )}

      <button
        type="button"
        disabled={!canEdit || pending}
        onClick={() =>
          startTransition(async () => {
            await deleteArea(area.id);
            router.refresh();
          })
        }
        className="grid size-8 place-items-center rounded-full border border-line text-muted-foreground transition hover:border-red-300 hover:text-red-600"
        aria-label={`Remover ${area.district}`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
