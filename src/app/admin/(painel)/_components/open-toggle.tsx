"use client";

import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setOpenOverride } from "../../actions";

/**
 * Fechar a loja com um toque — cozinha lotada, falta de massa, o que for.
 * "Automático" devolve o controle ao horário cadastrado.
 */
export function OpenToggle({
  openNow,
  override,
}: {
  openNow: boolean;
  override: boolean | null;
}) {
  const [pending, startTransition] = useTransition();

  function apply(value: boolean | null) {
    startTransition(async () => {
      await setOpenOverride(value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          openNow
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-stone-200 bg-stone-100 text-stone-600"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${openNow ? "bg-emerald-500" : "bg-stone-400"}`}
        />
        {openNow ? "Aberto" : "Fechado"}
        {override !== null && " (manual)"}
      </span>

      <Select
        value={override === null ? "auto" : override ? "open" : "closed"}
        disabled={pending}
        onValueChange={(v) => apply(v === "auto" ? null : v === "open")}
      >
        <SelectTrigger
          size="sm"
          className="rounded-full px-3 py-1.5 text-xs"
          aria-label="Controle de abertura"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Seguir horário</SelectItem>
          <SelectItem value="open">Forçar aberto</SelectItem>
          <SelectItem value="closed">Forçar fechado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
