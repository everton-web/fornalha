-- =====================================================================
-- Logo enviada pelo painel.
--
-- Guardamos a imagem no próprio banco em vez de contratar um serviço de
-- arquivos: é uma imagem pequena por pizzaria, já redimensionada no
-- navegador antes do envio. Quando entrarem as fotos dos sabores — muitas
-- imagens, maiores — aí sim vale um storage dedicado.
-- =====================================================================

alter table tenants
  add column if not exists logo_data text,          -- data URI: "data:image/webp;base64,..."
  add column if not exists logo_type text;          -- "image/webp", "image/png"...
