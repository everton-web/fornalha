# Fornalha — sistema de pedidos para pizzarias

Multi-pizzaria: um só sistema, um link por cliente. Cada pizzaria tem cardápio,
cores, horários e pedidos próprios.

- **App do cliente** — `/{slug}` — cardápio, montador de pizza (tamanho, sabores,
  borda, adicionais), carrinho, checkout e acompanhamento do pedido.
- **Painel da pizzaria** — `/admin` — pedidos com aviso sonoro, edição do
  cardápio e configurações da loja.

Next.js 16 · React 19 · Tailwind 4 · Postgres (Neon).

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

Qualquer Postgres serve — Neon, Vercel Postgres, Supabase ou um local. Quando o
provedor oferecer string "pooled" (com `-pooler`), use essa.

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
caro (padrão no Brasil) ou a média.

## Segurança

- Nenhum acesso do navegador ao banco: tudo passa pelo servidor, e toda
  consulta filtra por `tenant_id`.
- Senhas com scrypt (`node:crypto`), sessões em cookie httpOnly. O banco guarda
  só o SHA-256 do token de sessão — vazamento do banco não vira acesso.
- Nenhum pedido é público. O cliente acompanha pelo `public_token` do link.
- Toda Server Action confere a sessão — Server Actions são endpoints POST
  abertos, então proteger só a tela não bastaria.

## Formas de pagamento

Funcionando: dinheiro, cartão na entrega e Pix na chave (com comprovante pelo
WhatsApp). O pedido cai no painel na hora.

Pagamento online (Pix e cartão com confirmação automática) está modelado no
banco — `online_payment_enabled`, `payment_provider`, `provider_payment_id` —
e falta plugar o gateway (Mercado Pago é o caminho natural no Brasil).

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
