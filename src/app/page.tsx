import Link from "next/link";
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14 sm:py-20">
      {/* ---------------------------------------------------------- topo */}
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <ChefHat className="size-3.5" />
        Fornalha
      </span>

      <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        Seu cardápio, no seu endereço.
        <br />
        <span className="text-brand">Sem comissão por pedido.</span>
      </h1>

      <p className="mt-5 max-w-xl text-lg text-muted">
        Seu cliente pede no site da sua pizzaria, o pedido cai direto na
        cozinha e o dinheiro vai para a sua conta. Sem intermediário ficando
        com um pedaço de cada pizza.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/bella-napoli"
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink transition hover:opacity-90"
        >
          Ver cardápio de demonstração
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold transition hover:border-stone-300"
        >
          Entrar no painel
        </Link>
      </div>

      {/* --------------------------------------------------------- bento */}
      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Destaque: o que diferencia. Ganha o dobro e uma janela de navegador. */}
        <Quadro span="lg:col-span-4" icone={<Globe className="size-5" />}>
          <Titulo>Seu endereço na internet</Titulo>
          <Texto>
            Seu cliente digita o endereço da sua pizzaria e cai no seu
            cardápio. Sem link de terceiro, sem nome de outra empresa no meio
            — a marca que aparece é a sua.
          </Texto>

          {/* mt-auto: encosta no rodapé do quadro, para o bloco grande não
              ficar com um vão embaixo ao lado do vizinho mais alto. */}
          <div className="mt-auto overflow-hidden rounded-xl border border-line bg-background pt-5">
            <div className="mx-3 flex items-center gap-1.5 rounded-t-lg border border-b-0 border-line bg-surface px-3 py-2">
              <span className="size-2 rounded-full bg-stone-300" />
              <span className="size-2 rounded-full bg-stone-300" />
              <span className="size-2 rounded-full bg-stone-300" />
              <span className="ml-2 truncate rounded-md bg-background px-2.5 py-1 font-mono text-[11px] text-stone-600">
                pizzariadobairro.com.br
              </span>
            </div>

            <div className="mx-3 rounded-b-lg border border-line bg-surface">
              <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
                <span className="grid size-7 place-items-center rounded-lg bg-brand text-[11px] font-bold text-brand-ink">
                  P
                </span>
                <span className="text-sm font-semibold">Pizzaria do Bairro</span>
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Aberta
                </span>
              </div>

              {[
                ["Calabresa", "Cebola roxa e azeitona", "66,00"],
                ["Portuguesa", "Presunto, ovo e ervilha", "66,00"],
              ].map(([nome, desc, preco]) => (
                <div
                  key={nome}
                  className="flex items-center gap-3 px-3 py-2.5 [&+&]:border-t [&+&]:border-line"
                >
                  <span className="size-9 shrink-0 rounded-lg bg-stone-100" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {nome}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
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
                        borderColor: "var(--brand)",
                        background: "color-mix(in srgb, var(--brand) 6%, white)",
                        fontWeight: 500,
                      }
                    : { borderColor: "var(--line)", color: "var(--muted)" }
                }
              >
                <span
                  className="size-3 rounded-sm border"
                  style={
                    marcado
                      ? { borderColor: "var(--brand)", background: "var(--brand)" }
                      : { borderColor: "var(--line)" }
                  }
                />
                {nome as string}
              </div>
            ))}
            <p className="pt-1 text-right text-xs text-muted">
              média dos sabores ·{" "}
              <strong className="text-foreground">R$ 70,00</strong>
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
            <div className="flex justify-between rounded-lg bg-background px-2.5 py-1.5">
              <span className="text-muted">Tradicionais</span>
              <span className="font-semibold">R$ 66</span>
            </div>
            <div className="flex justify-between rounded-lg bg-background px-2.5 py-1.5">
              <span className="text-muted">Especiais</span>
              <span className="font-semibold">R$ 74</span>
            </div>
          </div>
        </Quadro>

        <Quadro span="lg:col-span-2" icone={<QrCode className="size-5" />}>
          <Titulo>Pago antes de sair</Titulo>
          <Texto>
            O cliente paga por Pix e o dinheiro cai na sua conta, na hora. Você
            escolhe o gateway; a taxa é dele, não nossa.
          </Texto>
          <p className="mt-auto rounded-lg px-2.5 py-2 text-xs font-medium" style={{ background: "rgb(16 60 34 / 0.55)", color: "#7fd6a0" }}>
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
                className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-1.5"
              >
                <span className="text-muted">{bairro}</span>
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
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Como sua pizzaria começa
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["A gente monta sua loja", "Criamos sua conta e o cardápio base — tamanhos, categorias, bordas e faixas de preço prontos."],
            ["Você põe os sabores", "Preços, fotos, horários e área de entrega, pelo painel. Sem depender de ninguém para mudar preço."],
            ["Seus clientes pedem", "Pelo seu link ou pelo seu domínio. O pedido cai na cozinha com aviso sonoro."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm text-muted">{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- fecho */}
      <section className="mt-14 rounded-3xl bg-foreground px-6 py-10 text-center sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight text-background sm:text-3xl">
          Veja funcionando antes de decidir
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
          Uma pizzaria de exemplo está no ar com cardápio completo. Monte uma
          pizza, feche o pedido e veja como ele chega na cozinha.
        </p>
        <Link
          href="/bella-napoli"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink transition hover:opacity-90"
        >
          Abrir a demonstração
        </Link>
      </section>

      <footer className="mt-10 text-center text-xs text-muted">
        Fornalha · sistema de pedidos para pizzarias
      </footer>
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
      className={`${span} flex flex-col rounded-3xl border border-line bg-surface p-5 transition hover:border-stone-300`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
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
    <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
  );
}
