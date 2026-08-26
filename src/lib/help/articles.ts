import type { Article } from "./types";

/**
 * Manual da pizzaria.
 *
 * Escrito para quem atende o balcão, não para quem programa: cada artigo
 * responde uma pergunta que alguém faria no meio do expediente. Só entra aqui
 * o que já existe no sistema — documentar o que não existe é pior que não
 * documentar nada.
 *
 * STATUS: conteúdo pronto, interface adiada. As telas da central de ajuda
 * (índice por seção, busca e página do artigo) ficaram para depois, a pedido.
 * Ao retomar, o trabalho que sobra é só de tela: este arquivo e `types.ts`
 * já entregam tudo que ela precisa, inclusive `articleText` para a busca.
 *
 * Ao mexer no sistema, mexa aqui junto: artigo que descreve tela que mudou
 * é pior que artigo nenhum.
 */

export const SECTIONS = [
  "Primeiros passos",
  "Cardápio",
  "Pedidos",
  "Entrega e horários",
  "Sua loja",
  "Quando algo dá errado",
] as const;

export const ARTICLES: Article[] = [
  // ------------------------------------------------ primeiros passos
  {
    slug: "entrar-no-painel",
    title: "Entrar no painel",
    summary: "Onde acessar e o que fazer se a senha não funcionar.",
    section: "Primeiros passos",
    keywords: ["login", "acesso", "senha", "entrar", "sistema"],
    body: [
      {
        kind: "p",
        text: "O painel é onde você vê os pedidos e cuida do cardápio. Ele funciona no computador, no tablet e no celular — é a mesma tela, adaptada ao tamanho.",
      },
      {
        kind: "steps",
        items: [
          "Abra o endereço do painel no navegador.",
          "Digite o e-mail e a senha que você recebeu.",
          "Pronto: a tela de pedidos abre direto.",
        ],
      },
      {
        kind: "tip",
        text: "Salve o painel na tela inicial do celular. No Chrome, toque nos três pontinhos e escolha “Adicionar à tela inicial”. Ele passa a abrir como um aplicativo.",
      },
      {
        kind: "p",
        text: "Esqueceu a senha? Clique em “Esqueci minha senha” na tela de entrada. Você recebe um link por e-mail que vale por 30 minutos.",
      },
    ],
  },
  {
    slug: "as-tres-abas",
    title: "As três abas do painel",
    summary: "O que faz cada parte: Pedidos, Cardápio e Configurações.",
    section: "Primeiros passos",
    keywords: ["menu", "abas", "navegar", "onde fica"],
    body: [
      {
        kind: "p",
        text: "Tudo no painel está em três lugares, e você provavelmente vai passar 90% do tempo no primeiro.",
      },
      {
        kind: "list",
        items: [
          "Pedidos — os pedidos que estão acontecendo agora e o histórico do que já saiu.",
          "Cardápio — sabores, tamanhos, bordas, adicionais, bebidas e categorias.",
          "Configurações — horários, taxas de entrega, formas de pagamento, logo e cores.",
        ],
      },
      {
        kind: "p",
        text: "No alto da tela, ao lado do nome da pizzaria, fica o botão que abre o cardápio como o cliente vê. Vale conferir por ali sempre que mudar alguma coisa.",
      },
    ],
  },

  // ------------------------------------------------------- cardápio
  {
    slug: "cadastrar-tamanhos",
    title: "Cadastrar os tamanhos de pizza",
    summary: "Comece por aqui: o preço dos sabores depende dos tamanhos.",
    section: "Cardápio",
    keywords: ["tamanho", "pequena", "média", "grande", "família", "fatias"],
    body: [
      {
        kind: "warn",
        text: "Cadastre os tamanhos antes dos sabores. Como cada sabor tem um preço para cada tamanho, sem tamanho cadastrado não há onde colocar o preço.",
      },
      {
        kind: "steps",
        items: [
          "Vá em Cardápio e escolha a aba Tamanhos.",
          "Clique em “Novo tamanho”.",
          "Preencha o nome (Pequena, Média, Grande, Família…), quantas fatias tem e quantos sabores cabem.",
          "Clique em Criar.",
        ],
      },
      {
        kind: "p",
        text: "O campo “Máx. de sabores” é o que permite meio a meio. Se você colocar 2 na Grande, o cliente pode dividir em dois sabores; se colocar 1, aquele tamanho só sai inteiro.",
      },
    ],
  },
  {
    slug: "cadastrar-sabores",
    title: "Cadastrar sabores e preços",
    summary: "Nome, descrição e o preço de cada tamanho.",
    section: "Cardápio",
    keywords: ["sabor", "preço", "cardápio", "pizza", "calabresa", "valor"],
    body: [
      {
        kind: "steps",
        items: [
          "Em Cardápio, aba Sabores, clique em “Novo sabor”.",
          "Escreva o nome e a descrição com os ingredientes.",
          "Preencha o preço de cada tamanho nos campos que aparecem.",
          "Escolha a categoria (Pizzas salgadas, Pizzas doces…).",
          "Clique em Criar.",
        ],
      },
      {
        kind: "tip",
        text: "A descrição é o que convence. “Calabresa artesanal fatiada, cebola roxa e azeitona preta” vende mais que “calabresa”.",
      },
      {
        kind: "p",
        text: "Deixar o preço de um tamanho em branco tem um uso: aquele sabor deixa de aparecer naquele tamanho. Serve para sabores que só saem na família, por exemplo.",
      },
    ],
  },
  {
    slug: "meio-a-meio",
    title: "Como funciona o preço da meio a meio",
    summary: "Cobrar o sabor mais caro ou a média — você escolhe.",
    section: "Cardápio",
    keywords: ["meio a meio", "dois sabores", "metade", "preço", "média"],
    body: [
      {
        kind: "p",
        text: "Quando o cliente monta uma pizza com mais de um sabor, o sistema precisa decidir quanto cobrar. Existem duas escolas, e as duas são comuns no Brasil.",
      },
      {
        kind: "list",
        items: [
          "Cobrar o sabor mais caro — o padrão. Metade Margherita (R$ 39) e metade Pepperoni (R$ 47) custa R$ 47.",
          "Cobrar a média — a mesma pizza sairia por R$ 43.",
        ],
      },
      {
        kind: "steps",
        items: [
          "Vá em Configurações.",
          "Procure “Preço da pizza com mais de um sabor”.",
          "Escolha a regra e salve.",
        ],
      },
      {
        kind: "warn",
        text: "Essa escolha vale para o cardápio inteiro e muda o preço de toda pizza de mais de um sabor. Pense antes de trocar com a loja aberta.",
      },
    ],
  },
  {
    slug: "bordas-e-adicionais",
    title: "Bordas e adicionais",
    summary: "Itens que somam ao preço da pizza.",
    section: "Cardápio",
    keywords: ["borda", "catupiry", "cheddar", "adicional", "extra", "recheada"],
    body: [
      {
        kind: "p",
        text: "Borda e adicional funcionam igual: nome e quanto somam. A diferença é que o cliente escolhe uma borda só, e pode marcar vários adicionais.",
      },
      {
        kind: "steps",
        items: [
          "Em Cardápio, escolha a aba Bordas ou Adicionais.",
          "Clique em “Nova borda” ou “Novo adicional”.",
          "Escreva o nome e o valor que soma.",
          "Clique em Criar.",
        ],
      },
      {
        kind: "tip",
        text: "Cadastre uma borda “Sem borda recheada” com preço zero e deixe ela em primeiro lugar. Assim o cliente enxerga que existe a opção de não levar.",
      },
    ],
  },
  {
    slug: "bebidas-e-sobremesas",
    title: "Bebidas, sobremesas e outros itens",
    summary: "Itens de preço fixo, que não dependem de tamanho.",
    section: "Cardápio",
    keywords: ["bebida", "refrigerante", "sobremesa", "cerveja", "água", "combo"],
    body: [
      {
        kind: "p",
        text: "Tudo que tem um preço só — refrigerante, cerveja, sobremesa, combo — entra na aba “Bebidas e extras”.",
      },
      {
        kind: "steps",
        items: [
          "Em Cardápio, abra a aba “Bebidas e extras”.",
          "Clique em “Novo item”.",
          "Preencha nome, descrição, preço e categoria.",
          "Clique em Criar.",
        ],
      },
      {
        kind: "p",
        text: "No cardápio do cliente esses itens entram com um botão de mais: um toque e vão direto para o carrinho, sem tela de montagem.",
      },
    ],
  },
  {
    slug: "acabou-o-item",
    title: "Acabou um sabor no meio da noite",
    summary: "Tire do ar sem apagar, e traga de volta amanhã.",
    section: "Cardápio",
    keywords: ["acabou", "esgotado", "sumiu", "ocultar", "desativar", "apagar"],
    body: [
      {
        kind: "p",
        text: "Acabou o catupiry? Não apague o sabor. Use “Ocultar do cardápio”: ele some para o cliente na hora e volta com um clique quando chegar mercadoria.",
      },
      {
        kind: "steps",
        items: [
          "Vá em Cardápio e encontre o item.",
          "Clique em “Ocultar do cardápio”.",
          "Quando voltar a ter, clique em “Mostrar no cardápio”.",
        ],
      },
      {
        kind: "warn",
        text: "Apagar é definitivo e leva junto os preços cadastrados. Só apague o que saiu do cardápio de vez.",
      },
    ],
  },

  // -------------------------------------------------------- pedidos
  {
    slug: "receber-pedidos",
    title: "Receber e acompanhar pedidos",
    summary: "Como o pedido chega e o que aparece na tela.",
    section: "Pedidos",
    keywords: ["pedido", "novo", "som", "alerta", "chegou", "tela"],
    body: [
      {
        kind: "p",
        text: "Deixe a aba Pedidos aberta durante o expediente. Ela se atualiza sozinha e toca um alerta quando entra pedido novo.",
      },
      {
        kind: "p",
        text: "Cada pedido mostra o código, o horário, o nome e o telefone do cliente (clicável, para ligar), o endereço, os itens e a forma de pagamento.",
      },
      {
        kind: "tip",
        text: "As observações do cliente aparecem em destaque amarelo. É ali que vem “sem cebola” e “bem assada” — vale ler antes de mandar para o forno.",
      },
      {
        kind: "warn",
        text: "O alerta sonoro só toca se a página estiver aberta no navegador, e alguns navegadores só liberam som depois do primeiro clique na página. Ao abrir o painel, clique em qualquer lugar da tela uma vez.",
      },
    ],
  },
  {
    slug: "mudar-status",
    title: "Mudar o status do pedido",
    summary: "Confirmar, preparar, sair para entrega, concluir.",
    section: "Pedidos",
    keywords: ["status", "confirmar", "preparar", "entrega", "concluir", "andamento"],
    body: [
      {
        kind: "p",
        text: "Cada pedido tem um botão escuro que leva para o próximo passo. O cliente acompanha essa mudança na tela dele, em tempo real.",
      },
      {
        kind: "list",
        items: [
          "Confirmar — você viu o pedido e vai fazer.",
          "Começar a preparar — foi para a cozinha.",
          "Saiu para entrega — está com o entregador.",
          "Concluir — foi entregue. O pedido sai da tela de ativos.",
        ],
      },
      {
        kind: "p",
        text: "Em pedidos de retirada, no lugar de “saiu para entrega” aparece “marcar pronto”.",
      },
      {
        kind: "tip",
        text: "Manter o status em dia reduz ligação de cliente perguntando se o pedido saiu — ele mesmo consulta pelo link.",
      },
    ],
  },
  {
    slug: "cancelar-pedido",
    title: "Cancelar um pedido",
    summary: "Como cancelar e por que vale escrever o motivo.",
    section: "Pedidos",
    keywords: ["cancelar", "desistiu", "trote", "motivo"],
    body: [
      {
        kind: "steps",
        items: [
          "No pedido, clique em Cancelar.",
          "Escreva o motivo — o cliente vê esse texto.",
          "Confirme.",
        ],
      },
      {
        kind: "p",
        text: "O motivo aparece na tela de acompanhamento do cliente. “Acabou a massa hoje, desculpe” evita uma ligação irritada bem melhor que um cancelamento silencioso.",
      },
      {
        kind: "p",
        text: "Pedido cancelado continua no histórico e não entra na soma de faturamento.",
      },
    ],
  },
  {
    slug: "imprimir-cupom",
    title: "Imprimir o cupom do pedido",
    summary: "Pelo computador ligado à impressora térmica.",
    section: "Pedidos",
    keywords: ["imprimir", "cupom", "impressora", "térmica", "papel", "80mm"],
    body: [
      {
        kind: "p",
        text: "Todo pedido tem um botão de impressora no canto do card. Ele abre o cupom já no formato de 80mm e manda para a impressora.",
      },
      {
        kind: "steps",
        items: [
          "Instale a impressora térmica no computador como qualquer impressora.",
          "No pedido, clique no ícone de impressora.",
          "O cupom abre e a janela de impressão aparece sozinha.",
          "Confirme.",
        ],
      },
      {
        kind: "tip",
        text: "Dá para o cupom sair sem nem aparecer a janela de impressão. É uma configuração do navegador da loja — peça para quem cuida da informática, ou fale com a gente.",
      },
    ],
  },
  {
    slug: "imprimir-pelo-celular",
    title: "Imprimir o pedido pelo celular",
    summary: "Quando a internet da loja cai e sobra só o 4G.",
    section: "Pedidos",
    keywords: ["celular", "whatsapp", "imagem", "bluetooth", "sem internet", "4g", "caiu"],
    body: [
      {
        kind: "p",
        text: "Todo cupom tem o botão “Imagem para WhatsApp”. Ele gera uma foto do pedido já no tamanho certo da bobina.",
      },
      {
        kind: "steps",
        items: [
          "Abra o cupom do pedido no celular.",
          "Toque em “Imagem para WhatsApp”.",
          "Salve ou compartilhe a imagem.",
          "Abra o aplicativo da sua impressora Bluetooth e mande imprimir a imagem.",
        ],
      },
      {
        kind: "p",
        text: "Isso funciona com a internet da loja fora do ar, porque o celular usa a rede dele. E os pedidos continuam entrando normalmente nesse período — o cardápio do cliente não depende da internet da pizzaria.",
      },
    ],
  },

  // --------------------------------------------- entrega e horários
  {
    slug: "horarios",
    title: "Horários de funcionamento",
    summary: "Cadastre os turnos e o cardápio abre e fecha sozinho.",
    section: "Entrega e horários",
    keywords: ["horário", "abrir", "fechar", "turno", "funcionamento", "dia"],
    body: [
      {
        kind: "p",
        text: "Em Configurações, no bloco de horários, cada dia da semana tem seus turnos. Dia sem turno é dia fechado.",
      },
      {
        kind: "steps",
        items: [
          "Vá em Configurações e desça até “Horários de funcionamento”.",
          "No dia desejado, clique em “turno”.",
          "Ajuste a hora de abrir e de fechar.",
          "Salve as configurações no fim da página.",
        ],
      },
      {
        kind: "tip",
        text: "Se você fecha depois da meia-noite, cadastre normalmente: das 18:00 às 00:30. O sistema entende que o turno atravessa o dia e continua aceitando pedido à meia-noite e dez.",
      },
      {
        kind: "p",
        text: "Fora do horário, o cliente ainda consegue montar o pedido e ver o cardápio — só não consegue enviar. Ele vê um aviso explicando e a hora em que você abre.",
      },
    ],
  },
  {
    slug: "fechar-agora",
    title: "Fechar a loja agora",
    summary: "Cozinha lotada ou acabou a massa: feche sem mexer no horário.",
    section: "Entrega e horários",
    keywords: ["fechar", "parar", "pausar", "lotado", "emergência", "abrir"],
    body: [
      {
        kind: "p",
        text: "No alto do painel há um seletor com três opções. Ele vale por cima do horário cadastrado.",
      },
      {
        kind: "list",
        items: [
          "Seguir horário — o normal: abre e fecha conforme o cadastro.",
          "Forçar aberto — aceita pedido mesmo fora do horário.",
          "Forçar fechado — para de aceitar pedidos agora.",
        ],
      },
      {
        kind: "warn",
        text: "Lembre de voltar para “Seguir horário” depois. Esquecer no “forçar fechado” significa passar o dia seguinte inteiro sem vender.",
      },
    ],
  },
  {
    slug: "taxa-por-bairro",
    title: "Taxa de entrega por bairro",
    summary: "Cada bairro com seu preço, e a área que você atende.",
    section: "Entrega e horários",
    keywords: ["taxa", "entrega", "frete", "bairro", "cep", "área", "distância"],
    body: [
      {
        kind: "p",
        text: "Você cadastra quanto custa entregar em cada bairro. O cliente digita o CEP no pedido, e a taxa aparece sozinha — ele não precisa perguntar.",
      },
      {
        kind: "steps",
        items: [
          "Vá em Configurações e procure “Área de entrega”.",
          "Escreva o nome do bairro e o valor da taxa.",
          "Clique em Adicionar.",
          "Repita para cada bairro que você atende.",
        ],
      },
      {
        kind: "p",
        text: "Abaixo da lista há uma opção para recusar endereço fora dos bairros cadastrados. Marcada, o cliente de fora da área recebe um aviso e não consegue pedir entrega. Desmarcada, o pedido passa cobrando a taxa padrão.",
      },
      {
        kind: "tip",
        text: "Enquanto você não cadastrar bairro nenhum, toda entrega custa a taxa única que está em Configurações. Nada quebra por não configurar.",
      },
    ],
  },
  {
    slug: "pedido-minimo-e-pagamento",
    title: "Pedido mínimo e formas de pagamento",
    summary: "O que você aceita receber e a partir de quanto entrega.",
    section: "Entrega e horários",
    keywords: ["pagamento", "pix", "dinheiro", "cartão", "troco", "mínimo", "maquininha"],
    body: [
      {
        kind: "p",
        text: "Em Configurações você marca o que aceita: dinheiro, cartão na entrega e Pix na chave. Só aparece para o cliente aquilo que estiver marcado.",
      },
      {
        kind: "p",
        text: "Marcando Pix, preencha a chave. Ela aparece para o cliente na hora de escolher o pagamento, e ele manda o comprovante pelo WhatsApp.",
      },
      {
        kind: "p",
        text: "Quem escolhe dinheiro informa para quanto precisa de troco, e esse valor sai no cupom — o entregador já sai com o troco certo.",
      },
      {
        kind: "p",
        text: "O pedido mínimo bloqueia o envio e mostra ao cliente quanto falta para atingir o valor.",
      },
    ],
  },

  // ------------------------------------------------------- sua loja
  {
    slug: "logo-e-cores",
    title: "Logo e cor da sua marca",
    summary: "Deixe o cardápio com a cara da pizzaria.",
    section: "Sua loja",
    keywords: ["logo", "logotipo", "cor", "marca", "imagem", "foto", "identidade"],
    body: [
      {
        kind: "p",
        text: "A cor que você escolher vale para o cardápio inteiro: botões, destaques e detalhes. Escolha a cor da sua marca.",
      },
      {
        kind: "steps",
        items: [
          "Vá em Configurações, no bloco Identidade.",
          "Clique em “Enviar imagem” e escolha a logo do celular ou do computador.",
          "Clique no quadradinho de cor e escolha a cor da marca.",
          "Salve as configurações.",
        ],
      },
      {
        kind: "tip",
        text: "Não precisa preparar a imagem antes: o sistema corta no quadrado e reduz sozinho. Foto tirada na hora funciona.",
      },
      {
        kind: "p",
        text: "Se preferir usar uma imagem que já está na internet, cole o endereço dela no campo abaixo do botão.",
      },
    ],
  },
  {
    slug: "endereco-e-contato",
    title: "Endereço, telefone e WhatsApp",
    summary: "Como o cliente encontra e fala com você.",
    section: "Sua loja",
    keywords: ["endereço", "telefone", "whatsapp", "contato", "mapa", "como chegar"],
    body: [
      {
        kind: "p",
        text: "O endereço aparece no cardápio como link: um toque abre o aplicativo de mapas com a rota até a pizzaria. Vale principalmente para quem vai retirar.",
      },
      {
        kind: "p",
        text: "O WhatsApp vira o botão “Falar com a pizzaria”, que o cliente usa para tirar dúvida ou mandar comprovante do Pix. Preencha com DDD, só números.",
      },
      {
        kind: "warn",
        text: "Escreva o endereço completo, com número, bairro e cidade. Endereço pela metade leva o mapa para o lugar errado.",
      },
    ],
  },
  {
    slug: "trocar-senha",
    title: "Trocar a senha",
    summary: "Pelo link de recuperação, a qualquer momento.",
    section: "Sua loja",
    keywords: ["senha", "trocar", "mudar", "segurança", "esqueci"],
    body: [
      {
        kind: "steps",
        items: [
          "Saia do painel ou abra a tela de entrada.",
          "Clique em “Esqueci minha senha”.",
          "Digite seu e-mail e envie.",
          "Abra o link que chegou e escolha a senha nova.",
        ],
      },
      {
        kind: "p",
        text: "Trocar a senha desconecta todos os aparelhos que estavam usando o painel. Se alguém tinha acesso indevido, perde na hora.",
      },
      {
        kind: "tip",
        text: "Troque a senha quando alguém sair da equipe. É mais rápido que qualquer outra providência.",
      },
    ],
  },

  // ------------------------------------------ quando algo dá errado
  {
    slug: "cliente-nao-consegue-pedir",
    title: "O cliente diz que não consegue pedir",
    summary: "A lista do que verificar, na ordem.",
    section: "Quando algo dá errado",
    keywords: ["não consigo", "erro", "problema", "cliente", "reclamação", "fechado"],
    body: [
      {
        kind: "p",
        text: "Na maioria das vezes é uma destas quatro coisas, e todas se resolvem em segundos:",
      },
      {
        kind: "steps",
        items: [
          "A loja está fechada. Veja o indicador no alto do painel: se estiver “Fechado”, confira o horário cadastrado e o seletor de abertura.",
          "O endereço está fora da área. Se você cadastrou bairros e marcou para recusar de fora, o cliente de outro bairro não consegue pedir entrega. Ele ainda pode escolher retirada.",
          "O pedido está abaixo do mínimo. O cliente vê quanto falta, mas nem sempre lê.",
          "Acabou o item que ele quer. Se você ocultou um sabor, ele some do cardápio — o cliente pode estar olhando um print antigo.",
        ],
      },
      {
        kind: "tip",
        text: "Abra o cardápio pelo botão ao lado do nome da pizzaria, no alto do painel. Você vê exatamente o que o cliente está vendo.",
      },
    ],
  },
  {
    slug: "nao-chegam-pedidos",
    title: "Os pedidos pararam de aparecer",
    summary: "Quase sempre é a internet da loja.",
    section: "Quando algo dá errado",
    keywords: ["parou", "sumiu", "internet", "caiu", "não atualiza", "travou"],
    body: [
      {
        kind: "p",
        text: "A tela de pedidos se atualiza sozinha a cada poucos segundos. Se a internet da loja cai, ela para de receber novidades — e fica com cara de que ninguém pediu nada.",
      },
      {
        kind: "steps",
        items: [
          "Teste a internet abrindo qualquer outro site.",
          "Se estiver fora, os pedidos continuam sendo registrados: o cardápio do cliente não depende da internet da pizzaria.",
          "Quando a conexão voltar, atualize a página e tudo que entrou aparece de uma vez.",
          "Enquanto isso, acompanhe pelo celular usando os dados móveis.",
        ],
      },
      {
        kind: "warn",
        text: "Nenhum pedido se perde nesse período. Eles ficam guardados e aparecem quando a conexão voltar.",
      },
    ],
  },
  {
    slug: "cupom-sai-cortado",
    title: "O cupom sai cortado ou desalinhado",
    summary: "Ajustes na impressora, não no sistema.",
    section: "Quando algo dá errado",
    keywords: ["impressão", "cortado", "torto", "margem", "papel", "bobina"],
    body: [
      {
        kind: "p",
        text: "O cupom é feito para bobina de 80mm, que é a mais comum. Se sair torto, o ajuste costuma ser na impressora:",
      },
      {
        kind: "list",
        items: [
          "Confira se a bobina é de 80mm e não de 58mm.",
          "Nas configurações de impressão do navegador, deixe as margens em zero e a escala em 100%.",
          "Desmarque “cabeçalhos e rodapés” — é o que faz sair a data e o endereço do site no papel.",
        ],
      },
      {
        kind: "tip",
        text: "Se preferir, use a imagem do cupom em vez da impressão direta: ela já sai no tamanho exato da bobina.",
      },
    ],
  },
];

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
