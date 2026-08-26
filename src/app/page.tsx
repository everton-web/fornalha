import Link from "next/link";

import "./lp.css";
import {
  Bell,
  ChefHat,
  Globe,
  Layers,
  Printer,
  QrCode,
  Smartphone,
  Store,
} from "lucide-react";

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
    <main className="lp relative isolate flex-1 overflow-hidden">
      {/* Campo de brasa: fica atrás de tudo, do topo até depois do herói.
          O véu por cima garante que o título continue legível no ponto
          incandescente. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[1000px]">
        <div className="lp-ember-field lp-ember-field--vivo" />
        <div className="lp-veu" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-6 py-14 sm:py-20">
      {/* ---------------------------------------------------------- topo */}
      <span className="lp-fundo inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--lp-ink-dim)" }}>
        <ChefHat className="size-3.5" />
        Fornalha
      </span>

      <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        A pizzaria vende no{" "}
        <span className="lp-incandescente">endereço dela</span>.
        <br />
        Você cuida do sistema.
      </h1>

      <p className="mt-5 max-w-xl text-lg" style={{ color: "var(--lp-ink-dim)" }}>
        Cardápio digital, pedidos online e painel de cozinha. Uma instalação
        atende quantas pizzarias você quiser — cada uma com domínio, marca e
        conta próprios.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/bella-napoli"
          className="lp-botao-brasa rounded-full px-6 py-3 text-sm font-semibold"
        >
          Ver cardápio de demonstração
        </Link>
        <Link
          href="/admin"
          className="lp-botao-fantasma rounded-full px-6 py-3 text-sm font-semibold"
        >
          Entrar no painel
        </Link>
      </div>

      {/* --------------------------------------------------------- bento */}
      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Destaque: o que diferencia. Ganha o dobro e uma janela de navegador. */}
        <Quadro span="lg:col-span-4" icone={<Globe className="size-5" />}>
          <Titulo>Domínio próprio</Titulo>
          <Texto>
            O cliente abre o endereço da pizzaria e cai direto no cardápio.
            Sem <code className="font-mono text-[0.85em]">/nome-da-loja</code>{" "}
            no fim, sem a sua marca aparecer. O sistema fica invisível.
          </Texto>

          {/* mt-auto: encosta no rodapé do quadro, para o bloco grande não
              ficar com um vão embaixo ao lado do vizinho mais alto. */}
          <div className="lp-fundo mt-auto overflow-hidden rounded-xl pt-5">
            <div className="mx-3 flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2"
              style={{ borderColor: "var(--lp-ash)", background: "var(--lp-coal)" }}>
              <span className="size-2 rounded-full" style={{ background: "var(--lp-ash)" }} />
              <span className="size-2 rounded-full" style={{ background: "var(--lp-ash)" }} />
              <span className="size-2 rounded-full" style={{ background: "var(--lp-ash)" }} />
              <span className="ml-2 truncate rounded-md px-2.5 py-1 font-mono text-[11px]" style={{ background: "var(--lp-ash-soft)", color: "var(--lp-ink-dim)" }}>
                pizzariadobairro.com.br
              </span>
            </div>

            <div className="mx-3 rounded-b-lg border"
              style={{ borderColor: "var(--lp-ash)", background: "var(--lp-coal)" }}>
              <div className="flex items-center gap-2.5 border-b px-3 py-2.5"
                style={{ borderColor: "var(--lp-ash)" }}>
                <span className="grid size-7 place-items-center rounded-lg text-[11px] font-bold" style={{ background: "var(--lp-ember)", color: "#2a1002" }}>
                  P
                </span>
                <span className="text-sm font-semibold">Pizzaria do Bairro</span>
                <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgb(16 60 34 / 0.6)", color: "#7fd6a0" }}>
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
                  style={{ borderTopColor: "var(--lp-ash)" }}
                >
                  <span className="size-9 shrink-0 rounded-lg" style={{ background: "var(--lp-ash)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {nome}
                    </span>
                    <span className="block truncate text-[11px]" style={{ color: "var(--lp-ink-faint)" }}>
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
            Tamanho, até 4 sabores, borda e adicionais. No celular, sem
            instalar nada.
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
                        borderColor: "color-mix(in srgb, var(--lp-ember) 55%, transparent)",
                        background: "color-mix(in srgb, var(--lp-ember) 10%, transparent)",
                        fontWeight: 500,
                      }
                    : { borderColor: "var(--lp-ash)", color: "var(--lp-ink-faint)" }
                }
              >
                <span
                  className="size-3 rounded-sm border"
                  style={
                    marcado
                      ? { borderColor: "var(--lp-flame)", background: "var(--lp-flame)" }
                      : { borderColor: "var(--lp-ash)" }
                  }
                />
                {nome as string}
              </div>
            ))}
            <p className="pt-1 text-right text-xs" style={{ color: "var(--lp-ink-faint)" }}>
              média dos sabores ·{" "}
              <strong style={{ color: "var(--lp-ink)" }}>R$ 70,00</strong>
            </p>
          </div>
        </Quadro>

        {/* Trio de sustentação. */}
        <Quadro span="lg:col-span-2" icone={<Layers className="size-5" />}>
          <Titulo>Faixas de preço</Titulo>
          <Texto>
            Junta os sabores em faixas e mexe no preço de todos de uma vez.
          </Texto>
          <div className="mt-auto space-y-1.5 pt-4 font-mono text-xs">
            <div className="lp-fundo flex justify-between rounded-lg px-2.5 py-1.5">
              <span style={{ color: "var(--lp-ink-faint)" }}>Tradicionais</span>
              <span className="font-semibold">R$ 66</span>
            </div>
            <div className="lp-fundo flex justify-between rounded-lg px-2.5 py-1.5">
              <span style={{ color: "var(--lp-ink-faint)" }}>Especiais</span>
              <span className="font-semibold">R$ 74</span>
            </div>
          </div>
        </Quadro>

        <Quadro span="lg:col-span-2" icone={<QrCode className="size-5" />}>
          <Titulo>Pix na hora</Titulo>
          <Texto>
            O cliente paga antes de a moto sair, e o dinheiro cai na conta da
            pizzaria — não passa por você.
          </Texto>
          <p className="mt-auto rounded-lg px-2.5 py-2 text-xs font-medium" style={{ background: "rgb(16 60 34 / 0.55)", color: "#7fd6a0" }}>
            Pago — pode preparar
          </p>
        </Quadro>

        <Quadro span="lg:col-span-2" icone={<Store className="size-5" />}>
          <Titulo>Conta separada</Titulo>
          <Texto>
            Cada dono entra no painel dele e enxerga só a loja dele. Cardápio,
            preços e pedidos isolados.
          </Texto>
          <div className="mt-auto space-y-1.5 pt-4">
            {[
              ["Dom Luigi", "#1e5c2f"],
              ["Bella Napoli", "#c81e1e"],
            ].map(([nome, cor]) => (
              <div
                key={nome}
                className="lp-fundo flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              >
                <span
                  className="size-4 shrink-0 rounded"
                  style={{ background: cor }}
                />
                <span className="truncate text-xs font-medium">{nome}</span>
                <span className="ml-auto shrink-0 text-[11px]" style={{ color: "var(--lp-ink-faint)" }}>
                  painel próprio
                </span>
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
        <h2 className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: "var(--lp-ink-faint)" }}>
          Como uma pizzaria entra
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Você cadastra a loja", "Nome, endereço e login do dono. Ela nasce com tamanhos, categorias, bordas e faixas de preço."],
            ["O dono monta o cardápio", "Sabores, preços, fotos, horários e área de entrega — tudo pelo painel, sem depender de você."],
            ["O cliente pede", "Pelo link ou pelo domínio da pizzaria. O pedido cai na cozinha com aviso sonoro."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="lp-quadro rounded-2xl p-5">
              <span className="grid size-7 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--lp-ember)", color: "#2a1002" }}>
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--lp-ink-dim)" }}>
                {texto}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- fecho */}
      <section className="relative isolate mt-14 overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-10" style={{ background: "var(--lp-coal)", border: "1px solid var(--lp-ash)" }}>
        <div aria-hidden className="lp-ember-field" style={{ opacity: 0.5 }} />
        <div aria-hidden className="lp-veu" style={{ opacity: 0.75 }} />
        <div className="relative">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--lp-ink)" }}>
          Veja funcionando antes de decidir
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--lp-ink-dim)" }}>
          A pizzaria de demonstração está no ar com cardápio completo. Monte uma
          pizza, feche o pedido e veja onde ele cai.
        </p>
        <Link
          href="/bella-napoli"
          className="lp-botao-brasa mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold"
        >
          Abrir a demonstração
        </Link>
        </div>
      </section>

      <footer className="mt-10 text-center text-xs" style={{ color: "var(--lp-ink-faint)" }}>
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
  children,
}: {
  span: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`${span} lp-quadro flex flex-col rounded-3xl p-5`}
    >
      <span className="lp-fundo grid size-10 shrink-0 place-items-center rounded-full" style={{ color: "var(--lp-flame)" }}>
        {icone}
      </span>
      {children}
    </li>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-3 font-semibold">{children}</h2>;
}

function Texto({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--lp-ink-dim)" }}>
      {children}
    </p>
  );
}
