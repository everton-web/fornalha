import Link from "next/link";

import creditos from "../../../db/fotos/creditos.json";

/**
 * Créditos das fotos do cardápio de demonstração.
 *
 * Existe por obrigação da licença, não por capricho: quase toda foto do
 * acervo do Wikimedia Commons é CC BY ou CC BY-SA, e as duas exigem crédito ao
 * autor, o link para o original e o nome da licença. Publicar sem isso é usar
 * a foto fora do que a licença permite.
 *
 * Vale só para a Bella Napoli, que é vitrine nossa. Pizzaria cliente envia a
 * foto dela pelo painel e não aparece aqui.
 *
 * A lista sai de db/fotos/creditos.json, que o scripts/fotos-demo.mjs escreve
 * junto com as imagens — assim trocar uma foto atualiza o crédito sozinho, em
 * vez de deixar para trás o nome do autor da foto anterior.
 */
export const metadata = {
  title: "Créditos das fotos — Fornalha",
  description:
    "Autoria e licença das fotos usadas no cardápio da pizzaria de demonstração.",
};

type Credito = {
  titulo: string;
  autor: string;
  pagina: string;
  licenca: string;
  fonte: string;
};

export default function Creditos() {
  const lista = Object.entries(creditos as Record<string, Credito>);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <Link
        href="/"
        className="text-sm text-muted-foreground transition hover:text-foreground"
      >
        ← Fornalha
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Créditos das fotos
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        A pizzaria de demonstração é fictícia, e as fotos do cardápio dela vêm
        do Wikimedia Commons, sob licenças que permitem uso comercial e
        modificação. Cada uma foi recortada e convertida para WebP. Abaixo, o
        autor, o original e a licença de cada uma.
      </p>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {lista.map(([slug, c]) => (
          <li key={slug} className="flex flex-wrap items-baseline gap-x-3 py-3">
            <span className="w-44 shrink-0 font-mono text-sm text-muted-foreground">
              {slug}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <a
                href={c.pagina}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline decoration-line underline-offset-4 transition hover:decoration-foreground"
              >
                {c.titulo}
              </a>
              <span className="text-muted-foreground">
                {" "}
                — {c.autor}, {c.licenca}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Fonte: {" "}
        <a
          href="https://commons.wikimedia.org"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-line underline-offset-4"
        >
          Wikimedia Commons
        </a>
        .
      </p>
    </main>
  );
}
