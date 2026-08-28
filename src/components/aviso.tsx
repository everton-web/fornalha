import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A caixa de recado de um formulário: o erro que voltou do servidor, o
 * "salvo", o aviso de que algo não vai acontecer.
 *
 * Antes era escrita à mão em cada tela, e por isso variava: umas com ícone,
 * outras sem; umas `rounded-xl`, outras `rounded-2xl`; o vermelho ora em
 * `text-red-700`, ora em `text-red-800`. Nenhuma dessas diferenças era
 * decisão de ninguém.
 *
 * `role="alert"` no erro para o leitor de tela anunciar sem esperar o foco —
 * quem submete um formulário e recebe erro precisa saber, e o botão continua
 * sendo o elemento focado.
 */
const TONS = {
  erro: {
    caixa: "border-red-200 bg-red-50 text-red-700",
    Icone: AlertCircle,
  },
  ok: {
    caixa: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Icone: CheckCircle2,
  },
  info: {
    caixa: "border-line bg-surface text-muted-foreground",
    Icone: Info,
  },
} as const;

export function Aviso({
  tom = "erro",
  titulo,
  children,
  className,
}: {
  tom?: keyof typeof TONS;
  /** Quando existe, vira a primeira linha em negrito. */
  titulo?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const { caixa, Icone } = TONS[tom];

  return (
    <div
      role={tom === "erro" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
        caixa,
        className,
      )}
    >
      <Icone className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? "mt-1" : undefined}>{children}</div>}
      </div>
    </div>
  );
}
