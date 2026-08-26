-- =====================================================================
-- Taxa de entrega por distância.
--
-- A pizzaria ganha coordenadas (derivadas do CEP dela) e faixas de preço
-- por quilômetro. Sem faixas cadastradas, o sistema continua usando a taxa
-- única de delivery_fee — nada quebra para quem já está no ar.
-- =====================================================================

alter table tenants
  add column if not exists zip       text,
  add column if not exists latitude  numeric(10,7),
  add column if not exists longitude numeric(10,7),
  -- fora da última faixa: recusa o pedido ou cobra a taxa da última faixa
  add column if not exists refuse_outside_zones boolean not null default true;

create table if not exists delivery_zones (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- distância máxima, em linha reta, que esta faixa cobre
  max_km    numeric(6,2) not null check (max_km > 0),
  fee       numeric(10,2) not null check (fee >= 0),
  created_at timestamptz not null default now()
);

create index if not exists delivery_zones_tenant_idx on delivery_zones (tenant_id, max_km);
