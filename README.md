# Fornalha — sistema de pedidos para pizzarias

Multi-pizzaria: um só sistema, um link por cliente. Cada pizzaria tem cardápio,
cores, horários e pedidos próprios.

- **App do cliente** — `/{slug}` — cardápio, montador de pizza (tamanho, sabores,
  borda, adicionais), carrinho, checkout e acompanhamento do pedido.
- **Painel da pizzaria** — `/admin` — pedidos com aviso sonoro, edição do
  cardápio e configurações da loja.

Next.js 16 · React 19 · Tailwind 4 · Postgres (Supabase).

---

## Rodar localmente

```bash
npm install
cp .env.example .env.local     # preencha DATABASE_URL
npm run db:seed                # cria as tabelas + pizzaria de demonstração
npm run dev
```

- Cardápio da demo: http://localhost:3000/bella-napoli
- Painel: http://localhost:3000/admin

Para acessar o painel da demo, crie um login:

```bash
npm run vincular-dono -- --slug=bella-napoli --email=voce@exemplo.com --senha=umaSenhaForte
```

### Banco

Qualquer Postgres serve — Supabase, Neon, Vercel Postgres ou um local. Use
sempre a string do **pooler** (a do Supabase tem `pooler` no host e porta 6543):
a conexão direta esgota o limite de conexões em serverless e, no Supabase, só
responde por IPv6.

```bash
npm run db:migrate    # só as tabelas
npm run db:seed       # tabelas + pizzaria de demonstração
```

As migrations são idempotentes: rodar de novo não quebra nada.

---

## Colocar uma pizzaria nova no ar

Um comando cria o login do dono, a pizzaria e um cardápio base
(tamanhos, categorias e bordas):

```bash
npm run nova-pizzaria -- --slug=dom-luigi --nome="Dom Luigi" --email=dono@domluigi.com.br --senha=umaSenhaForte --cor=#1e5c2f --whatsapp=11987654321
```

Depois é só entregar dois links ao cliente: `/dom-luigi` para divulgar e
`/admin` para ele cadastrar os sabores.

---

## Como o dinheiro é calculado

O navegador **nunca** manda preço. O carrinho carrega apenas IDs; o servidor
recalcula tudo com o cardápio do momento ([`src/lib/pricing.ts`](src/lib/pricing.ts))
e grava os valores congelados no pedido. Se um sabor sair do ar entre montar e
finalizar, o pedido falha em vez de gravar um valor inventado.

Pizza de vários sabores segue a regra escolhida pela pizzaria em
**Configurações → Preço da pizza com mais de um sabor**: cobrar o sabor mais
caro (padrão no Brasil) ou a média. Quantos sabores cabem é por tamanho, em
**Cardápio → Tamanhos → até N sabores** — o teto do sistema é 4.

### Faixas de preço

Em vez de digitar o preço sabor por sabor, a pizzaria junta os sabores em
faixas — Tradicionais, Especiais, Premium — e cada faixa guarda um preço por
tamanho. Mexer na faixa move todos os sabores dela de uma vez.

O preço próprio do sabor continua existindo e vale como **exceção**: onde ele
existir, passa por cima da faixa naquele tamanho. É o que permite a camarão
custar mais que as outras especiais sem virar uma faixa só para ela.

A resolução acontece uma vez só, ao ler o cardápio
([`menu.ts`](src/lib/menu.ts)) — `pricing.ts` continua lendo
`flavor.prices[size]` sem saber que faixa existe. Cardápio antigo, sem faixa
nenhuma, segue funcionando exatamente como antes.

### Fotos

Sabores e itens ganham foto em **Cardápio → o item → Foto**. O navegador corta
no quadrado e reduz para 600px WebP antes de enviar (~50 KB cada), e a imagem
fica no próprio banco — servida por `/api/foto/{sabor|produto}/{id}` com cache
e ETag, nunca embutida no cardápio. Sessenta sabores ficam em torno de 3 MB, o
que não justificou contratar um storage à parte; o custo é um backup mais
pesado.

## Segurança

- Nenhum acesso do navegador ao banco: tudo passa pelo servidor, e toda
  consulta filtra por `tenant_id`.
- Senhas com scrypt (`node:crypto`), sessões em cookie httpOnly. O banco guarda
  só o SHA-256 do token de sessão — vazamento do banco não vira acesso.
