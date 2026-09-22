-- Dienstplan-Datenmodell: plan_slots + zyklus_start/aktive Variante.
-- RLS: alle eingeloggten Personen duerfen lesen, nur admin darf schreiben.

create type public.halbtag_typ as enum ('vm', 'nm');
create type public.plan_variante_typ as enum ('A', 'B');
create type public.slot_abteilung_typ as enum ('sport', 'schuh', 'admin', 'digital', 'backoffice');

create table public.plan_slots (
  id uuid primary key default gen_random_uuid(),
  variante public.plan_variante_typ not null,
  zyklus_woche smallint not null check (zyklus_woche between 1 and 4),
  wochentag smallint not null check (wochentag between 0 and 5),
  halbtag public.halbtag_typ not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stunden numeric(4, 2) not null check (stunden > 0),
  abteilung_an_diesem_slot public.slot_abteilung_typ not null,
  pause_min smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (variante, zyklus_woche, wochentag, halbtag, profile_id)
);

create index plan_slots_lookup_idx
  on public.plan_slots (variante, zyklus_woche, wochentag, halbtag);

alter table public.plan_slots enable row level security;

create policy "plan_slots_select_authenticated"
  on public.plan_slots
  for select
  to authenticated
  using (true);

create policy "plan_slots_write_admin"
  on public.plan_slots
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Einstellungen des Dienstplans: Zyklus-Start-Datum + aktive Variante (A/B).
-- Einzeiliger Settings-"Table", id fix auf 1.
create table public.dienstplan_settings (
  id smallint primary key default 1 check (id = 1),
  zyklus_start date not null,
  aktive_variante public.plan_variante_typ not null default 'A',
  updated_at timestamptz not null default now()
);

alter table public.dienstplan_settings enable row level security;

create policy "dienstplan_settings_select_authenticated"
  on public.dienstplan_settings
  for select
  to authenticated
  using (true);

create policy "dienstplan_settings_write_admin"
  on public.dienstplan_settings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
