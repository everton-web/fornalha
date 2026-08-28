import Link from "next/link";
import { ChefHat } from "lucide-react";

import { checkAuthToken } from "@/lib/auth-tokens";

import { ResetForm } from "./reset-form";

export const metadata = { title: "Criar senha nova" };

export default async function RedefinirPage({
  params,
}: PageProps<"/admin/redefinir/[token]">) {
  const { token } = await params;
  const check = await checkAuthToken(token, "reset");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold">
        <ChefHat className="size-4" />
        Fornalha
      </Link>

      {check.valid ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Criar senha nova</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para <strong className="font-medium text-foreground">{check.email}</strong>
          </p>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Link não vale mais</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {check.reason === "expired"
              ? "Este link passou dos 30 minutos de validade."
              : check.reason === "used"
                ? "Este link já foi usado para criar uma senha."
                : "Este link não confere com nenhum pedido de troca de senha."}
          </p>
          <Link
            href="/admin/esqueci"
            className="mt-6 rounded-full bg-brand px-5 py-3 text-center text-sm font-semibold text-brand-ink"
          >
            Pedir um novo link
          </Link>
        </>
      )}
    </main>
  );
}