- Nenhum pedido é público. O cliente acompanha pelo `public_token` do link.
- Toda Server Action confere a sessão — Server Actions são endpoints POST
  abertos, então proteger só a tela não bastaria.

## Formas de pagamento

Na entrega: dinheiro, cartão na maquininha e Pix na chave (com comprovante pelo
WhatsApp). O pedido cai no painel na hora.

Online: Pix e cartão com confirmação automática, em **Painel → Pagamentos**.
Cada pizzaria conecta o próprio gateway e o dinheiro cai direto na conta dela —
nada passa pela agência.

### Gateways

Pronto: **Mercado Pago**. A camada aceita qualquer outro; o que falta em cada
um é só o arquivo do adaptador.

```
src/lib/payments/
  types.ts               o contrato que todo gateway implementa
  registry.ts            quais estão ligados no sistema
  accounts.ts            onde cada pizzaria recebe (credencial cifrada)
  charges.ts             criar cobrança, confirmar, reconciliar
  providers/
    mercadopago.ts       ← um arquivo por gateway
```

Para acrescentar Asaas, Pagar.me (Stone), InfinitePay, PicPay ou Stripe: escreva
`providers/<nome>.ts` implementando `PaymentProvider` e some uma linha em
`registry.ts`. Checkout, painel, banco e tela de acompanhamento não mudam.

**Nubank não entra nessa lista** e não precisa: o Nubank não vende API de
checkout para lojista. "Pagar pelo Nubank" é pagar por Pix, e Pix é padrão do
Banco Central — a cobrança Pix gerada em qualquer gateway daqui é paga de
qualquer banco, sem integração nenhuma.

### Duas regras que valem para todos

1. **O webhook nunca decide nada.** Ele diz qual cobrança olhar; o desfecho sai
   sempre de uma consulta ao gateway. Endereço de webhook vaza, e um POST
   forjado não pode liberar pizza. O tipo `WebhookRead` nem tem campo de status,
   para que nenhum adaptador consiga devolver um por engano.
2. **O valor é conferido.** Um pedido de R$ 90 pago com R$ 0,01 não vira pago,
   por mais que o gateway responda "approved".

Webhook perdido não trava pedido: a própria tela do cliente, aberta no QR, puxa
a reconciliação (`/api/pagamentos/conferir`), e `reconcilePending()` varre o que
sobrou.

### Chave de criptografia

As credenciais dos gateways ficam cifradas (AES-256-GCM) na coluna
`tenant_payment_accounts.credentials`. A chave mora no ambiente, nunca no banco:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# → PAYMENTS_ENCRYPTION_KEY
```

Trocar a chave torna ilegível o que já foi salvo, e cada pizzaria precisaria
reconectar seu gateway. Guarde-a junto com a `DATABASE_URL`.

### Conferir as regras

```bash
npm run testa-pagamentos
```

Verifica no banco as invariantes que quebram caladas: cobrança encontrada pela
pizzaria certa, webhook repetido barrado, credencial que volta íntegra do
`bytea`, pedido não pago fora da fila da cozinha. Roda tudo dentro de uma
transação sempre desfeita — pode apontar para produção sem deixar rastro.

```bash
npm run testa-cardapio
```

O mesmo para a conta que o cliente paga: faixa herdada, exceção do sabor
vencendo a faixa, média de três sabores, arredondamento a dois centavos e o
sabor que sobrevive quando a faixa é apagada.

## Estrutura

```
src/
  app/
    [slug]/            app do cliente (cardápio, checkout, acompanhamento)
    admin/             painel da pizzaria
  lib/
    db.ts              conexão Postgres
    pricing.ts         cálculo de preço — a fonte da verdade
    menu.ts            leitura do cardápio público
    admin-menu.ts      leitura do cardápio no painel (inclui inativos)
    orders.ts          leitura de pedidos
    hours.ts           está aberto agora?
    auth.ts            sessão, login e tenant do usuário
    password.ts        hash de senha (scrypt)
    crypto.ts          cifra das credenciais de gateway (AES-256-GCM)
    payments/          pagamento online, um adaptador por gateway
db/
  migrations/          schema
  seed.sql             pizzaria de demonstração
scripts/               migração e provisionamento de pizzarias
```

## Deploy na Vercel

```bash
vercel link
vercel env add DATABASE_URL production
vercel deploy --prod
```

Cada pizzaria pode ganhar um domínio próprio apontando para `/{slug}`.
