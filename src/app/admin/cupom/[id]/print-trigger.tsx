"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <Button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-foreground text-background hover:bg-foreground/90"
    >
      <Printer className="size-4" />
      Imprimir
    </Button>
  );
}
