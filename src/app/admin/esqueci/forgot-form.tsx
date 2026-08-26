"use client";

import { useActionState } from "react";
import { AlertCircle, MailCheck } from "lucide-react";

import { requestPasswordReset } from "../reset-actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.sent) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <MailCheck className="size-5 text-emerald-700" />
        <p className="mt-2 font-semibold text-emerald-900">Link enviado</p>
        <p className="mt-1 text-sm text-emerald-800">
          Se esse e-mail tiver acesso a algum painel, a mensagem chega em
          instantes. O link vale por 30 minutos.
        </p>
        <p className="mt-3 text-xs text-emerald-700">
          Não recebeu? Confira a caixa de spam antes de pedir outro.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-stone-400"
        />
      </label>

      {state?.error && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-ink disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
