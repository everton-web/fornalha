"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";

import { resetPassword } from "../../reset-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);

  if (state?.sent) {
    return (
      <div className="mt-8">
        <Aviso tom="ok" titulo="Senha alterada">
          Todas as sessões abertas foram encerradas. Entre com a senha nova.
        </Aviso>
        {/* asChild: o visual do botão num <Link>, sem <a> dentro de <button>. */}
        <Button asChild size="pill" className="mt-4 w-full">
          <Link href="/admin/login">Ir para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />

      <Campo
        label="Senha nova"
        hint="Pelo menos 10 caracteres."
        name="password"
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        autoFocus
      />

      <Campo
        label="Repita a senha"
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
      />

      {state?.error && <Aviso>{state.error}</Aviso>}

      <Button type="submit" size="pill" disabled={pending} className="w-full">
        {pending ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  );
}
