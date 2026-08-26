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
  detalhe: React.ReactNode;
};

const PASSOS: Passo[] = [
  {
    titulo: "A gente monta sua loja",
    texto:
      "Criamos sua conta e o cardápio base — tamanhos, categorias, bordas e faixas de preço prontos.",
    resumo: "Você recebe dois links: o do cardápio e o do painel.",
    detalhe: (
      <div className="space-y-2 font-mono text-xs">
        <div className="rounded-lg bg-background px-3 py-2">
          <span className="text-muted">cardápio</span>
          <span className="ml-2 font-semibold">/sua-pizzaria</span>
        </div>
        <div className="rounded-lg bg-background px-3 py-2">
          <span className="text-muted">painel</span>
          <span className="ml-2 font-semibold">/admin</span>
        </div>
        <p className="pt-1 font-sans text-xs text-muted">
          Tamanhos, categorias, bordas e três faixas de preço já vêm criados.
        </p>
      </div>
    ),
  },
  {
    titulo: "Você põe os sabores",
    texto:
      "Preços, fotos, horários e área de entrega, pelo painel. Sem depender de ninguém para mudar preço.",
    resumo: "Mexe na faixa e todos os sabores dela sobem juntos.",
    detalhe: (
      <div className="space-y-1.5 font-mono text-xs">
        {[
          ["Tradicionais", "R$ 66"],
          ["Especiais", "R$ 74"],
          ["Doces", "R$ 64"],
        ].map(([faixa, preco]) => (
          <div
            key={faixa}
            className="flex justify-between rounded-lg bg-background px-3 py-2"
          >
            <span className="text-muted">{faixa}</span>
            <span className="font-semibold">{preco}</span>
          </div>
        ))}
        <p className="pt-1 font-sans text-xs text-muted">
          O preço próprio do sabor continua valendo como exceção.
        </p>
      </div>
    ),
  },
  {
    titulo: "Seus clientes pedem",
    texto:
      "Pelo seu link ou pelo seu domínio. O pedido cai na cozinha com aviso sonoro.",
    resumo: "Chega no painel, na impressora e no celular do dono.",
    detalhe: (
      <div className="space-y-1.5 text-xs">
        {[
          ["Painel", "com aviso sonoro"],
          ["Impressora", "comanda de 80 mm"],
          ["Celular", "aviso mesmo com o painel fechado"],
        ].map(([onde, como]) => (
          <div
            key={onde}
            className="flex items-baseline gap-2 rounded-lg bg-background px-3 py-2"
          >
            <span className="font-semibold">{onde}</span>
            <span className="text-muted">{como}</span>
          </div>
        ))}
      </div>
    ),
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
        <ol className="space-y-3 lg:col-span-3">
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
        <div className="hidden lg:col-span-2 lg:block">
          <div className="sticky top-6 rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-semibold">{PASSOS[ativo].resumo}</p>
            {/* key: remonta a cada troca, e o `rise` do globals.css recomeça. */}
            <div key={ativo} className="mt-4 motion-safe:animate-rise">
              {PASSOS[ativo].detalhe}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
