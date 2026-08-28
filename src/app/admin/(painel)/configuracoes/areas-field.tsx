"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Campo
          label="Bairro"
          className="min-w-40 flex-1"
          value={novoBairro}
          onChange={(e) => setNovoBairro(e.target.value)}
          placeholder="Vila Madalena"
        />
        <Campo
          label="Taxa"
          className="w-28"
          value={novaTaxa}
          onChange={(e) => setNovaTaxa(e.target.value)}
          placeholder="8,00"
          inputMode="decimal"
        />
        <Button
          type="button"
          size="sm"
          disabled={!canEdit || pending || novoBairro.trim().length < 2}
          onClick={adicionar}
          className="rounded-full bg-foreground text-xs text-background hover:bg-foreground/90"
        >
          <Plus className="size-3.5" />
          Adicionar
        </Button>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      {areas.length > 0 && (
        <div className="mt-4 flex items-start gap-2 text-sm">
          <Checkbox
            id="recusar-fora"
            checked={refuseOutside}
            disabled={!canEdit || pending}
            onCheckedChange={(v) =>
              startTransition(async () => {
                await setRefuseOutside(v === true);
                router.refresh();
              })
            }
            className="mt-0.5"
          />
          <Label htmlFor="recusar-fora" className="block font-normal leading-snug">
            Recusar endereço fora desses bairros
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              Desmarcado, o pedido é aceito e cobra a taxa única de{" "}
              {money(taxaPadrao)}.
            </span>
          </Label>
        </div>
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

      <Input
        value={taxa}
        onChange={(e) => setTaxa(e.target.value)}
        inputMode="decimal"
        disabled={!canEdit}
        className="h-9 w-20 px-2 py-1.5 text-sm"
        aria-label={`Taxa de ${area.district}`}
      />

      {mudou && (
        <Button
          type="button"
          size="icon-sm"
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
          className="rounded-full bg-foreground text-background hover:bg-foreground/90"
          aria-label="Salvar taxa"
        >
          <Check className="size-3.5" />
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canEdit || pending}
        onClick={() =>
          startTransition(async () => {
            await deleteArea(area.id);
            router.refresh();
          })
        }
        className="rounded-full text-muted-foreground hover:border-red-300 hover:text-red-600"
        aria-label={`Remover ${area.district}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
