-- =====================================================================
-- Seed: pizzaria de demonstração.
-- Rode depois das migrations. É idempotente: apaga e recria o tenant demo.
-- =====================================================================

delete from tenants where slug = 'bella-napoli';

do $seed$
declare
  v_tenant uuid;
  v_p uuid; v_m uuid; v_g uuid;
  v_cat_salgada uuid; v_cat_doce uuid; v_cat_bebida uuid; v_cat_sobremesa uuid;
  v_flavor uuid;
  r record;
begin
  insert into tenants (
    slug, name, tagline, primary_color, phone, whatsapp, address,
    opening_hours, prep_time_min, delivery_fee, min_order_value,
    pix_key, half_pricing
  ) values (
    'bella-napoli',
    'Bella Napoli',
    'Massa de fermentação natural, forno a lenha',
    '#c81e1e',
    '(11) 3456-7890',
    '5511987654321',
    'Rua das Oliveiras, 128 — Vila Madalena, São Paulo/SP',
    '[{"day":0,"open":"18:00","close":"23:00"},
      {"day":2,"open":"18:00","close":"23:30"},
      {"day":3,"open":"18:00","close":"23:30"},
      {"day":4,"open":"18:00","close":"23:30"},
      {"day":5,"open":"18:00","close":"00:30"},
      {"day":6,"open":"18:00","close":"00:30"}]'::jsonb,
    45, 8.00, 35.00,
    'contato@bellanapoli.com.br',
    'max'
  ) returning id into v_tenant;

  -- categorias
  insert into categories (tenant_id, name, sort_order) values
    (v_tenant, 'Pizzas salgadas', 1) returning id into v_cat_salgada;
  insert into categories (tenant_id, name, sort_order) values
    (v_tenant, 'Pizzas doces', 2) returning id into v_cat_doce;
  insert into categories (tenant_id, name, sort_order) values
    (v_tenant, 'Bebidas', 3) returning id into v_cat_bebida;
  insert into categories (tenant_id, name, sort_order) values
    (v_tenant, 'Sobremesas', 4) returning id into v_cat_sobremesa;

  -- tamanhos
  insert into sizes (tenant_id, name, slices, max_flavors, sort_order) values
    (v_tenant, 'Pequena', 4, 1, 1) returning id into v_p;
  insert into sizes (tenant_id, name, slices, max_flavors, sort_order) values
    (v_tenant, 'Média', 6, 2, 2) returning id into v_m;
  insert into sizes (tenant_id, name, slices, max_flavors, sort_order) values
    (v_tenant, 'Grande', 8, 3, 3) returning id into v_g;

  -- sabores salgados: nome, descrição, preço P/M/G
  for r in
    select * from (values
      ('Margherita',      'Molho de tomate italiano, muçarela de búfala, manjericão fresco', 39.0, 52.0, 64.0),
      ('Calabresa',       'Calabresa artesanal fatiada, cebola roxa, azeitona preta',        41.0, 54.0, 66.0),
      ('Portuguesa',      'Presunto, ovo, cebola, ervilha, azeitona e muçarela',             43.0, 57.0, 69.0),
      ('Quatro Queijos',  'Muçarela, gorgonzola, parmesão e catupiry',                       46.0, 61.0, 74.0),
      ('Frango c/ Catupiry','Frango desfiado temperado, catupiry original, milho',           44.0, 58.0, 71.0),
      ('Pepperoni',       'Pepperoni importado, muçarela e orégano',                         47.0, 62.0, 76.0),
      ('Bacon Supreme',   'Bacon crocante, cheddar, cebola caramelizada',                    46.0, 61.0, 74.0),
      ('Vegetariana',     'Abobrinha, berinjela, pimentão, tomate seco e rúcula',            43.0, 57.0, 69.0),
      ('Napolitana',      'Muçarela, tomate em rodelas, parmesão e alho crocante',           42.0, 55.0, 67.0),
      ('Marguerita Trufada','Muçarela de búfala, tomate confit e azeite trufado',            54.0, 71.0, 86.0)
    ) as x(nome, descricao, pp, pm, pg)
  loop
    insert into flavors (tenant_id, category_id, name, description, sort_order)
      values (v_tenant, v_cat_salgada, r.nome, r.descricao, 0)
      returning id into v_flavor;
    insert into flavor_prices (flavor_id, size_id, price) values
      (v_flavor, v_p, r.pp), (v_flavor, v_m, r.pm), (v_flavor, v_g, r.pg);
  end loop;

  -- sabores doces
  for r in
    select * from (values
      ('Chocolate c/ Morango', 'Chocolate ao leite belga e morangos frescos', 42.0, 55.0, 67.0),
      ('Banana c/ Canela',     'Banana caramelizada, canela e leite condensado', 38.0, 50.0, 61.0),
      ('Prestígio',            'Chocolate meio amargo e coco fresco ralado',   40.0, 53.0, 64.0)
    ) as x(nome, descricao, pp, pm, pg)
  loop
    insert into flavors (tenant_id, category_id, name, description, is_sweet, sort_order)
      values (v_tenant, v_cat_doce, r.nome, r.descricao, true, 0)
      returning id into v_flavor;
    insert into flavor_prices (flavor_id, size_id, price) values
      (v_flavor, v_p, r.pp), (v_flavor, v_m, r.pm), (v_flavor, v_g, r.pg);
  end loop;

  -- bordas
  insert into crusts (tenant_id, name, price, sort_order) values
    (v_tenant, 'Sem borda recheada', 0,     1),
    (v_tenant, 'Catupiry',           9.00,  2),
    (v_tenant, 'Cheddar',            9.00,  3),
    (v_tenant, 'Chocolate',         11.00,  4);

  -- adicionais
  insert into addons (tenant_id, name, price, sort_order) values
    (v_tenant, 'Extra muçarela',   7.00, 1),
    (v_tenant, 'Extra bacon',      9.00, 2),
    (v_tenant, 'Azeite trufado',   6.00, 3),
    (v_tenant, 'Parmesão ralado',  5.00, 4);

  -- bebidas e sobremesas
  insert into products (tenant_id, category_id, kind, name, description, price, sort_order) values
    (v_tenant, v_cat_bebida, 'simple', 'Coca-Cola 2L',        'Garrafa gelada',                14.00, 1),
    (v_tenant, v_cat_bebida, 'simple', 'Guaraná Antarctica 2L','Garrafa gelada',               12.00, 2),
    (v_tenant, v_cat_bebida, 'simple', 'Água mineral 500ml',  'Com ou sem gás',                 5.00, 3),
    (v_tenant, v_cat_bebida, 'simple', 'Suco de laranja 1L',  'Natural, feito na hora',        16.00, 4),
    (v_tenant, v_cat_bebida, 'simple', 'Cerveja Heineken 600ml','Long neck gelada',            18.00, 5),
    (v_tenant, v_cat_sobremesa, 'simple', 'Petit Gateau',     'Com sorvete de creme',          24.00, 1),
    (v_tenant, v_cat_sobremesa, 'simple', 'Tiramisù',         'Receita da casa, porção individual', 22.00, 2);
end $seed$;
