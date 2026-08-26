-- =====================================================================
-- Domínio próprio por pizzaria.
--
-- Até aqui cada pizzaria vivia em /slug do domínio da plataforma. Funciona,
-- mas é o link da agência com o nome da loja pendurado no fim — e pizzaria
-- que imprime cardápio, faz adesivo de moto e paga anúncio quer o endereço
-- dela, não o de quem fez o sistema.
--
-- Guardado sempre em minúsculas e sem "www": domínio não diferencia maiúscula,
-- e quem digita no painel escreve de qualquer jeito. Normalizar na entrada é
-- o que permite comparar direto com o host da requisição, sem tratamento a
-- cada acesso — e a proxy roda em toda visita.
-- =====================================================================

alter table tenants
  add column if not exists custom_domain text;

-- Um domínio aponta para uma pizzaria só. Sem esta trava, dois cadastros com
-- o mesmo domínio fariam a proxy escolher um dos dois por sorteio, e a loja
-- errada apareceria para o cliente.
create unique index if not exists tenants_custom_domain_idx
  on tenants (custom_domain)
  where custom_domain is not null;
