import Link from "next/link";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { signOut } from "@/app/admin/actions";
import { listarPizzarias } from "@/lib/agencia";
import { requirePlatformAdmin } from "@/lib/auth";
import { money } from "@/lib/format";

import { PizzariasManager } from "./pizzarias-manager";

export const metadata = { title: "Agência" };
export const dynamic = "force-dynamic";

export default async function AgenciaPage() {
  const conta = await requirePlatformAdmin();
  const pizzarias = await listarPizzarias();

  const ativas = pizzarias.filter((p) => p.ativa).length;
  const pedidos30d = pizzarias.reduce((acc, p) => acc + p.pedidos30d, 0);
  const faturamento30d = pizzarias.reduce((acc, p) => acc + p.faturamento30d, 0);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">Painel da agência</p>
            <p className="truncate text-xs text-muted-foreground">{conta.email}</p>
          </div>
          <form action={signOut} className="ml-auto">
            <Button
              type="submit"
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Resumo
            titulo="Pizzarias ativas"
            valor={`${ativas}`}
            detalhe={
              pizzarias.length > ativas
                ? `${pizzarias.length - ativas} desligada(s)`
                : "todas no ar"
            }
          />
          <Resumo
            titulo="Pedidos (30 dias)"
            valor={`${pedidos30d}`}
            detalhe="somando a carteira"
          />
          <Resumo
            titulo="Movimentado (30 dias)"
            valor={money(faturamento30d)}
            detalhe="dinheiro das pizzarias, não seu"
          />
        </div>

        <PizzariasManager pizzarias={pizzarias} />

        {pizzarias.length > 0 && (
          <p className="mt-6 text-xs text-muted-foreground">
            Cada pizzaria recebe dois links: <code>/slug</code> para divulgar ao
            cliente e <code>/admin</code> para o dono trabalhar.{" "}
            <Link href="/admin" className="underline underline-offset-2">
              Abrir o painel da pizzaria
            </Link>
            .
          </p>
        )}
      </main>
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}
