-- =====================================================================
-- Links de uso único enviados por e-mail.
--
-- Serve para redefinir senha e para convidar alguém da equipe. Guardamos
-- só o hash do token, como nas sessões: o valor original vive no link que
-- foi para a caixa de entrada e em nenhum outro lugar.
-- =====================================================================

do $$ begin
  create type auth_token_purpose as enum ('reset', 'invite');
exception when duplicate_object then null; end $$;

create table if not exists auth_tokens (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  purpose    auth_token_purpose not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_tokens_user_idx on auth_tokens (user_id);
create index if not exists auth_tokens_expires_idx on auth_tokens (expires_at);
