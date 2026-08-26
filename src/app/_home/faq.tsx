import { ChevronDown } from "lucide-react";

/**
 * Perguntas frequentes.
 *
 * `<details>` puro, sem estado nem JavaScript: abre e fecha nativamente, entra
 * na busca do navegador (Ctrl+F acha texto dentro de um fechado) e funciona
 * antes de qualquer script carregar. Um acordeão em React aqui só acrescentaria
 * peso e formas de quebrar.
 *
 * Toda resposta afirma coisa que o sistema faz hoje. FAQ de landing page é onde
 * a promessa exagerada some mais fácil — e reaparece na primeira semana de uso,
 * como reclamação.
 */

const PERGUNTAS: [string, React.ReactNode][] = [
  [
    "Preciso instalar alguma coisa?",
    <>
      Não. É um site: seu cliente abre o link no navegador do celular e pede. E
      você atende pelo painel, de qualquer computador ou celular — também no
      navegador, sem app para baixar nem atualizar.
    </>,
  ],
  [
    "Vocês cobram comissão por pedido?",
    <>
      Não. Você paga a mensalidade e pronto. O dinheiro do pedido vai direto
      para a conta da sua pizzaria — quando o cliente paga online, é a sua conta
      no gateway que recebe, sem passar pela gente. A taxa de cartão ou Pix é a
      do gateway que você escolher, não nossa.
    </>,
  ],
  [
    "Como meu cliente paga?",
    <>
      Do jeito que você deixar ligado. Na entrega: dinheiro, cartão na
      maquininha ou Pix na sua chave. Online: Pix ou cartão com confirmação
      automática — aí o pedido já cai no painel marcado como pago, e a cozinha
      não precisa perguntar se pode preparar.
    </>,
  ],
  [
    "Como o pedido chega na cozinha?",
    <>
      Aparece no painel com aviso sonoro, e sai na impressora térmica na largura
      da bobina de 80 mm. O mesmo pedido também vira imagem para mandar no
      WhatsApp — dá para imprimir pelo celular, no 4G, se a internet da loja
      cair.
    </>,
  ],
  [
    "E se a internet da loja cair no meio do movimento?",
    <>
      O aviso de pedido novo chega no celular do dono mesmo com o painel
      fechado. E quando a conexão cai, a tela avisa em vez de congelar calada —
      que é o pior dos casos: a pizzaria acha que o movimento parou.
    </>,
  ],
  [
    "Posso usar o domínio da minha pizzaria?",
    <>
      Pode. Seu cardápio atende no seu endereço, tipo{" "}
      <span className="whitespace-nowrap font-medium">
        pizzariadobairro.com.br
      </span>
      , sem nome de outra empresa no meio. A gente configura; você só aponta o
      DNS onde o domínio está registrado.
    </>,
  ],
  [
    "Como funciona o preço de pizza com mais de um sabor?",
    <>
      Você escolhe: cobrar o sabor mais caro (o mais comum no Brasil) ou a média
      dos sabores. Quantos sabores cabem é por tamanho — a Grande pode aceitar
      três, a Pequena um só. O teto do sistema é quatro.
    </>,
  ],
  [
    "A taxa de entrega muda por bairro?",
    <>
      Muda, se você quiser. Você cadastra quanto custa entregar em cada bairro,
      e o cliente digita o CEP: o endereço se preenche sozinho e a taxa do
      bairro dele aparece antes de fechar o pedido. Endereço fora da sua área
      pode ser recusado na hora.
    </>,
  ],
  [
    "Quem cadastra meu cardápio?",
    <>
      A gente entrega a loja montada — tamanhos, categorias, bordas e faixas de
      preço já criados. Os sabores, preços e fotos você põe pelo painel, e muda
      quando quiser sem depender de ninguém. Se preferir, a gente cadastra o
      primeiro cardápio com você.
    </>,
  ],
];

export function Faq() {
  return (
    <section id="faq" className="mt-16 scroll-mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
        Perguntas frequentes
      </h2>

      <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {PERGUNTAS.map(([pergunta, resposta]) => (
          <details key={pergunta} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-medium transition hover:bg-background [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">{pergunta}</span>
              <ChevronDown className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-muted">
              {resposta}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
