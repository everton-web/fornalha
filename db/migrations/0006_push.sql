-- =====================================================================
-- Assinaturas de notificação push.
--
-- Uma linha por aparelho: a mesma pessoa costuma ter o painel no celular e
-- no computador do balcão, e quer o aviso nos dois. O endpoint é a chave
-- porque é ele que identifica o aparelho para o navegador.
-- =====================================================================

create table if not exists push_subscriptions (
  endpoint   text primary key,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  -- chaves de criptografia que o navegador gera para este aparelho
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists push_tenant_idx on push_subscriptions (tenant_id);
create index if not exists push_user_idx on push_subscriptions (user_id);
