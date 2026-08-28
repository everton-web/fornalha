import Link from "next/link";

import { Marca } from "./marca";

/**
 * Rodapé.
 *
 * Só links que existem. Um rodapé de SaaS costuma ter "Preços", "Central de
 * ajuda", "Trabalhe conosco" e um telefone — e cada um desses aqui seria um
 * link para lugar nenhum ou um contato inventado. Quem clica num rodapé está
 * procurando uma coisa específica; não achar é pior que não ter visto.
 *
 * Contato entra quando houver e-mail e WhatsApp de verdade para pôr.
 */
export function Rodape() {
  return (
    <footer className="mt-16 border-t border-line pt-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div>
          <span className="inline-flex items-center gap-2 font-semibold">
            <Marca className="size-[18px]" />
            Fornalha
          </span>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Sistema de pedidos para pizzarias. Seu cardápio no seu endereço, sem
            comissão por pedido.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:gap-x-16">
          <nav>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Ver funcionando
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/bella-napoli" className="text-muted-foreground transition hover:text-foreground">
                  Cardápio de exemplo
                </Link>
              </li>
              <li>
                <Link href="/admin/demo" className="text-muted-foreground transition hover:text-foreground">
                  Painel por dentro
                </Link>
              </li>
              <li>
                <Link href="#faq" className="text-muted-foreground transition hover:text-foreground">
                  Perguntas frequentes
                </Link>
              </li>
            </ul>
          </nav>

          <nav>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Já é cliente
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/admin" className="text-muted-foreground transition hover:text-foreground">
                  Entrar no painel
                </Link>
              </li>
              <li>
                <Link href="/admin/esqueci" className="text-muted-foreground transition hover:text-foreground">
                  Esqueci minha senha
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* O crédito das fotos não é cortesia: as licenças CC BY e CC BY-SA do
          cardápio de demonstração exigem autor, original e licença à vista. */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Fornalha</p>
        <Link href="/creditos" className="transition hover:text-foreground">
          Créditos das fotos
        </Link>
      </div>
    </footer>
  );
}
