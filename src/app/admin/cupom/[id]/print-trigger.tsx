"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * Sem `asButton`, dispara a impressão sozinho ao abrir (é o modo usado quando
 * o pedido novo abre o cupom automaticamente). Com ele, vira só o botão.
 */
export function PrintTrigger({ asButton = false }: { asButton?: boolean }) {
  useEffect(() => {
    if (asButton) return;
    // Um quadro de atraso para a fonte e o layout assentarem antes do diálogo.
    const id = setTimeout(() => window.print(), 350);
    return () => clearTimeout(id);
  }, [asButton]);

  if (!asButton) return null;

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white"
    >
      <Printer className="size-4" />
      Imprimir
    </button>
  );
}
