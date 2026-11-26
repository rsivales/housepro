-- Imagem, tipo de letra e posição do banner por ocasião/público nos envios
-- institucionais. Aditivo, seguro repetir.
begin;

alter table public.institutional_messages add column if not exists image_url text;
alter table public.institutional_messages add column if not exists font_family text not null default 'arial';
alter table public.institutional_messages add column if not exists banner_position text not null default 'topo';

alter table public.institutional_messages drop constraint if exists institutional_messages_font_family_check;
alter table public.institutional_messages add constraint institutional_messages_font_family_check
  check (font_family in ('arial','georgia','verdana'));

alter table public.institutional_messages drop constraint if exists institutional_messages_banner_position_check;
alter table public.institutional_messages add constraint institutional_messages_banner_position_check
  check (banner_position in ('topo','meio'));

commit;
