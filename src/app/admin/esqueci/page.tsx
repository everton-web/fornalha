import Link from "next/link";
import { ArrowLeft, ChefHat } from "lucide-react";

import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Recuperar acesso" };

export default function EsqueciPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold">
        <ChefHat className="size-4" />
        Fornalha
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">Esqueceu a senha?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Informe o e-mail do painel e enviamos um link para você criar uma nova.
      </p>

      <ForgotForm />

      <Link
        href="/admin/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para o login
      </Link>
    </main>
  );
}
