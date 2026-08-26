import Image from "next/image";
import { MessageCircle, Printer, Wifi } from "lucide-react";

/**
 * A comanda, em tamanho de leitura.
 *
 * Na cena do herói ela aparece pequena, como objeto da bancada. Aqui ela é o
 * assunto: quem decide contratar quer ler o papel que vai sair na cozinha —
 * ver que tem endereço, observação e total, e não é um resumo que obriga a
 * consultar a tela para saber o que preparar.
 */
export function Comanda() {
  return (
    <section className="mt-16 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            O pedido sai no papel.
            <br />
            <span className="text-brand">E no WhatsApp, se precisar.</span>
          </h2>

          <p className="mt-4 text-muted">
            A comanda sai na largura da bobina de 80&nbsp;mm, com tudo que a
            cozinha e o entregador precisam: itens, borda, observação, endereço
            e o total já com a taxa.
          </p>

          <ul className="mt-6 space-y-4">
            {[
              [
                <Printer key="p" className="size-4" />,
                "Direto na térmica",
                "Um clique no pedido e a comanda imprime, sem copiar nada na mão.",
              ],
              [
                <MessageCircle key="w" className="size-4" />,
                "Ou como imagem no WhatsApp",
                "O mesmo cupom vira PNG na largura nativa da impressora — você manda para quem estiver com o aparelho.",
              ],
              [
                <Wifi key="i" className="size-4" />,
                "A internet da loja caiu?",
                "Imprime pelo celular no 4G. A comanda não fica presa à conexão da pizzaria.",
              ],
            ].map(([icone, titulo, texto]) => (
              <li key={titulo as string} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-background text-stone-600">
                  {icone}
                </span>
                <span>
                  <span className="block font-semibold">
                    {titulo as string}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {texto as string}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* O papel, grande o bastante para ler. O fundo quadriculado sugere a
            bancada sem virar foto de banco de imagem. */}
        <div className="relative flex justify-center rounded-2xl bg-background p-6 sm:p-8">
          <Image
            src="/print-comanda.png"
            alt="Comanda impressa: itens, endereço, observação e total com a taxa de entrega"
            width={900}
            height={1692}
            className="w-56 rotate-[-2deg] rounded-[3px] shadow-[0_24px_50px_-20px_rgba(28,25,23,0.45)] sm:w-72"
          />
        </div>
      </div>
    </section>
  );
}
