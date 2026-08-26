-- =====================================================================
-- Pagamento online com mais de um gateway.
--
-- O schema original previa um gateway por pizzaria (tenants.payment_provider,
-- orders.provider_payment_id). Isso não sustenta o que a operação pede: cada
-- pizzaria escolhe onde recebe, o dinheiro cai na conta dela, e a taxa que ela
-- paga varia de gateway para gateway. Daí três tabelas:
--
--   tenant_payment_accounts — onde cada pizzaria recebe, com credencial cifrada
--   payments                — uma linha por tentativa de cobrança
--   payment_webhook_events  — o que o gateway já nos contou, para não contar duas vezes
--
-- As colunas antigas (tenants.payment_provider, orders.provider_payment_id)
-- ficam onde estão, sem uso novo: remover coluna em banco de produção é risco
-- sem retorno enquanto elas não incomodam.
-- =====================================================================

-- ------------------------------------------------- onde a pizzaria recebe
create table if not exists tenant_payment_accounts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  -- 'mercadopago' | 'asaas' | 'pagarme' | 'infinitepay' | 'picpay' | 'stripe'
  provider     text not null,
  -- Cifrada com AES-256-GCM pela aplicação (src/lib/crypto.ts), nunca em texto
  -- puro: aqui mora o token que movimenta o dinheiro de outra empresa, e quem
  -- administra o Postgres não é quem é dono da conta.
  credentials  bytea not null,
  -- Qual gateway é o preferido quando a pizzaria tem mais de um ligado.
  sort_order   int not null default 0,
  accepts_pix  boolean not null default true,
  accepts_card boolean not null default false,
  is_active    boolean not null default true,
  -- Últimas quatro letras do token, para o painel mostrar qual credencial está
  -- ligada sem nunca decifrar nada só para desenhar a tela.
  hint         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index if not exists tpa_tenant_idx
  on tenant_payment_accounts (tenant_id)
  where is_active;

-- ------------------------------------------------- tentativas de cobrança
-- Uma linha por tentativa, não por pedido: o cliente abandona o Pix, volta e
-- gera outro. Guardar o histórico é o que permite conferir depois o que
-- aconteceu, e é a única forma de reconciliar quando o webhook não chega.
create table if not exists payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  tenant_id          uuid not null references tenants(id) on delete cascade,
  provider           text not null,
  -- id da cobrança no gateway; nulo entre criar a linha e o gateway responder
  provider_charge_id text,
  method             payment_method not null,
  amount             numeric(10,2) not null,
  status             payment_status not null default 'pending',
  -- Pix: o copia-e-cola e o QR que o cliente vê na tela de acompanhamento
  pix_code           text,
  pix_qr_base64      text,
  -- Cartão: para onde mandar o cliente
  checkout_url       text,
  expires_at         timestamptz,
  paid_at            timestamptz,
  last_error         text,
  raw                jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Trava de reconciliação: o mesmo id de cobrança nunca vira duas linhas,
  -- por mais vezes que o gateway avise.
  unique (provider, provider_charge_id)
);

create index if not exists payments_order_idx on payments (order_id);
create index if not exists payments_tenant_idx on payments (tenant_id, created_at desc);

-- Varredura de reconciliação: as cobranças que ainda não deram desfecho.
create index if not exists payments_pendentes_idx
  on payments (created_at)
  where status = 'pending';

-- ------------------------------------------------- avisos do gateway
-- O gateway reenvia o mesmo aviso quando não recebe 200 rápido o bastante.
-- Sem esta tabela, um pedido seria confirmado (e o cupom impresso) várias
-- vezes pelo mesmo pagamento.
create table if not exists payment_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  external_id  text not null,
  payment_id   uuid references payments(id) on delete set null,
  payload      jsonb not null default '{}'::jsonb,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_id)
);

create index if not exists pwe_recebidos_idx on payment_webhook_events (received_at desc);
