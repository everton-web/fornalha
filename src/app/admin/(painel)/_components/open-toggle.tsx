"use client";

import { useTransition } from "react";

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

      <select
        value={override === null ? "auto" : override ? "open" : "closed"}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          apply(v === "auto" ? null : v === "open");
        }}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs outline-none"
        aria-label="Controle de abertura"
      >
        <option value="auto">Seguir horário</option>
        <option value="open">Forçar aberto</option>
        <option value="closed">Forçar fechado</option>
      </select>
    </div>
  );
}
