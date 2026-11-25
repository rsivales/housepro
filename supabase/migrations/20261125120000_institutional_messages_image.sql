-- Imagem do email por ocasião/público nos envios institucionais. Aditivo, seguro repetir.
begin;

alter table public.institutional_messages add column if not exists image_url text;

commit;
