import Link from "next/link";
import { Bodoni_Moda, Italianno } from "next/font/google";
import "./lp.css";

import {
  Bell,
  ChefHat,
  Globe,
  Layers,
  MapPin,
  Printer,
  QrCode,
  Smartphone,
} from "lucide-react";

/**
 * Didone para os títulos e script para o logotipo — o par da referência.
 * Carregados aqui, e não no layout raiz, porque só esta página os usa: o
 * cardápio e o painel não devem pagar o download.
 */
const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const script = Italianno({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

/**
 * Página de apresentação da Fornalha.
 *
 * Bento: os quadros têm tamanhos diferentes porque o peso do que contam é
 * diferente. Domínio próprio e montador de pizza são o que decide a venda, e
 * ganham espaço para mostrar em vez de só afirmar; o resto sustenta.
 *
 * Cada quadro fala de coisa que existe no sistema. Landing page que promete o
 * que o produto não faz só adia a decepção para a primeira semana de uso.
 */
export default function Home() {
  return (
    <main
      className={`lp ${display.variable} ${script.variable} flex-1`}
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-14 text-center sm:py-20">
      {/* --------------------------------------------------------- marca */}
      <span
        className="lp-selo mx-auto grid size-16 place-items-center rounded-full text-[2.6rem] leading-none"
        style={{ fontFamily: "var(--font-script)" }}
        aria-hidden
      >
        F
      </span>
      <p
        className="mt-3 text-xs font-semibold uppercase tracking-[0.32em]"
        style={{ color: "var(--lt-green)" }}
      >
        <ChefHat className="mr-1.5 inline size-3.5" />
        Fornalha
      </p>

      <h1
        className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.1] sm:text-6xl"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
      >
        Seu cardápio, no seu endereço.
        <br />
        <em className="not-italic" style={{ color: "var(--lt-tomato)" }}>
          Sem comissão por pedido.
        </em>
      </h1>

      <p
        className="mx-auto mt-5 max-w-xl text-lg"
        style={{ color: "var(--lt-ink-soft)" }}
      >
        Seu cliente pede no site da sua pizzaria, o pedido cai direto na
        cozinha e o dinheiro vai para a sua conta. Sem intermediário ficando
        com um pedaço de cada pizza.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/bella-napoli"
          className="lp-botao-tomate rounded-full px-6 py-3 text-sm font-semibold"
        >
          Ver cardápio de demonstração
        </Link>
        <Link
          href="/admin"
          className="lp-botao-linha rounded-full px-6 py-3 text-sm font-semibold"
        >
          Entrar no painel
        </Link>
      </div>

      {/* --------------------------------------------------------- bento */}
      <ul className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-6">
        {/* Destaque: o que diferencia. Ganha o dobro e uma janela de navegador. */}
        <Quadro span="lg:col-span-4" verde icone={<Globe className="size-5" />}>
          <Titulo>Seu endereço na internet</Titulo>
          <Texto>
            Seu cliente digita o endereço da sua pizzaria e cai no seu
            cardápio. Sem link de terceiro, sem nome de outra empresa no meio
            — a marca que aparece é a sua.
          </Texto>

          {/* mt-auto: encosta no rodapé do quadro, para o bloco grande não
              ficar com um vão embaixo ao lado do vizinho mais alto. */}
          <div className="lp-fundo mt-auto overflow-hidden rounded-xl pt-5">
            <div className="mx-3 flex items-center gap-1.5 rounded-t-lg px-3 py-2"
              style={{ background: "var(--lt-cream-pure)" }}>
              <span className="size-2 rounded-full" style={{ background: "var(--lt-ink-faint)" }} />
              <span className="size-2 rounded-full" style={{ background: "var(--lt-ink-faint)" }} />
              <span className="size-2 rounded-full" style={{ background: "var(--lt-ink-faint)" }} />
              <span className="ml-2 truncate rounded px-2.5 py-1 font-mono text-[11px]" style={{ background: "var(--lt-cream-deep)", color: "var(--lt-ink-soft)" }}>
                pizzariadobairro.com.br
              </span>
            </div>

            <div className="mx-3 rounded-b-lg"
              style={{ background: "var(--lt-cream-pure)", color: "var(--lt-ink)" }}>
              <div className="flex items-center gap-2.5 border-b px-3 py-2.5"
                style={{ borderColor: "var(--lt-cream-deep)" }}>
                <span className="grid size-7 place-items-center rounded text-[11px] font-bold" style={{ background: "var(--lt-tomato)", color: "var(--lt-cream)" }}>
                  P
                </span>
                <span className="text-sm font-semibold">Pizzaria do Bairro</span>
                <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: "color-mix(in srgb, var(--lt-green) 14%, transparent)", color: "var(--lt-green)" }}>
                  Aberta
                </span>
              </div>

              {[
                ["Calabresa", "Cebola roxa e azeitona", "66,00"],
                ["Portuguesa", "Presunto, ovo e ervilha", "66,00"],
              ].map(([nome, desc, preco]) => (
                <div
                  key={nome}
                  className="flex items-center gap-3 px-3 py-2.5 [&+&]:border-t"
                  style={{ borderTopColor: "var(--lt-cream-deep)" }}
                >
                  <span className="size-9 shrink-0 rounded" style={{ background: "var(--lt-cream-deep)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {nome}
                    </span>
                    <span className="block truncate text-[11px]" style={{ color: "var(--lt-ink-soft)" }}>
                      {desc}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    R$ {preco}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-3" />
          </div>
        </Quadro>

        {/* Alto e estreito: a lista de sabores pede formato vertical. */}
        <Quadro span="lg:col-span-2" icone={<Smartphone className="size-5" />}>
          <Titulo>Montador de pizza</Titulo>
          <Texto>
            Seu cliente escolhe tamanho, até 4 sabores, borda e adicionais.
            No celular dele, sem instalar nada.
          </Texto>

          <div className="mt-auto space-y-1.5 pt-4">
            {[
              ["Calabresa", true],
              ["Quatro Queijos", true],
              ["Margherita", false],
            ].map(([nome, marcado]) => (
              <div
                key={nome as string}
                className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
                style={
                  marcado
                    ? {
                        borderColor: "var(--lt-tomato)",
                        background: "color-mix(in srgb, var(--lt-tomato) 8%, transparent)",
                        fontWeight: 500,
                      }
                    : {
                        borderColor: "color-mix(in srgb, var(--lt-green) 18%, transparent)",
                        opacity: 0.6,
                      }
                }
              >
                <span
                  className="size-3 rounded-sm border"
                  style={
                    marcado
                      ? { borderColor: "var(--lt-tomato)", background: "var(--lt-tomato)" }
                      : { borderColor: "color-mix(in srgb, var(--lt-green) 25%, transparent)" }
                  }
                />
                {nome as string}
              </div>
            ))}
            <p className="pt-1 text-right text-xs opacity-70">
              média dos sabores ·{" "}
              <strong className="opacity-100">R$ 70,00</strong>
            </p>
          </div>
        </Quadro>

        {/* Trio de sustentação. */}
        <Quadro span="lg:col-span-2" icone={<Layers className="size-5" />}>
          <Titulo>Reajuste sem sofrimento</Titulo>
          <Texto>
            Subiu o queijo? Você mexe no preço da faixa e todos os sabores
            dela sobem juntos. Não é sabor por sabor.
          </Texto>
          <div className="mt-auto space-y-1.5 pt-4 font-mono text-xs">
            <div className="lp-fundo flex justify-between rounded px-2.5 py-1.5">
              <span className="opacity-70">Tradicionais</span>
              <span className="font-semibold">R$ 66</span>
            </div>
            <div className="lp-fundo flex justify-between rounded px-2.5 py-1.5">
              <span className="opacity-70">Especiais</span>
              <span className="font-semibold">R$ 74</span>
            </div>
          </div>
        </Quadro>

        <Quadro span="lg:col-span-2" verde icone={<QrCode className="size-5" />}>
          <Titulo>Pago antes de sair</Titulo>
          <Texto>
            O cliente paga por Pix e o dinheiro cai na sua conta, na hora. Você
            escolhe o gateway; a taxa é dele, não nossa.
          </Texto>
          <p className="lp-fundo mt-auto rounded px-2.5 py-2 text-xs font-medium">
            Pago — pode preparar
          </p>
        </Quadro>

        <Quadro span="lg:col-span-2" icone={<MapPin className="size-5" />}>
          <Titulo>Taxa por bairro</Titulo>
          <Texto>
            O cliente digita o CEP, o endereço se preenche sozinho e a taxa sai
            do bairro dele. Longe não sai pelo preço de perto.
          </Texto>
          <div className="mt-auto space-y-1.5 pt-4 text-xs">
            {[
              ["Vila Madalena", "R$ 6"],
              ["Pinheiros", "R$ 9"],
            ].map(([bairro, taxa]) => (
              <div
                key={bairro}
                className="lp-fundo flex items-center gap-2 rounded px-2.5 py-1.5"
              >
                <span className="opacity-70">{bairro}</span>
                <span className="ml-auto font-semibold">{taxa}</span>
              </div>
            ))}
          </div>
        </Quadro>

        {/* Fecha o bento com o argumento que ninguém mais faz. */}
        <Quadro span="lg:col-span-3" icone={<Bell className="size-5" />}>
          <Titulo>Aguenta internet ruim</Titulo>
          <Texto>
            O aviso de pedido novo chega no celular do dono mesmo com o painel
            fechado. E quando a conexão cai, a tela avisa — em vez de congelar
            calada e a pizzaria achar que o movimento parou.
          </Texto>
        </Quadro>

        <Quadro span="lg:col-span-3" icone={<Printer className="size-5" />}>
          <Titulo>Cupom que imprime</Titulo>
          <Texto>
            Sai na largura da bobina para a impressora térmica, e também como
            imagem — dá para mandar no WhatsApp ou imprimir de outro aparelho,
            no 4G, se a internet da loja cair.
          </Texto>
        </Quadro>
      </ul>

      {/* --------------------------------------------------- como funciona */}
      <section className="mt-16">
        <h2 className="lp-regua mx-auto max-w-md text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--lt-green)" }}>
          Como sua pizzaria começa
        </h2>
        <ol className="mt-6 grid gap-4 text-left sm:grid-cols-3">
          {[
            ["A gente monta sua loja", "Criamos sua conta e o cardápio base — tamanhos, categorias, bordas e faixas de preço prontos."],
            ["Você põe os sabores", "Preços, fotos, horários e área de entrega, pelo painel. Sem depender de ninguém para mudar preço."],
            ["Seus clientes pedem", "Pelo seu link ou pelo seu domínio. O pedido cai na cozinha com aviso sonoro."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="lp-quadro rounded-2xl p-5">
              <span className="lp-selo grid size-8 place-items-center rounded-full text-sm" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                {i + 1}
              </span>
              <h3 className="mt-3 text-base" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                {titulo}
              </h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--lt-ink-soft)" }}>
                {texto}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- fecho */}
      <section
        className="lp-serrilha mt-16 px-6 py-14 text-center sm:px-10"
        style={{ background: "var(--lt-green)", color: "var(--lt-on-green)" }}
      >
        <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
          Veja funcionando antes de decidir
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: "var(--lt-on-green-soft)" }}>
          Uma pizzaria de exemplo está no ar com cardápio completo. Monte uma
          pizza, feche o pedido e veja como ele chega na cozinha.
        </p>
        <Link
          href="/bella-napoli"
          className="lp-botao-tomate mt-7 inline-block rounded-full px-6 py-3 text-sm font-semibold"
        >
          Abrir a demonstração
        </Link>
      </section>

      <footer
        className="mt-12 text-xs uppercase tracking-[0.2em]"
        style={{ color: "var(--lt-ink-faint)" }}
      >
        Fornalha · sistema de pedidos para pizzarias
      </footer>
      </div>
    </main>
  );
}

/** Um quadro do bento. O `span` é quem dá o peso de cada um. */
function Quadro({
  span,
  icone,
  verde = false,
  children,
}: {
  span: string;
  icone: React.ReactNode;
  /** Quadro cheio de verde. Um ou dois por seção: mais que isso e o verde
      deixa de ser pausa e vira o fundo. */
  verde?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`${span} ${verde ? "lp-quadro--verde" : ""} lp-quadro flex flex-col rounded-2xl p-5`}
    >
      <span className="lp-fundo grid size-10 shrink-0 place-items-center rounded-full">
        {icone}
      </span>
      {children}
    </li>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-3 text-lg"
      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
    >
      {children}
    </h2>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
  );
}
