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
  v_faixa_tradicional uuid; v_faixa_especial uuid; v_faixa_doce uuid;
  v_flavor uuid;
  v_faixa uuid;
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
    -- A demo usa a média para deixar visível o que acontece numa pizza de três
    -- sabores. Cada pizzaria escolhe a sua em Configurações; 'max' (cobrar o
    -- sabor mais caro) continua sendo o mais comum no Brasil.
    'avg'
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

  -- faixas de preço: é assim que uma pizzaria pensa o cardápio. O sabor entra
  -- numa faixa e herda o preço dela; mexer aqui move todos de uma vez.
  insert into price_groups (tenant_id, name, sort_order) values
    (v_tenant, 'Tradicionais', 1) returning id into v_faixa_tradicional;
  insert into price_groups (tenant_id, name, sort_order) values
    (v_tenant, 'Especiais', 2) returning id into v_faixa_especial;
  insert into price_groups (tenant_id, name, sort_order) values
    (v_tenant, 'Doces', 3) returning id into v_faixa_doce;

  insert into price_group_prices (group_id, size_id, price) values
    (v_faixa_tradicional, v_p, 41.00), (v_faixa_tradicional, v_m, 55.00), (v_faixa_tradicional, v_g, 66.00),
    (v_faixa_especial,    v_p, 46.00), (v_faixa_especial,    v_m, 61.00), (v_faixa_especial,    v_g, 74.00),
    (v_faixa_doce,        v_p, 40.00), (v_faixa_doce,        v_m, 53.00), (v_faixa_doce,        v_g, 64.00);

  -- sabores salgados. A última coluna é a exceção: quando tem preço próprio no
  -- Grande, ele passa por cima da faixa — a trufada custa mais que as outras
  -- especiais sem precisar de uma faixa só para ela.
  for r in
    select * from (values
      ('Margherita',        'Molho de tomate italiano, muçarela de búfala, manjericão fresco', 'tradicional', null::numeric),
      ('Calabresa',         'Calabresa artesanal fatiada, cebola roxa, azeitona preta',        'tradicional', null),
      ('Portuguesa',        'Presunto, ovo, cebola, ervilha, azeitona e muçarela',             'tradicional', null),
      ('Napolitana',        'Muçarela, tomate em rodelas, parmesão e alho crocante',           'tradicional', null),
      ('Vegetariana',       'Abobrinha, berinjela, pimentão, tomate seco e rúcula',            'tradicional', null),
      ('Quatro Queijos',    'Muçarela, gorgonzola, parmesão e catupiry',                       'especial',    null),
      ('Frango c/ Catupiry','Frango desfiado temperado, catupiry original, milho',             'especial',    null),
      ('Pepperoni',         'Pepperoni importado, muçarela e orégano',                         'especial',    null),
      ('Bacon Supreme',     'Bacon crocante, cheddar, cebola caramelizada',                    'especial',    null),
      ('Marguerita Trufada','Muçarela de búfala, tomate confit e azeite trufado',              'especial',    86.00)
    ) as x(nome, descricao, faixa, preco_g_proprio)
  loop
    v_faixa := case r.faixa
                 when 'tradicional' then v_faixa_tradicional
                 else v_faixa_especial
               end;

    insert into flavors (tenant_id, category_id, price_group_id, name, description, sort_order)
      values (v_tenant, v_cat_salgada, v_faixa, r.nome, r.descricao, 0)
      returning id into v_flavor;

    if r.preco_g_proprio is not null then
      insert into flavor_prices (flavor_id, size_id, price)
        values (v_flavor, v_g, r.preco_g_proprio);
    end if;
  end loop;

  -- sabores doces
  for r in
    select * from (values
      ('Chocolate c/ Morango', 'Chocolate ao leite belga e morangos frescos'),
      ('Banana c/ Canela',     'Banana caramelizada, canela e leite condensado'),
      ('Prestígio',            'Chocolate meio amargo e coco fresco ralado')
    ) as x(nome, descricao)
  loop
    insert into flavors (tenant_id, category_id, price_group_id, name, description, is_sweet, sort_order)
      values (v_tenant, v_cat_doce, v_faixa_doce, r.nome, r.descricao, true, 0)
      returning id into v_flavor;
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

  -- área de entrega por bairro (a taxa sobe conforme se afasta da loja)
  insert into delivery_zones (tenant_id, district, city, fee) values
    (v_tenant, 'Vila Madalena', 'São Paulo', 6.00),
    (v_tenant, 'Pinheiros',     'São Paulo', 9.00),
    (v_tenant, 'Sumarezinho',   'São Paulo', 12.00),
    (v_tenant, 'Perdizes',      'São Paulo', 12.00);

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
