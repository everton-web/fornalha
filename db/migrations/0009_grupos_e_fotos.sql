-- =====================================================================
-- Grupos de preço e fotos dos sabores.
--
-- GRUPOS — até agora cada sabor guardava o próprio preço por tamanho, o que
-- obriga a pizzaria a digitar preço 60 vezes e a repetir a edição toda vez que
-- a tabela sobe. Pizzaria brasileira não pensa assim: pensa em "Tradicionais",
-- "Especiais", "Premium", e o sabor pertence a uma dessas faixas.
--
-- O preço individual continua existindo e vale como exceção: quem tem grupo
-- herda o preço dele, e um preço próprio no mesmo tamanho passa por cima. É o
-- que permite a camarão custar mais que as outras especiais sem virar um grupo
-- só para ela. Cardápio já cadastrado não muda de valor: sem grupo, tudo segue
-- exatamente como estava.
--
-- FOTOS — a migration 0002 dizia que quando as fotos dos sabores chegassem
-- valeria um storage dedicado. Chegaram, e a conta mudou: o navegador reduz a
-- imagem para ~600px em WebP antes de enviar (~50 KB), então um cardápio de 60
-- sabores ocupa cerca de 3 MB. Não compensa contratar serviço, credencial e um
-- ponto de falha novo por isso. O que fica de dívida é o backup mais pesado —
-- e o dia em que uma pizzaria quiser foto grande de verdade.
-- =====================================================================

-- ------------------------------------------------------ grupos de preço
create table if not exists price_groups (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true
);

create index if not exists price_groups_tenant_idx on price_groups (tenant_id);

create table if not exists price_group_prices (
  group_id uuid not null references price_groups(id) on delete cascade,
  size_id  uuid not null references sizes(id) on delete cascade,
  price    numeric(10,2) not null,
  primary key (group_id, size_id)
);

-- on delete set null e não cascade: apagar um grupo não pode apagar os sabores
-- dele. Eles voltam a valer pelo preço próprio, que é o pior caso aceitável —
-- sumir do cardápio não é.
alter table flavors
  add column if not exists price_group_id uuid
    references price_groups(id) on delete set null;

create index if not exists flavors_grupo_idx on flavors (price_group_id);

-- ------------------------------------------------------------- fotos
-- Mesmo formato da logo: data URI no texto, tipo à parte. A coluna image_url
-- continua valendo para quem já apontava para uma imagem de fora.
alter table flavors
  add column if not exists image_data text,
  add column if not exists image_type text;

alter table products
  add column if not exists image_data text,
  add column if not exists image_type text;
