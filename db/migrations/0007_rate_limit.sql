-- =====================================================================
-- Freio de repetição.
--
-- Guardado no banco e não em memória porque o servidor é serverless: cada
-- requisição pode cair numa instância diferente, e um contador em memória
-- protegeria apenas a instância que o guardou.
-- =====================================================================

create table if not exists rate_limits (
  bucket     text primary key,   -- ex.: "checkout:187.1.2.3"
  hits       int not null default 0,
  expires_at timestamptz not null
);

create index if not exists rate_limits_expires_idx on rate_limits (expires_at);
