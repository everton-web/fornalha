"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, ShieldCheck } from "lucide-react";

import { entrarNaDemo } from "./actions";

export default function DemoPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">
        O painel por dentro
      </h1>
      <p className="mt-2 text-muted">
        Você vai entrar no painel da Bella Napoli, a pizzaria de demonstração —
        os pedidos chegando, o cardápio, as taxas por bairro e as configurações.
      </p>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-stone-500" />
        <span>
          É só para olhar. Você pode abrir tudo, mas nada que apertar é salvo —
          assim a demonstração continua inteira para o próximo que vier ver.
        </span>
      </p>

      {/*
        Botão, não link: entrar cria uma sessão, e criar sessão num GET seria
        disparado por qualquer prefetch do navegador. Aqui só acontece porque
        alguém clicou.
      */}
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            // Em caso de sucesso a ação redireciona e isto nunca volta.
            const r = await entrarNaDemo();
            if (r && !r.ok) setErro(r.error);
          })
        }
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink transition hover:opacity-90 disabled:opacity-50"
      >
        <Eye className="size-4" />
        {pendente ? "Abrindo…" : "Entrar no painel de demonstração"}
      </button>

      {erro && <p className="mt-3 text-sm font-medium text-red-600">{erro}</p>}

      <p className="mt-6 text-sm text-muted">
        Já é cliente?{" "}
        <Link href="/admin/login" className="font-medium underline decoration-dotted underline-offset-4">
          Entrar na sua conta
        </Link>
      </p>
    </main>
  );
}
