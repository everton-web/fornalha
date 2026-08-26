import Image from "next/image";

/**
 * Moldura de iPhone, em perspectiva.
 *
 * O ângulo é feito com `rotateY` em CSS, não deformando o PNG: o navegador
 * rasteriza o resultado na resolução da tela do visitante, então o texto do
 * montador continua legível. Deformar a imagem antes, como pede um mockup de
 * banco de imagem, borraria justamente o que a seção existe para mostrar.
 *
 * O que faz o aparelho ser reconhecido é a ilha dinâmica e a borda preta fina
 * e igual nos quatro lados. A espessura vem da própria moldura em titânio, um
 * pouco mais larga do lado que recua: um plano de lateral desenhado à parte
 * não encosta no corpo em ângulo nenhum, e fica boiando ao lado do aparelho.
 */
function IPhoneEmPerspectiva({ children }: { children: React.ReactNode }) {
  return (
    <div className="[perspective:1400px]">
      <div
        className="relative [transform:rotateY(-19deg)_rotateX(3deg)] [transform-style:preserve-3d]"
      >
        {/* botões na lateral esquerda, que é a que fica de frente neste ângulo */}
        <div className="absolute -left-[3px] top-[13%] h-[4%] w-[3px] rounded-l bg-stone-400" />
        <div className="absolute -left-[3px] top-[21%] h-[7%] w-[3px] rounded-l bg-stone-400" />
        <div className="absolute -left-[3px] top-[30%] h-[7%] w-[3px] rounded-l bg-stone-400" />

        {/* corpo */}
        <div className="relative rounded-[2.6rem] bg-gradient-to-r from-stone-400 via-stone-200 to-stone-500 p-[3px] pr-[7px] shadow-[0_40px_80px_-30px_rgba(28,25,23,0.55)]">
          <div className="rounded-[2.5rem] bg-black p-[5px]">
            <div className="relative overflow-hidden rounded-[2.2rem] bg-black">
              {children}
              <span className="absolute left-1/2 top-[1.2%] flex h-[3.6%] w-[32%] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[7%]">
                <span className="aspect-square h-[46%] rounded-full bg-stone-700" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * O montador de pizza.
 *
 * É a tela que decide a venda: quem tem pizzaria sabe que meio a meio é onde
 * todo cardápio digital tropeça. Por isso ela ganha seção própria, grande o
 * bastante para dar para ler os sabores e o preço.
 */
export function Montador() {
  return (
    <section className="mt-16 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-2">
        {/* O celular vem primeiro no desktop e a comanda ficou à direita na
            seção anterior: alternar o lado impede que as duas seções seguidas
            virem a mesma diagramação duas vezes. */}
        <div className="order-2 flex justify-center lg:order-1">
          <div className="w-56 sm:w-72">
            <IPhoneEmPerspectiva>
              <Image
                src="/print-montador.png"
                alt="Montador de pizza: tamanho, sabores marcados e o preço pela média"
                width={780}
                height={1440}
                className="block w-full"
              />
            </IPhoneEmPerspectiva>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Meio a meio sem
            <br />
            <span className="text-brand">confusão de preço.</span>
          </h2>

          <p className="mt-4 text-muted">
            Seu cliente escolhe o tamanho, combina os sabores, põe a borda e os
            adicionais — no celular dele, sem instalar nada. O preço muda na
            tela enquanto ele monta.
          </p>

          <ul className="mt-6 space-y-4">
            {[
              [
                "Até quatro sabores, por tamanho",
                "A Grande aceita três, a Pequena um só — você define. Trocar para um tamanho menor corta os sabores que sobram, em vez de travar o pedido.",
              ],
              [
                "A regra de preço é sua",
                "Cobrar o sabor mais caro, como é comum no Brasil, ou a média dos sabores. Muda em Configurações, não no código.",
              ],
              [
                "A conta é refeita no servidor",
                "O navegador manda só o que foi escolhido. Ninguém consegue mandar um total inventado.",
              ],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="border-l-2 border-line pl-4">
                <p className="font-semibold">{titulo}</p>
                <p className="mt-0.5 text-sm text-muted">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
