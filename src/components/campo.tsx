import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Um campo de formulário: rótulo, campo e a linha de ajuda embaixo.
 *
 * Existe porque os três andam sempre juntos e antes eram remontados à mão em
 * cada tela — com o rótulo ora em <span>, ora embrulhando o <input>. Embrulhar
 * funciona até o rótulo ter um link dentro (o "Esqueci minha senha" fica ao
 * lado de "Senha"): aí o leitor de tela lê o link como parte do nome do campo,
 * ou não anuncia o rótulo. Aqui o vínculo é sempre por `htmlFor`/`id`.
 *
 * O `id` é gerado quando não vem de fora, então o vínculo nunca depende de
 * alguém lembrar de escrever um.
 *
 * São dois componentes, e não um com `multiline`: as props de <input> e
 * <textarea> são tipos diferentes, a começar pela `ref`. Um componente só
 * teria que aceitar a união e mentir sobre ela num cast — e o cast some
 * justamente quando alguém passar a prop errada.
 */
type Comuns = {
  label: React.ReactNode;
  /** Linha de ajuda embaixo do campo. */
  hint?: React.ReactNode;
  /** Algo à direita do rótulo — um link, um botão de apoio. */
  acao?: React.ReactNode;
  className?: string;
};

function Moldura({
  label,
  hint,
  acao,
  className,
  campoId,
  children,
}: Comuns & { campoId: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={campoId} className="text-xs font-medium text-stone-500">
          {label}
        </Label>
        {acao}
      </div>

      {children}

      {hint && (
        <p id={`${campoId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Campo({
  label,
  hint,
  acao,
  className,
  id,
  ...props
}: Comuns & React.ComponentProps<typeof Input>) {
  const gerado = React.useId();
  const campoId = id ?? gerado;

  return (
    <Moldura {...{ label, hint, acao, className, campoId }}>
      <Input
        id={campoId}
        aria-describedby={hint ? `${campoId}-hint` : undefined}
        {...props}
      />
    </Moldura>
  );
}

export function CampoTexto({
  label,
  hint,
  acao,
  className,
  id,
  ...props
}: Comuns & React.ComponentProps<typeof Textarea>) {
  const gerado = React.useId();
  const campoId = id ?? gerado;

  return (
    <Moldura {...{ label, hint, acao, className, campoId }}>
      <Textarea
        id={campoId}
        aria-describedby={hint ? `${campoId}-hint` : undefined}
        {...props}
      />
    </Moldura>
  );
}
