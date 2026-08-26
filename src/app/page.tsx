import Link from "next/link";
import {
  ChefHat,
  Globe,
  LayoutDashboard,
  Palette,
  Smartphone,
  Store,
} from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <ChefHat className="size-3.5" />
        Fornalha
      </span>

      <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Sistema de pedidos
        <br />
        para pizzarias.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Cada pizzaria ganha seu próprio cardápio digital, com link próprio,
        cores próprias e pedidos caindo direto no painel da cozinha.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/bella-napoli"
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink"
        >
          Ver cardápio de demonstração
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold transition hover:border-stone-300"
        >
          Entrar no painel
        </Link>
      </div>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Feature
          icon={<Smartphone className="size-5" />}
          title="App do cliente"
          text="Monta pizza com sabores, borda e adicionais. Funciona no celular, sem instalar nada."
        />
        <Feature
          icon={<LayoutDashboard className="size-5" />}
          title="Painel da cozinha"
          text="Pedidos em tempo real, mudança de status e histórico do dia."
        />
        <Feature
          icon={<Globe className="size-5" />}
          title="Domínio próprio"
          text="Cada pizzaria atende no endereço dela, com a marca dela. O sistema fica invisível."
        />
        <Feature
          icon={<Store className="size-5" />}
          title="Conta separada"
          text="Cada dono entra no painel dele e vê só a loja dele. Cardápio, preços e pedidos isolados."
        />
        <Feature
          icon={<Palette className="size-5" />}
          title="Do jeito da casa"
          text="Cor, logo, tamanhos, faixas de preço, bordas, horários, área de entrega e formas de pagamento."
        />
      </ul>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-3xl border border-line bg-surface p-5">
      <span className="grid size-10 place-items-center rounded-full bg-background">
        {icon}
      </span>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </li>
  );
}
