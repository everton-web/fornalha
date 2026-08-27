"use client";

import { useState } from "react";

/**
 * Como uma pizzaria entra no ar, um passo por linha.
 *
 * Empilhado em vez de três colunas: em coluna, o texto de cada passo cabia em
 * duas linhas e virava legenda: ninguém lia a ordem, que é justamente o que a
 * seção tem para contar. Empilhado, a leitura é de cima para baixo, como o
 * processo acontece.
 *
 * O painel da direita troca conforme o passo em foco. Ele reage a `mouseenter`
 * e a `focus`: quem navega por teclado precisa ver a mesma coisa que quem tem
 * mouse, e no celular não há hover nenhum — por isso o resumo também aparece
 * dentro da própria linha nas telas pequenas.
 */

type Passo = {
  titulo: string;
  texto: string;
  resumo: string;
  /** Rótulo à esquerda, valor à direita. Três em todos os passos, para o
   *  quadro da direita ter sempre o mesmo peso ao trocar. */
  linhas: [string, string][];
  /** Monoespaçado quando o valor é endereço ou preço — dá para comparar
   *  coluna a coluna, que é o ponto de mostrar três de uma vez. */
  mono?: boolean;
  nota: string;
};

const PASSOS: Passo[] = [
  {
    titulo: "A gente monta sua loja",
    texto:
      "Criamos sua conta e o cardápio base — tamanhos, categorias, bordas e faixas de preço prontos.",
    resumo: "Você recebe os links prontos, e o cardápio já montado.",
    mono: true,
    linhas: [
      ["cardápio", "/sua-pizzaria"],
      ["painel", "/admin"],
      ["domínio próprio", "suapizzaria.com.br"],
    ],
    nota: "Tamanhos, categorias, bordas e três faixas de preço já vêm criados.",
  },
  {
    titulo: "Você põe os sabores",
    texto:
      "Preços, fotos, horários e área de entrega, pelo painel. Sem depender de ninguém para mudar preço.",
    resumo: "Mexe na faixa e todos os sabores dela sobem juntos.",
    mono: true,
    linhas: [
      ["Tradicionais", "R$ 66"],
      ["Especiais", "R$ 74"],
      ["Doces", "R$ 64"],
    ],
    nota: "O preço próprio do sabor continua valendo como exceção.",
  },
  {
    titulo: "Seus clientes pedem",
    texto:
      "Pelo seu link ou pelo seu domínio. O pedido cai na cozinha com aviso sonoro.",
    resumo: "O mesmo pedido chega em três lugares ao mesmo tempo.",
    linhas: [
      ["Painel", "com aviso sonoro"],
      ["Impressora", "comanda de 80 mm"],
      ["Celular", "mesmo com o painel fechado"],
    ],
    nota: "Um não depende do outro: impressora sem papel não segura o pedido no painel.",
  },
];

export function ComoComeca() {
  const [ativo, setAtivo] = useState(0);

  return (
    <section className="mt-16">
      <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        Como sua pizzaria começa
      </h2>

      <div className="mt-4 gap-4 lg:grid lg:grid-cols-5">
        <ol className="space-y-3 lg:col-span-2">
          {PASSOS.map((passo, i) => {
            const emFoco = i === ativo;
            return (
              <li key={passo.titulo}>
                <button
                  type="button"
                  onMouseEnter={() => setAtivo(i)}
                  onFocus={() => setAtivo(i)}
                  aria-current={emFoco}
                  className={`flex w-full gap-4 rounded-2xl border p-5 text-left transition ${
                    emFoco
                      ? "border-stone-300 bg-surface shadow-[0_10px_30px_-20px_rgba(28,25,23,0.5)]"
                      : "border-line bg-surface/60 hover:border-stone-300"
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                      emFoco
                        ? "bg-brand text-brand-ink"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{passo.titulo}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {passo.texto}
                    </span>
                    {/* No celular não existe hover: o resumo vem junto. */}
                    <span className="mt-2 block text-sm font-medium text-brand lg:hidden">
                      {passo.resumo}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/*
          Só no desktop. Um painel que troca ao passar o mouse não tem como
          funcionar onde não há mouse, e duplicá-lo no celular empurraria a
          página para baixo sem acrescentar nada.
        */}
        {/*
          O quadro ocupa a coluna inteira e distribui a altura em três zonas:
          rótulo em cima, linhas no meio e nota embaixo. Antes o conteúdo ficava
          centralizado numa caixa alta e boiava, com vazio igual em cima e
          embaixo — a altura era ocupada, mas não preenchida.

          As linhas é que crescem: `flex-1` em cada uma reparte a sobra entre
          elas, então o espaço extra vira respiro dentro do conteúdo em vez de
          margem morta em volta dele.
        */}
        <div className="hidden lg:col-span-3 lg:block">
          <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
              Passo {ativo + 1} de {PASSOS.length}
            </p>

            {/* key: remonta a cada troca, e o `rise` do globals.css recomeça. */}
            <div key={ativo} className="flex flex-1 flex-col motion-safe:animate-rise">
              <p className="mt-4 text-lg font-semibold leading-snug">
                {PASSOS[ativo].resumo}
              </p>

              <div className="mt-5 flex flex-1 flex-col gap-2">
                {PASSOS[ativo].linhas.map(([rotulo, valor]) => (
                  <div
                    key={rotulo}
                    className={`flex flex-1 items-center justify-between gap-4 rounded-xl bg-background px-4 ${
                      PASSOS[ativo].mono ? "font-mono text-sm" : "text-sm"
                    }`}
                  >
                    <span className="text-muted">{rotulo}</span>
                    <span className="truncate font-semibold">{valor}</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
                {PASSOS[ativo].nota}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
