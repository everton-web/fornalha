-- =====================================================================
-- Fornalha — schema multi-tenant (Postgres puro)
-- Cada pizzaria é um tenant: cardápio, pedidos e configurações isolados.
--
-- Todo acesso ao banco passa pelo servidor da aplicação, que filtra por
-- tenant_id em cada consulta. Não há acesso direto do navegador ao banco.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
do $$ begin
  create type order_status as enum (
    'pending',          -- recebido, aguardando confirmação da pizzaria
    'confirmed',        -- pizzaria aceitou
    'preparing',        -- em produção
    'ready',            -- pronto (retirada) / aguardando entregador
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum (
    'cash',             -- dinheiro na entrega
    'card_delivery',    -- maquininha na entrega
    'pix_manual',       -- pix por chave, comprovante via whatsapp
    'pix_online',       -- pix via gateway
    'card_online'       -- cartão via gateway
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_type as enum ('delivery','pickup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_kind as enum ('pizza','simple');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner','staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type half_pricing as enum ('max','avg');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------- contas e sessões
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  -- scrypt: "salt:hash" em hex. Ver src/lib/password.ts
  password_hash text not null,
  name          text,
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  -- guardamos o SHA-256 do token, nunca o token em si:
  -- um vazamento do banco não vira acesso ao painel.
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- --------------------------------------------------------------- tenants
create table if not exists tenants (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  tagline           text,
  logo_url          text,
  cover_url         text,
  primary_color     text not null default '#c81e1e',
  phone             text,
  whatsapp          text,                       -- só dígitos com DDI: 5511999999999
  address           text,
  -- operação
  is_active         boolean not null default true,    -- assinatura ativa (controle da agência)
  is_open_override  boolean,                          -- null = usa horário; true/false = força
  opening_hours     jsonb not null default '[]'::jsonb, -- [{day:0..6, open:"18:00", close:"23:30"}]
  timezone          text not null default 'America/Sao_Paulo',
  prep_time_min     int not null default 40,
  -- entrega
  delivery_enabled  boolean not null default true,
  pickup_enabled    boolean not null default true,
  delivery_fee      numeric(10,2) not null default 0,
  min_order_value   numeric(10,2) not null default 0,
  -- pagamento
  accepts_cash           boolean not null default true,
  accepts_card_delivery  boolean not null default true,
  accepts_pix_manual     boolean not null default true,
  pix_key                text,
  online_payment_enabled boolean not null default false,
  payment_provider       text,                  -- 'mercadopago' | 'stripe'
  -- regras
  half_pricing      half_pricing not null default 'max',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists tenant_members (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role       member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- -------------------------------------------------------------- cardápio
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true
);

-- tamanhos de pizza (P/M/G/Família)
create table if not exists sizes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  slices       int,
  max_flavors  int not null default 2,
  sort_order   int not null default 0,
  is_active    boolean not null default true
);

-- sabores (o preço mora em flavor_prices, por tamanho)
create table if not exists flavors (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name        text not null,
  description text,
  image_url   text,
  is_sweet    boolean not null default false,
  is_active   boolean not null default true,
  sort_order  int not null default 0
);

create table if not exists flavor_prices (
  flavor_id uuid not null references flavors(id) on delete cascade,
  size_id   uuid not null references sizes(id) on delete cascade,
  price     numeric(10,2) not null,
  primary key (flavor_id, size_id)
);

-- bordas recheadas
create table if not exists crusts (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  price      numeric(10,2) not null default 0,
  is_active  boolean not null default true,
  sort_order int not null default 0
);

-- adicionais (extra queijo, catupiry...)
create table if not exists addons (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  price      numeric(10,2) not null default 0,
  is_active  boolean not null default true,
  sort_order int not null default 0
);

-- produtos de preço fixo (bebidas, sobremesas, combos)
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  kind        product_kind not null default 'simple',
  name        text not null,
  description text,
  image_url   text,
  price       numeric(10,2) not null default 0,
  is_active   boolean not null default true,
  sort_order  int not null default 0
);

-- --------------------------------------------------------------- pedidos
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  code            text not null,                            -- A1B2 — curto, mostrado ao cliente
  public_token    uuid not null default gen_random_uuid(),   -- link de acompanhamento
  status          order_status not null default 'pending',
  -- cliente
  customer_name   text not null,
  customer_phone  text not null,
  -- entrega
  delivery_type   delivery_type not null default 'delivery',
  address_street     text,
  address_number     text,
  address_complement text,
  address_district   text,
  address_city       text,
  address_zip        text,
  address_reference  text,
  -- pagamento
  payment_method  payment_method not null,
  payment_status  payment_status not null default 'pending',
  change_for      numeric(10,2),                -- troco para
  provider_payment_id text,
  -- valores (congelados no momento do pedido)
  subtotal        numeric(10,2) not null,
  delivery_fee    numeric(10,2) not null default 0,
  discount        numeric(10,2) not null default 0,
  total           numeric(10,2) not null,
  notes           text,
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  kind         product_kind not null,
  -- snapshot: o cardápio muda, o pedido antigo não pode mudar junto
  title        text not null,                       -- "Pizza G — Calabresa / Frango c/ Catupiry"
  details      jsonb not null default '{}'::jsonb,
  quantity     int not null default 1 check (quantity > 0),
  unit_price   numeric(10,2) not null,
  total_price  numeric(10,2) not null,
  notes        text
);

create index if not exists categories_tenant_idx on categories (tenant_id);
create index if not exists sizes_tenant_idx on sizes (tenant_id);
create index if not exists flavors_tenant_idx on flavors (tenant_id);
create index if not exists products_tenant_idx on products (tenant_id);
create index if not exists crusts_tenant_idx on crusts (tenant_id);
create index if not exists addons_tenant_idx on addons (tenant_id);
create index if not exists members_user_idx on tenant_members (user_id);
create index if not exists orders_tenant_created_idx on orders (tenant_id, created_at desc);
create index if not exists orders_tenant_status_idx on orders (tenant_id, status);
create index if not exists orders_token_idx on orders (public_token);
create index if not exists order_items_order_idx on order_items (order_id);

-- updated_at automático
create or replace function touch_updated_at() returns trigger
language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

drop trigger if exists t_tenants_touch on tenants;
create trigger t_tenants_touch before update on tenants
  for each row execute function touch_updated_at();

drop trigger if exists t_orders_touch on orders;
create trigger t_orders_touch before update on orders
  for each row execute function touch_updated_at();
