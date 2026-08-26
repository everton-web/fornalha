-- =====================================================================
-- Área de entrega por bairro.
--
-- A ideia original era cobrar por distância, mas a coordenada devolvida
-- pelo CEP é aproximada: bairros a 20 km um do outro vêm com o mesmo
-- ponto, o centro da cidade. Cobrar por ali erraria feio.
--
-- O bairro, esse sim, o CEP acerta — e é como a pizzaria já pensa a
-- entrega. As colunas de coordenada continuam no banco para quando houver
-- geocodificação de verdade, mas hoje quem manda é o bairro.
-- =====================================================================

alter table delivery_zones
  add column if not exists district text,
  add column if not exists city text;

-- Faixa por distância deixa de ser obrigatória: a linha pode ser por bairro.
alter table delivery_zones alter column max_km drop not null;

create index if not exists delivery_zones_district_idx
  on delivery_zones (tenant_id, lower(district));
