-- =====================================================================
-- vCard Studio — schema
-- Designed multi-tenant from day one so the internal tool can become a
-- SaaS later without a migration: every card already has an owner_id.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- businesses: one row == one live card
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),

  -- NULL while this is an internal agency tool. When SaaS launches,
  -- each card gets attached to the signed-up user who owns it.
  owner_id      uuid references auth.users(id) on delete cascade,

  -- routing
  slug          text not null unique,
  custom_domain text unique,          -- e.g. "happyframestudios.com"

  -- identity
  name          text not null,
  tagline       text,                 -- "Owned By Ranbir Dhaliwal"
  about         text,

  -- media
  logo_url      text,
  cover_url     text,
  cover_type    text not null default 'image'
                check (cover_type in ('image', 'video')),

  -- contact
  email         text,
  phone         text,
  whatsapp      text,                 -- digits w/ country code, no +
  address       text,
  website       text,

  -- branding
  theme_color   text not null default '#0f766e',

  -- state
  published     boolean not null default true,
  view_count    integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists businesses_slug_idx
  on public.businesses (slug);
create index if not exists businesses_custom_domain_idx
  on public.businesses (custom_domain) where custom_domain is not null;
create index if not exists businesses_owner_idx
  on public.businesses (owner_id);

-- ---------------------------------------------------------------------
-- social_links: variable number of links per card
-- ---------------------------------------------------------------------
create table if not exists public.social_links (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  platform    text not null,   -- facebook | instagram | linkedin | x | youtube | whatsapp | custom
  url         text not null,
  label       text,            -- optional override for "custom"
  sort_order  integer not null default 0
);

create index if not exists social_links_business_idx
  on public.social_links (business_id, sort_order);

-- ---------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_touch_updated_at on public.businesses;
create trigger businesses_touch_updated_at
  before update on public.businesses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- atomic view counter (called from the public card page)
-- ---------------------------------------------------------------------
create or replace function public.increment_view_count(card_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.businesses set view_count = view_count + 1 where slug = card_slug;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
--   * anyone may READ a published card  (that's the whole point)
--   * nobody may WRITE with the anon key — all writes go through the
--     server using the service_role key, which bypasses RLS.
--   * the owner_id policies below are dormant now but activate the
--     moment you turn on Supabase Auth for the SaaS phase.
-- ---------------------------------------------------------------------
alter table public.businesses   enable row level security;
alter table public.social_links enable row level security;

drop policy if exists "published cards are public" on public.businesses;
create policy "published cards are public"
  on public.businesses for select
  using (published = true);

drop policy if exists "owners manage their cards" on public.businesses;
create policy "owners manage their cards"
  on public.businesses for all
  using  (auth.uid() is not null and auth.uid() = owner_id)
  with check (auth.uid() is not null and auth.uid() = owner_id);

drop policy if exists "social links of public cards are public" on public.social_links;
create policy "social links of public cards are public"
  on public.social_links for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = social_links.business_id and b.published = true
    )
  );

drop policy if exists "owners manage their social links" on public.social_links;
create policy "owners manage their social links"
  on public.social_links for all
  using (
    exists (
      select 1 from public.businesses b
      where b.id = social_links.business_id
        and auth.uid() is not null
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = social_links.business_id
        and auth.uid() is not null
        and b.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Storage bucket for logos / covers — public read, service-role write
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('card-media', 'card-media', true)
on conflict (id) do nothing;

drop policy if exists "card media is publicly readable" on storage.objects;
create policy "card media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'card-media');
