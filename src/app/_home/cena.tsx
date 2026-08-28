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

      /*
       * Nunca fecha de todo: a 90° a tela some, e um retângulo vazio no meio
       * da página parece defeito de carregamento, não animação.
       */
      const angulo = (1 - abertura) * -62;

      /*
       * O vão é fechado por `margin-top`, não por `translateY`.
       *
       * Girando em torno da base, o topo da tampa desce e o rodapé dela fica
       * onde está — mas o espaço reservado no layout continua sendo o da tampa
       * aberta, e sobra um vão logo abaixo dos botões. Subir a tampa com
       * `translateY` fechava esse vão e criava outro pior: descolava a tampa da
       * base, e o notebook aparecia com a tela flutuando acima da dobradiça.
       *
       * A margem negativa encolhe a caixa no layout exatamente o tanto que a
       * rotação esvaziou. O vão some, e a base — que vem logo depois no fluxo —
       * continua encostada no rodapé da tampa, que é onde fica a dobradiça.
       */
      const vazio = folha.offsetHeight * (1 - Math.cos((angulo * Math.PI) / 180));
      folha.style.transform = `rotateX(${angulo}deg)`;
      folha.style.marginTop = `-${vazio.toFixed(1)}px`;
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
 * O painel da pizzaria, na tela de quem vai usá-lo.
 *
 * Só o notebook: a comanda e o celular saíram daqui e ganharam seção própria,
 * onde cabem grandes o bastante para dar para ler. Amontoados no herói, os
 * três disputavam o mesmo olhar e nenhum ganhava.
 */
export function CenaDoProduto() {
  const { cena, tampa } = useTampaQueLevanta();

  return (
    <figure className="mt-14">
      <div ref={cena} className="relative mx-auto max-w-3xl">
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

      </div>

      <figcaption className="mt-4 text-center text-sm text-muted-foreground">
        O painel que você abre na cozinha: os pedidos do momento, o que cada um
        pediu e em que pé está.
      </figcaption>
    </figure>
  );
}
