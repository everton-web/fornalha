-- =====================================================================
-- Conta de demonstração e os pedidos que dão o que ver no painel.
--
-- Fica fora de db/migrations de propósito: isto depende da pizzaria de
-- demonstração existir, e o seed apaga e recria esse tenant. Rodando como
-- migration, a conta seria criada antes do seed e levada embora junto com
-- o tenant antigo — o painel da demo abriria sem conta e sem pedidos.
--
-- Então quem executa é o runner, sempre por último:
--   migrations → (seed) → demo.sql
--
-- É idempotente e não depende de ter rodado antes.
-- =====================================================================

do $demo$
declare
  v_tenant uuid;
  v_user   uuid;
  v_order  uuid;
begin
  select id into v_tenant from tenants where slug = 'bella-napoli';
  -- Sem a pizzaria de demonstração não há o que demonstrar; sai calado
  -- para não quebrar a migration num banco que só tem clientes de verdade.
  if v_tenant is null then return; end if;

  -- Senha impossível de propósito: 'sem-senha' não tem o "salt:hash" que
  -- verifyPassword espera, então ela devolve false sem nem calcular. A
  -- única porta desta conta é /admin/demo, que não pede senha.
  insert into users (email, password_hash, is_demo)
  values ('demo@fornalha.com.br', 'sem-senha', true)
  on conflict (email) do update set is_demo = true
  returning id into v_user;

  insert into tenant_members (tenant_id, user_id, role)
  values (v_tenant, v_user, 'owner')
  on conflict (tenant_id, user_id) do update set role = excluded.role;

  -- ------------------------------------------------------------------
  -- Pedidos para o painel ter o que mostrar.
  --
  -- Todos em status ativo, e é isso que os mantém úteis para sempre: a
  -- conta da demo não escreve, então ninguém os conclui, e eles seguem na
  -- fila. O cartão mostra só a hora, não a data — um pedido de semanas
  -- atrás continua parecendo de hoje.
  --
  -- As taxas são as mesmas da tabela de bairros (Rio Vermelho 6, Pituba
  -- 12, Ondina 8): quem confere as duas telas encontra os mesmos números.
  -- ------------------------------------------------------------------

  insert into orders (tenant_id, code, status, customer_name, customer_phone,
    delivery_type, address_street, address_number, address_district,
    address_city, address_zip, payment_method, payment_status,
    subtotal, delivery_fee, total, created_at)
  values (v_tenant, 'D1042', 'pending', 'Marina Alvarenga', '71987654321',
    'delivery', 'Rua da Paciência', '212', 'Rio Vermelho', 'Salvador',
    '41940070', 'pix_online', 'paid', 96.00, 6.00, 102.00,
    now() - interval '4 minutes')
  on conflict (tenant_id, code) do nothing
  returning id into v_order;

  if v_order is not null then
    insert into order_items (order_id, kind, title, details, quantity,
      unit_price, total_price) values
      (v_order, 'pizza', 'Pizza Grande · Calabresa / Margherita',
        '{"tamanho":"Grande","sabores":["Calabresa","Margherita"],"borda":"Catupiry"}',
        1, 55.00, 55.00),
      (v_order, 'pizza', 'Pizza Média · Bacon Supreme',
        '{"tamanho":"Média","sabores":["Bacon Supreme"]}', 1, 41.00, 41.00);
  end if;

  insert into orders (tenant_id, code, status, customer_name, customer_phone,
    delivery_type, address_street, address_number, address_district,
    address_city, address_zip, payment_method, payment_status,
    subtotal, delivery_fee, total, notes, created_at)
  values (v_tenant, 'D1041', 'preparing', 'Rodrigo Sampaio', '71991234567',
    'delivery', 'Av. Manoel Dias da Silva', '88', 'Pituba', 'Salvador',
    '41830000', 'card_delivery', 'pending', 92.00, 12.00, 104.00,
    'Sem cebola, por favor', now() - interval '13 minutes')
  on conflict (tenant_id, code) do nothing
  returning id into v_order;

  if v_order is not null then
    insert into order_items (order_id, kind, title, details, quantity,
      unit_price, total_price) values
      (v_order, 'pizza',
        'Pizza Grande · Portuguesa / Frango c/ Catupiry / Margherita',
        '{"tamanho":"Grande","sabores":["Portuguesa","Frango c/ Catupiry","Margherita"],"borda":"Cheddar"}',
        1, 61.00, 61.00),
      (v_order, 'simple', 'Guaraná Antarctica 2L', '{}', 1, 12.00, 12.00),
      (v_order, 'simple', 'Tiramisù', '{}', 1, 22.00, 22.00);
  end if;

  insert into orders (tenant_id, code, status, customer_name, customer_phone,
    delivery_type, payment_method, payment_status,
    subtotal, delivery_fee, total, created_at)
  values (v_tenant, 'D1040', 'ready', 'Camila Peixoto', '71995556677',
    'pickup', 'cash', 'pending', 46.00, 0.00, 46.00,
    now() - interval '26 minutes')
  on conflict (tenant_id, code) do nothing
  returning id into v_order;

  if v_order is not null then
    insert into order_items (order_id, kind, title, details, quantity,
      unit_price, total_price) values
      (v_order, 'pizza', 'Pizza Média · Pepperoni',
        '{"tamanho":"Média","sabores":["Pepperoni"]}', 1, 46.00, 46.00);
  end if;

  insert into orders (tenant_id, code, status, customer_name, customer_phone,
    delivery_type, address_street, address_number, address_district,
    address_city, address_zip, payment_method, payment_status,
    subtotal, delivery_fee, total, created_at)
  values (v_tenant, 'D1039', 'out_for_delivery', 'Tiago Werneck',
    '71993334455', 'delivery', 'Rua Barão de Sergy', '201', 'Ondina',
    'Salvador', '40170000', 'pix_online', 'paid', 82.00, 8.00, 90.00,
    now() - interval '38 minutes')
  on conflict (tenant_id, code) do nothing
  returning id into v_order;

  if v_order is not null then
    insert into order_items (order_id, kind, title, details, quantity,
      unit_price, total_price) values
      (v_order, 'pizza', 'Pizza Grande · Marguerita Trufada / Napolitana',
        '{"tamanho":"Grande","sabores":["Marguerita Trufada","Napolitana"]}',
        1, 53.50, 53.50),
      (v_order, 'pizza', 'Pizza Pequena · Chocolate c/ Morango',
        '{"tamanho":"Pequena","sabores":["Chocolate c/ Morango"]}',
        1, 28.50, 28.50);
  end if;
end $demo$;
