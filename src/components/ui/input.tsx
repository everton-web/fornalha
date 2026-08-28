import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Ajustes ao padrão do shadcn, para caber na linguagem da Fornalha.
 *
 * O componente é nosso: no modelo do shadcn o código vem para dentro do
 * projeto em vez de virar dependência, e mexer nele é o uso pretendido — não
 * uma gambiarra. Melhor corrigir o padrão uma vez do que repetir a mesma
 * classe em cada formulário e ainda assim esquecer de algum.
 *
 * Três mudanças, e o resto (anel de foco, aria-invalid, estados de disabled)
 * fica como veio:
 *
 *   bg-transparent → bg-surface — o fundo da página é creme (#faf7f2) e o
 *   campo transparente sumia dentro dele. Todo formulário do painel usa campo
 *   branco sobre o creme; era assim antes do shadcn entrar.
 *
 *   h-9 → h-10, py-1 → py-2 — altura de toque. O painel é usado no celular,
 *   em cozinha, e 36px é menos que o mínimo confortável para o dedo.
 *
 *   rounded-md → rounded-xl — a curvatura dos campos do resto do sistema.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-surface px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
