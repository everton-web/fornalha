import Link from "next/link";
import { ExternalLink, Eye, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
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
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-2">
          <NavLink href="/admin/pedidos">Pedidos</NavLink>
          <NavLink href="/admin/cardapio">Cardápio</NavLink>
          <NavLink href="/admin/pagamentos">Pagamentos</NavLink>
          <NavLink href="/admin/configuracoes">Configurações</NavLink>
        </nav>
      </header>

      {/*
        Fica no topo de toda tela do painel, não só na primeira: quem entra
        pela demonstração navega, se distrai, e daqui a três cliques precisa
        continuar sabendo que está numa vitrine e não na própria loja.
      */}
      {session.isDemo && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2.5 text-sm text-amber-900">
            <Eye className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">Modo demonstração.</strong>{" "}
              Abra tudo à vontade — nada aqui é salvo.
            </span>
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
