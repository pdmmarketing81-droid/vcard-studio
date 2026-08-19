-- ---------------------------------------------------------------------
-- 012 — a precise pin, an ordered contact list, and sound on the cover.
--
-- Applied 10 Aug 2026.
--
-- LOCATION. The map embed was fed the address as free text, so Google guessed:
-- "At Post - Mawadi Kadepathar" opened on half of India. No amount of careful
-- typing fixes that, because text is ambiguous and coordinates are not. The
-- form now accepts a Google Maps link or a pair of numbers and parses them
-- server-side (lib/geo.ts); an unreadable paste becomes null and the card falls
-- back to searching the address, exactly as before.
--
-- 6 decimal places is roughly 11 cm — far past what a shopfront needs.
-- ---------------------------------------------------------------------
alter table public.businesses add column if not exists map_lat numeric(9,6);
alter table public.businesses add column if not exists map_lng numeric(9,6);

alter table public.businesses drop constraint if exists businesses_map_lat_check;
alter table public.businesses add constraint businesses_map_lat_check
  check (map_lat is null or (map_lat >= -90 and map_lat <= 90));

alter table public.businesses drop constraint if exists businesses_map_lng_check;
alter table public.businesses add constraint businesses_map_lng_check
  check (map_lng is null or (map_lng >= -180 and map_lng <= 180));

-- ---------------------------------------------------------------------
-- CONTACT ORDER. A list of keys rather than a sort number per column, so
-- adding a contact type later needs no migration and reordering is one write
-- instead of four. Unknown keys are ignored on render and missing ones are
-- appended, so a card saved before this still shows everything it has.
-- ---------------------------------------------------------------------
alter table public.businesses add column if not exists contact_order jsonb
  not null default '["phone","address","email","website"]'::jsonb;

-- ---------------------------------------------------------------------
-- COVER SOUND. Off by default, and even when on the video still starts muted:
-- every browser blocks autoplay with audio, and a card that tried would often
-- be refused permission to play at all. What this switch does is show the
-- visitor a speaker button.
--
-- cover_audio_url replaces the video's own sound rather than layering over it.
-- Two sound sources at once is never what anyone meant, and the room noise in
-- the original clip is usually why a different track was wanted.
-- ---------------------------------------------------------------------
alter table public.businesses add column if not exists cover_sound boolean not null default false;
alter table public.businesses add column if not exists cover_audio_url text;
