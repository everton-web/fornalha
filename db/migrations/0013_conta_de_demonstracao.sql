-- =====================================================================
-- Conta de demonstração: entrar no painel sem poder estragá-lo.
--
-- Mostrar o cardápio é fácil, ele é público. Mostrar o painel exigia
-- emprestar um login de verdade — e quem entrasse podia mudar preço,
-- apagar sabor ou concluir pedido, quebrando a demonstração para o
-- próximo que fosse ver.
--
-- A marca fica na conta, não na sessão: "esta conta não escreve" é uma
-- propriedade de quem é, não de como entrou. Uma sessão roubada de um
-- dono de verdade continua podendo escrever; a da demo, nunca.
-- =====================================================================

alter table users
  add column if not exists is_demo boolean not null default false;
