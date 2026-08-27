-- =====================================================================
-- Pizza de dois ou três sabores passa a custar a média dos sabores.
--
-- O CÓDIGO SEMPRE SOUBE FAZER AS DUAS CONTAS. `pizzaBasePrice` em
-- src/lib/pricing.ts calcula tanto a média ('avg') quanto o sabor mais caro
-- ('max'), e a pizzaria escolhe em Configurações. O que estava errado era o
-- valor guardado: a coluna nasceu com `default 'max'`, e a demonstração
-- ficou com ele.
--
-- POR QUE O SEED NÃO RESOLVEU — db/seed.sql cria a Bella Napoli já com
-- 'avg' desde a a9120a8. Só que `--seed` nunca roda no deploy, de propósito:
-- ele apaga e recria o tenant, e apagar pizzaria em produção não é coisa de
-- build (ver o cabeçalho do scripts/migrate.mjs). Ou seja, toda mudança
-- feita no seed vale para banco novo e nunca chega no que já está no ar.
-- É a mesma armadilha que motivou o deploy a migrar sozinho, aparecendo de
-- novo em outro lugar: quem quer mudar dado que já existe escreve migration,
-- não seed.
--
-- DUAS COISAS, e elas são diferentes:
--
--   1. A demonstração, que estava mostrando a regra errada na tela — o
--      montador dizia "Vale o preço do sabor mais caro" e cobrava 61,00 numa
--      pizza de 61,00 + 50,00, quando a média é 55,50.
--
--   2. O padrão da coluna, para que a próxima pizzaria cadastrada comece na
--      média em vez de começar no mais caro.
--
-- O QUE ESTA MIGRATION NÃO FAZ: mexer em pizzaria que já está no ar. Trocar
-- a regra de preço de uma loja de verdade muda o que os clientes dela pagam,
-- e isso é decisão do dono, não de um deploy. Quem quiser a média troca em
-- Configurações, num clique.
-- =====================================================================

-- 1. A demonstração.
update tenants set half_pricing = 'avg' where slug = 'bella-napoli';

-- 2. O padrão para quem vier depois. `alter column ... set default` não toca
--    em nenhuma linha existente — só no valor usado quando ninguém informa.
alter table tenants alter column half_pricing set default 'avg';
