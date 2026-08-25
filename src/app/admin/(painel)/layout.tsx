import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { isOpenNow } from "@/lib/hours";

import { signOut } from "../actions";
import { NavLink } from "./_components/nav-link";
import { OpenToggle } from "./_components/open-toggle";

export const metadata = { title: "Painel" };

export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireSession();
  const { tenant } = session;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{tenant.name}</p>
            <Link
              href={`/${tenant.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              /{tenant.slug}
              <ExternalLink className="size-3" />
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <OpenToggle
              openNow={isOpenNow(tenant)}
              override={tenant.is_open_override}
            />
            <form action={signOut}>
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-full border border-line transition hover:border-stone-300"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-2">
          <NavLink href="/admin/pedidos">Pedidos</NavLink>
          <NavLink href="/admin/cardapio">Cardápio</NavLink>
          <NavLink href="/admin/configuracoes">Configurações</NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
