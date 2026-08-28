"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
        <Button asChild size="pill" className="mt-4 bg-emerald-700 py-2.5 text-white hover:bg-emerald-800">
          <Link href="/agencia">Abrir o painel da agência</Link>
        </Button>
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
      <Campo
        label="Seu e-mail"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@exemplo.com"
      />

      <Campo
        label="Crie uma senha"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="pelo menos 8 caracteres"
      />

      {!temPizzaria && (
        <div className="flex items-start gap-2 text-sm">
          <Checkbox
            id="criar-demo"
            checked={criarDemo}
            onCheckedChange={(v) => setCriarDemo(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="criar-demo" className="block font-normal leading-snug">
            Criar um cardápio de demonstração
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              Pizzaria Bella Napoli, com tamanhos, sabores e faixas de preço para
              você ver o sistema funcionando. Dá para apagar depois.
            </span>
          </Label>
        </div>
      )}

      {erro && <Aviso>{erro}</Aviso>}

      <Button
        type="submit"
        size="pill"
        disabled={pendente}
        className="w-full bg-foreground text-background hover:bg-foreground/90"
      >
        {pendente
          ? "Instalando…"
          : temTabelas
            ? "Criar meu acesso"
            : "Preparar o banco e criar meu acesso"}
      </Button>
    </form>
  );
}
