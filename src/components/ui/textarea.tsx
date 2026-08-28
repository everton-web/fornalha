import * as React from "react"

/*
 * Mesmos ajustes do Input, e pelo mesmo motivo: o fundo da página é creme
 * (#faf7f2) e `bg-transparent` fazia o campo sumir dentro dele. Os `dark:`
 * saem porque o tema é claro e fixo — cardápio é vitrine, e comida vende
 * melhor sobre fundo quente (ver globals.css).
 */

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-input bg-surface px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
