-- =====================================================================
-- Conta da agência.
--
-- Até aqui só existia um nível de acesso: dono ou equipe DE UMA pizzaria,
-- pela tabela tenant_members. Não havia como representar quem administra o
-- sistema inteiro — a agência —, e por isso criar pizzaria só dava por linha
-- de comando, com quem tivesse a string do banco na mão.
--
-- Uma coluna e não uma tabela nova: "administra a plataforma" é um atributo
-- da pessoa, não um vínculo com alguma coisa. Tabela separada só faria
-- sentido se houvesse papéis ou permissões variadas nesse nível, e não há —
-- ou administra tudo, ou não administra.
--
-- Repare no que isto NÃO faz: não dá acesso ao painel de nenhuma pizzaria.
-- Administrar a plataforma e operar uma loja continuam sendo coisas
-- separadas; quem precisa das duas tem também sua linha em tenant_members.
-- =====================================================================

alter table users
  add column if not exists is_platform_admin boolean not null default false;

-- Índice parcial: agência é um punhado de pessoas entre todos os usuários, e
-- a pergunta "existe algum admin?" roda em toda visita ao painel da agência.
create index if not exists users_platform_admin_idx
  on users (id) where is_platform_admin;
