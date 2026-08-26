-- =====================================================================
-- A pizzaria de demonstração muda de cidade: São Paulo → Salvador.
--
-- Por que uma migration e não só o seed: o seed apaga e recria o tenant,
-- o que serve para banco novo mas levaria junto os pedidos de um banco
-- que já roda. Aqui é UPDATE no lugar — a demo que já está no ar troca de
-- endereço sem perder cardápio nem histórico.
--
-- Só toca no slug 'bella-napoli'. Pizzaria de cliente não é afetada.
--
-- Roda quantas vezes precisar: o UPDATE é idempotente e as áreas são
-- refeitas do zero. Isso significa que rodar de novo devolve a demo ao
-- estado canônico — que é o que se quer de uma demonstração.
-- =====================================================================

update tenants set
  phone    = '(71) 3345-6789',
  whatsapp = '5571987654321',
  address  = 'Rua da Fonte do Boi, 42 — Rio Vermelho, Salvador/BA',
  -- CEP de verdade do Rio Vermelho. A demo é apresentada em Salvador, e
  -- endereço de outra cidade tira a régua de comparação de quem assiste.
  zip      = '41940360',
  timezone = 'America/Bahia'
where slug = 'bella-napoli';

-- Área de entrega saindo do Rio Vermelho para fora: a taxa sobe conforme
-- se afasta da loja.
--
-- Os nomes são exatamente os que a BrasilAPI devolve para o CEP — o
-- casamento é por `lower(district)`, e "Federacao" sem cedilha não bateria
-- com "Federação".
delete from delivery_zones
 where tenant_id in (select id from tenants where slug = 'bella-napoli');

insert into delivery_zones (tenant_id, district, city, fee)
select t.id, z.district, 'Salvador', z.fee
  from tenants t
  cross join (values
    ('Rio Vermelho',  6.00),
    ('Ondina',        8.00),
    ('Federação',     9.00),
    ('Amaralina',     9.00),
    ('Graça',        11.00),
    ('Pituba',       12.00),
    ('Itaigara',     14.00)
  ) as z(district, fee)
 where t.slug = 'bella-napoli';
