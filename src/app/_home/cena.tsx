"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Levanta a tampa do notebook conforme a página rola.
 *
 * Escreve o `transform` direto no nó, sem estado do React. O evento de scroll
 * dispara dezenas de vezes por segundo, e guardar o progresso em `useState`
 * re-renderizaria a árvore inteira em cada uma — para mudar um ângulo. Com
 * ref, o React não é acordado nenhuma vez, e a leitura do
 * `getBoundingClientRect` fica dentro de requestAnimationFrame.
 *
 * A tampa nasce **aberta** no HTML. Assim, sem JavaScript ou com
 * `prefers-reduced-motion`, a cena aparece montada em vez de ficar dobrada
 * para sempre — a animação é um enfeite, e enfeite que falha não pode levar o
 * conteúdo junto.
 */
function useTampaQueLevanta() {
  const cena = useRef<HTMLDivElement>(null);
  const tampa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = cena.current;
    const folha = tampa.current;
    if (!alvo || !folha) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let agendado = false;

    /*
     * Ancorado na rolagem, não na posição do elemento na tela.
     *
     * Medir "quanto o elemento subiu na janela" parece o certo, mas numa tela
     * alta a cena já nasce no meio do campo de visão — e a tampa apareceria
     * meio aberta antes de a pessoa rolar um pixel, que é justamente o que se
     * quer mostrar. Ancorando na rolagem, ela começa fechada em qualquer tela,
     * e o `Math.max(0, …)` faz o começo colapsar para o topo da página quando
     * a cena está acima da dobra.
     */
    const medir = () => {
      agendado = false;
      const y = window.scrollY;
      const topoNaPagina = alvo.getBoundingClientRect().top + y;
      const comeca = Math.max(0, topoNaPagina - window.innerHeight * 0.9);
      const duracao = Math.max(240, window.innerHeight * 0.55);
      const abertura = Math.min(1, Math.max(0, (y - comeca) / duracao));
      // Nunca fecha de todo: a 90° a tela some, e um retângulo vazio no meio
      // da página parece defeito de carregamento, não animação.
      folha.style.transform = `rotateX(${(1 - abertura) * -72}deg)`;
    };

    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, []);

  return { cena, tampa };
}

/**
 * Moldura de notebook, com a tampa levantando conforme a página rola.
 *
 * Desenhada em CSS, não recortada de mockup pronto: mockup de banco de imagem
 * vem em perspectiva, o que obrigaria a deformar o print e borrar o texto — e
 * print de sistema só convence se der para ler.
 */
function Notebook({
  tampa,
  children,
}: {
  tampa: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full [perspective:1600px]">
      <div
        ref={tampa}
        className="origin-bottom transition-transform duration-100 ease-out"
      >
        {/* tampa — a moldura escura em volta da tela */}
        <div className="rounded-t-xl bg-gradient-to-b from-stone-700 to-stone-800 p-1.5 pt-2 sm:rounded-t-2xl sm:p-2 sm:pt-3">
          <div className="mx-auto mb-1 size-1 rounded-full bg-stone-500/70 sm:mb-1.5" />
          <div className="overflow-hidden rounded-sm bg-black sm:rounded">
            {children}
          </div>
        </div>
      </div>

      {/* base — mais larga que a tampa, como no aparelho de verdade. Fica fora
          da rotação: é ela que dá o eixo da dobradiça. */}
      <div className="relative -mx-[5%] h-2 rounded-b-md bg-gradient-to-b from-stone-300 to-stone-400 sm:h-3 sm:rounded-b-lg">
        <div className="absolute left-1/2 top-0 h-1 w-[14%] -translate-x-1/2 rounded-b-full bg-stone-400" />
      </div>
    </div>
  );
}

