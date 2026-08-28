"use client";

import { useActionState } from "react";

import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";

import { requestPasswordReset } from "../reset-actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.sent) {
    return (
      <Aviso tom="ok" titulo="Link enviado" className="mt-8">
        <p>
          Se esse e-mail tiver acesso a algum painel, a mensagem chega em
          instantes. O link vale por 30 minutos.
        </p>
        <p className="mt-2 text-xs">
          Não recebeu? Confira a caixa de spam antes de pedir outro.
        </p>
      </Aviso>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <Campo
        label="E-mail"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
      />

      {state?.error && <Aviso>{state.error}</Aviso>}

      <Button type="submit" size="pill" disabled={pending} className="w-full">
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}
