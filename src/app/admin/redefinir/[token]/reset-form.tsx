"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { resetPassword } from "../../reset-actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);

  if (state?.sent) {
    return (
      <div className="mt-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="size-5 text-emerald-700" />
          <p className="mt-2 font-semibold text-emerald-900">Senha alterada</p>
          <p className="mt-1 text-sm text-emerald-800">
            Todas as sessões abertas foram encerradas. Entre com a senha nova.
          </p>
        </div>
        <Link
          href="/admin/login"
          className="mt-4 block rounded-full bg-brand px-5 py-3 text-center text-sm font-semibold text-brand-ink"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500">
          Senha nova
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          autoFocus
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-stone-400"
        />
        <span className="mt-1 block text-xs text-muted">
          Pelo menos 10 caracteres.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500">
          Repita a senha
        </span>
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
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
        {pending ? "Salvando…" : "Salvar senha"}
      </button>
    </form>
  );
}
