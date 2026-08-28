import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-5xl">🍕</p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">
        O link pode estar errado ou a pizzaria não está mais ativa.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
