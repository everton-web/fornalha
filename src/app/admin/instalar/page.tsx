import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { lerEstado } from "@/lib/install";

import { InstallForm } from "./form";

export const metadata = { title: "Instalar" };

// Sempre no servidor, a cada visita: esta tela existe para ler o estado atual
// do banco. Pré-renderizada no build ela consultaria um banco que ainda não
// existe — e congelaria a resposta de "precisa instalar" para sempre.
export const dynamic = "force-dynamic";

/**
 * Primeira instalação.
 *
 * A porta fecha sozinha: assim que existe uma conta, esta tela vira um aviso
 * e a ação por trás dela recusa. Não há segredo para vazar nem variável para
 * alguém esquecer de remover depois.
 */
export default async function InstalarPage() {
  const estado = await lerEstado();

  if (!estado.precisaInstalar) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h1 className="mt-3 text-lg font-bold">Sistema já instalado</h1>
          <p className="mt-1.5 text-sm text-muted">
            Existe {estado.contas === 1 ? "uma conta" : `${estado.contas} contas`}{" "}
            neste sistema, então esta página está desativada.
          </p>
          <Link
            href="/admin/login"
            className="mt-5 inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ir para o login
          </Link>
          <p className="mt-3 text-xs text-muted">
            Esqueceu a senha? Use{" "}
            <Link href="/admin/esqueci" className="underline underline-offset-2">
              esqueci minha senha
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-xl font-bold tracking-tight">Instalar a Fornalha</h1>
      <p className="mt-1.5 text-sm text-muted">
        {estado.temTabelas
          ? "O banco existe mas ainda não tem nenhum acesso. Crie o seu."
          : "Primeira vez: vamos preparar o banco e criar o seu acesso de dono."}
      </p>

      <InstallForm temTabelas={estado.temTabelas} temPizzaria={estado.pizzarias > 0} />

      <p className="mt-5 text-xs text-muted">
        Esta página se desativa sozinha assim que a primeira conta existir.
      </p>
    </main>
  );
}
