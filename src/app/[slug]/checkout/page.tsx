import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DEMO_CEP_CLIENTE, isDemo } from "@/lib/demo";
import { isOpenNow } from "@/lib/hours";
import { getMenu } from "@/lib/menu";

import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Finalizar pedido" };

export default async function CheckoutPage({
  params,
}: PageProps<"/[slug]/checkout">) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-5">
      <Link
        href={`/${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao cardápio
      </Link>

      <h1 className="mb-5 text-2xl font-bold tracking-tight">Finalizar pedido</h1>

      <CheckoutForm
        slug={slug}
        tenant={menu.tenant}
        isOpen={isOpenNow(menu.tenant)}
        cepSugerido={isDemo(slug) ? DEMO_CEP_CLIENTE : null}
      />
    </main>
  );
}
