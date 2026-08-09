-- ---------------------------------------------------------------------
-- 010 — remember views by day, and one place to ask for the numbers.
--
-- Applied 9 Aug 2026.
--
-- businesses.view_count is a running total. It answers "how many ever" and
-- nothing else — not "is this card doing better than last month", which is the
-- only view question a shopkeeper actually asks. One row per card per day is
-- cheap and answers both.
--
-- The counting goes inside increment_view_count() rather than into the app, so
-- every path that already counts a view starts recording days too — including
-- the custom-domain route — with no code change and no chance of missing one.
--
-- Note this starts from empty. Nothing before today can be broken down by day,
-- because nothing before today was recorded that way. The analytics page says
-- so rather than drawing a flat line, which would read as "nobody came".
-- ---------------------------------------------------------------------

create table if not exists public.card_views_daily (
  business_id uuid not null references public.businesses(id) on delete cascade,
  day         date not null default current_date,
  views       integer not null default 0,
  primary key (business_id, day)
);

create index if not exists card_views_daily_day_idx on public.card_views_daily (day);

alter table public.card_views_daily enable row level security;
-- No policy on purpose: only the server reads this, with the service_role key.

create or replace function public.increment_view_count(card_slug text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid;
begin
  update public.businesses
     set view_count = view_count + 1
   where slug = card_slug
  returning id into v_id;

  if v_id is null then return; end if;

  insert into public.card_views_daily (business_id, day, views)
  values (v_id, current_date, 1)
  on conflict (business_id, day) do update set views = card_views_daily.views + 1;
end;
$function$;

-- ---------------------------------------------------------------------
-- dashboard_stats — the numbers, scoped to whoever is asking.
--
-- The scoping lives here rather than in the page. A reseller must never be
-- shown another reseller's totals, and a query written slightly wrong upstairs
-- is exactly how that happens — it already happened once with RLS in 006.
-- Main admin sees everything; a reseller sees themselves and their customers.
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats(p_profile uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text;
  v_ids uuid[];
  v_out jsonb;
begin
  select role into v_role from public.profiles where id = p_profile;
  if v_role is null then return '{}'::jsonb; end if;

  if v_role = 'main_admin' then
    select array_agg(id) into v_ids from public.profiles;
  else
    select array_agg(id) into v_ids
      from public.profiles
     where id = p_profile or parent_id = p_profile;
  end if;

  select jsonb_build_object(
    'cards',        (select count(*) from public.businesses where owner_id = any(v_ids)),
    'live',         (select count(*) from public.businesses where owner_id = any(v_ids) and published),
    'suspended',    (select count(*) from public.businesses where owner_id = any(v_ids) and suspended_at is not null),
    'views_total',  (select coalesce(sum(view_count),0) from public.businesses where owner_id = any(v_ids)),
    'views_30',     (select coalesce(sum(v.views),0) from public.card_views_daily v
                       join public.businesses b on b.id = v.business_id
                      where b.owner_id = any(v_ids) and v.day > current_date - 30),
    'views_prev30', (select coalesce(sum(v.views),0) from public.card_views_daily v
                       join public.businesses b on b.id = v.business_id
                      where b.owner_id = any(v_ids)
                        and v.day > current_date - 60 and v.day <= current_date - 30),
    'people',       (select count(*) from public.profiles where parent_id = p_profile),
    'resellers',    (case when v_role = 'main_admin'
                          then (select count(*) from public.profiles where role = 'sub_admin') else null end),
    'customers',    (case when v_role = 'main_admin'
                          then (select count(*) from public.profiles where role = 'end_user') else null end),
    'balance',      public.wallet_balance(p_profile),
    'taken',        (case when v_role = 'main_admin'
                          then (select coalesce(sum(amount),0) from public.wallet_transactions where kind = 'topup')
                          else null end),
    'spent',        (select coalesce(-sum(amount),0) from public.wallet_transactions
                      where profile_id = any(v_ids) and amount < 0),
    'expiring',     (select count(*) from public.businesses
                      where owner_id = any(v_ids) and expires_at is not null
                        and expires_at between now() and now() + interval '30 days'),
    'feedback_30',  (select count(*) from public.feedback f
                       join public.businesses b on b.id = f.business_id
                      where b.owner_id = any(v_ids) and f.created_at > now() - interval '30 days')
  ) into v_out;

  return v_out;
end;
$function$;

-- Daily series for the chart. generate_series so that quiet days appear as
-- zero rather than vanishing — a chart with missing days lies about the shape.
create or replace function public.views_series(p_profile uuid, p_days integer default 30)
returns table (day date, views bigint)
language sql security definer set search_path to 'public' as $function$
  with ids as (
    select id from public.profiles
     where (select role from public.profiles where id = p_profile) = 'main_admin'
        or id = p_profile or parent_id = p_profile
  ),
  days as (
    select generate_series(current_date - (p_days - 1), current_date, '1 day')::date as day
  )
  select d.day, coalesce(sum(v.views), 0)::bigint as views
    from days d
    left join public.card_views_daily v on v.day = d.day
    left join public.businesses b on b.id = v.business_id and b.owner_id in (select id from ids)
   where b.id is not null or v.business_id is null
   group by d.day
   order by d.day;
$function$;
