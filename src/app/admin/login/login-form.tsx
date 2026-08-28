"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn } from "../actions";

/**
 * Primeira tela montada com os primitivos do shadcn/ui.
 *
 * O que muda de verdade não é a aparência — é o que vinha de graça e não
 * estava aqui: o `<Label htmlFor>` do Radix liga rótulo e campo de fato (o
 * `<label>` embrulhando o input funcionava, mas leitor de tela não anunciava
 * o segundo rótulo, que tem um link dentro), e o `Input` já traz o anel de
 * foco visível e o estado `aria-invalid`.
 *
 * O `rounded-full` fica no className porque a identidade da Fornalha é de
 * botão em pílula e o padrão do shadcn é `rounded-md`. `cn()` resolve o
 * conflito a favor de quem chama — é para isso que ele existe.
 *
 * O botão não precisou de cor: `bg-primary` do shadcn aponta para `--brand`,
 * que é reescrito por pizzaria a partir do banco.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email" className="text-xs font-medium text-stone-500">
          E-mail
        </Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password" className="text-xs font-medium text-stone-500">
            Senha
          </Label>
          <Link
            href="/admin/esqueci"
            className="text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
          >
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-auto w-full rounded-full px-5 py-3 text-sm font-semibold"
      >
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