/**
 * Moldura de iPhone.
 *
 * A tela é full-bleed e a ilha dinâmica flutua sobre o conteúdo — que é como
 * o aparelho realmente é. A versão anterior punha a ilha dentro de uma barra
 * de status branca, com hora e bateria desenhadas; além de não parecer um
 * iPhone, era interface inventada num print que existe para provar o que o
 * sistema faz.
 *
 * A ilha cai justamente sobre o escurecido do modal do montador, então não
 * tapa nada que se queira ler. Se um dia o print mudar, é isso que precisa
 * ser reconferido.
 */
function IPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* botões: ação e volume à esquerda, o de ligar à direita */}
      <div className="absolute -left-[2px] top-[14%] h-[4%] w-[2px] rounded-l bg-stone-400" />
      <div className="absolute -left-[2px] top-[22%] h-[7%] w-[2px] rounded-l bg-stone-400" />
      <div className="absolute -left-[2px] top-[31%] h-[7%] w-[2px] rounded-l bg-stone-400" />
      <div className="absolute -right-[2px] top-[25%] h-[10%] w-[2px] rounded-r bg-stone-400" />

      {/* corpo em titânio natural, com a moldura preta fina por dentro */}
      <div className="rounded-[2rem] bg-gradient-to-br from-stone-300 via-stone-400 to-stone-300 p-[1px] shadow-[0_24px_60px_-24px_rgba(28,25,23,0.6)] sm:rounded-[2.6rem] sm:p-[2px]">
        {/* A moldura preta fica fina de propósito: num iPhone ela é uma linha,
            e grossa demais o aparelho vira "celular genérico". */}
        <div className="rounded-[1.95rem] bg-black p-[2px] sm:rounded-[2.55rem] sm:p-[3px]">
          <div className="relative overflow-hidden rounded-[1.7rem] bg-black sm:rounded-[2.2rem]">
            {children}

            {/* ilha dinâmica, com a lente à direita como no aparelho */}
            <span className="absolute left-1/2 top-[1.2%] flex h-[3.6%] w-[32%] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[7%]">
              <span className="aspect-square h-[46%] rounded-full bg-stone-700" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Os três lados de um pedido, numa cena só.
 *
 * Sobrepostos, e não lado a lado: três retângulos alinhados viram catálogo de
 * loja de app. Com a comanda torta à esquerda e o celular por cima do canto
 * do notebook, viram uma bancada.
 */
export function CenaDoProduto() {
  const { cena, tampa } = useTampaQueLevanta();

  return (
    <figure className="mt-14">
      <div ref={cena} className="relative mx-auto max-w-3xl pb-16 sm:pb-20">
        <Notebook tampa={tampa}>
          <Image
            src="/print-painel.png"
            alt="Painel da pizzaria com os pedidos ativos e o status de cada um"
            width={2880}
            height={1800}
            priority
            className="block w-full"
          />
        </Notebook>

        {/* A comanda que sai na impressora da cozinha. Torta de propósito:
            papel na bancada não fica alinhado, e o giro é o que separa uma
            folha de verdade de mais um retângulo na tela. */}
        <div className="absolute -left-3 bottom-0 w-32 -rotate-6 sm:-left-6 sm:w-44">
          <Image
            src="/print-comanda.png"
            alt="Comanda impressa do pedido, com itens, endereço e total"
            width={900}
            height={1692}
            className="block w-full rounded-[2px] shadow-[0_18px_40px_-16px_rgba(28,25,23,0.45)]"
          />
        </div>

        <div className="absolute bottom-4 right-0 w-28 sm:bottom-6 sm:right-2 sm:w-40">
          <IPhone>
            <Image
              src="/print-montador.png"
              alt="Montador de pizza com tamanhos, sabores e preço pela média"
              width={780}
              height={1440}
              className="block w-full"
            />
          </IPhone>
        </div>
      </div>

      <figcaption className="mt-4 text-center text-sm text-muted">
        Seu cliente monta a pizza no celular, o pedido cai no seu painel já
        pago, e a comanda sai na impressora da cozinha.
      </figcaption>
    </figure>
  );
}
