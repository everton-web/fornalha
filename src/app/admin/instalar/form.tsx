"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { instalarSistema } from "@/app/admin/install-actions";
import type { ResultadoInstalacao } from "@/lib/install";

export function InstallForm({
  temTabelas,
  temPizzaria,
}: {
  temTabelas: boolean;
  temPizzaria: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [criarDemo, setCriarDemo] = useState(!temPizzaria);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<ResultadoInstalacao | null>(null);
  const [pendente, iniciar] = useTransition();

  if (pronto) {
    return (
      <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <h2 className="mt-2 font-bold text-emerald-900">Instalado</h2>
        <ul className="mt-2 space-y-1 text-sm text-emerald-900">
          <li>{pronto.migrationsRodadas.length} migrations aplicadas</li>
          {pronto.criouDemo && <li>Cardápio de demonstração criado</li>}
          <li>
            {pronto.email} é dono de <strong>{pronto.pizzaria}</strong>
          </li>
        </ul>
        <Link
          href="/admin/pedidos"
          className="mt-4 inline-block rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Abrir o painel
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await instalarSistema({ email, senha, criarDemo });
          if (!r.ok) return setErro(r.error);
          setPronto(r.resumo);
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Seu e-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-background px-3 py-2.5 outline-none focus:border-stone-400"
          placeholder="voce@exemplo.com"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Crie uma senha</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-xl border border-line bg-background px-3 py-2.5 outline-none focus:border-stone-400"
          placeholder="pelo menos 8 caracteres"
        />
      </label>

      {!temPizzaria && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={criarDemo}
            onChange={(e) => setCriarDemo(e.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            Criar um cardápio de demonstração
            <span className="block text-xs text-muted">
              Pizzaria Bella Napoli, com tamanhos, sabores e faixas de preço para
              você ver o sistema funcionando. Dá para apagar depois.
            </span>
          </span>
        </label>
      )}

      {erro && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pendente
          ? "Instalando…"
          : temTabelas
            ? "Criar meu acesso"
            : "Preparar o banco e criar meu acesso"}
      </button>
    </form>
  );
}
