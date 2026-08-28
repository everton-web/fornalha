import Link from "next/link";
import { redirect } from "next/navigation";
import { ChefHat } from "lucide-react";

import { getSession } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar no painel" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold">
        <ChefHat className="size-4" />
        Fornalha
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">Painel da pizzaria</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entre para ver os pedidos e cuidar do cardápio.
      </p>

      <LoginForm />
    </main>
  );
}
