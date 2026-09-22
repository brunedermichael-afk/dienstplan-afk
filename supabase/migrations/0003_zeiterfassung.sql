-- Zeiterfassung (Phase 2): Abweichungs-Aufzeichnung statt Vollerfassung.
-- Ist-Stunden pro geplantem Slot, mit Begruendungspflicht bei Abweichung,
-- Audit-Log und Monatssperre.

alter table public.profiles
  add column zeiterfassung_vereinbarung boolean not null default false;

create table public.zeit_eintraege (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  datum date not null,
  plan_slot_id uuid references public.plan_slots (id) on delete set null,
  geplante_stunden numeric(4, 2) not null,
  ist_stunden numeric(4, 2) not null check (ist_stunden >= 0),
  grund text,
  erstellt_von uuid not null references public.profiles (id),
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  unique (profile_id, datum, plan_slot_id),
  constraint grund_bei_abweichung check (
    ist_stunden = geplante_stunden or (grund is not null and length(trim(grund)) > 0)
  )
);

create index zeit_eintraege_profile_datum_idx on public.zeit_eintraege (profile_id, datum);

-- Monatssperre: einmal geschlossene Monate sind fix (keine Wiedereroeffnung in V2).
create table public.monatsabschluesse (
  jahr smallint not null,
  monat smallint not null check (monat between 1 and 12),
  gesperrt_am timestamptz not null default now(),
  gesperrt_von uuid not null references public.profiles (id),
  primary key (jahr, monat)
);

create function public.pruefe_monat_offen()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.monatsabschluesse m
    where m.jahr = extract(year from new.datum)
      and m.monat = extract(month from new.datum)
  ) then
    raise exception 'Monat % / % ist bereits abgeschlossen.',
      extract(month from new.datum), extract(year from new.datum);
  end if;
  return new;
end;
$$;

create trigger zeit_eintraege_monat_offen
  before insert or update on public.zeit_eintraege
  for each row execute function public.pruefe_monat_offen();

-- Audit-Log: jede Aenderung wird protokolliert, Eintraege selbst sind
-- ueber die App nicht loeschbar (kein delete-RLS-Policy weiter unten).
create table public.zeit_eintraege_audit (
  id uuid primary key default gen_random_uuid(),
  eintrag_id uuid not null,
  aktion text not null check (aktion in ('insert', 'update', 'delete')),
  alte_daten jsonb,
  neue_daten jsonb,
  geaendert_von uuid references public.profiles (id),
  geaendert_am timestamptz not null default now()
);

create function public.zeit_eintraege_audit_fn()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.zeit_eintraege_audit (eintrag_id, aktion, neue_daten, geaendert_von)
    values (new.id, 'insert', to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    new.aktualisiert_am := now();
    insert into public.zeit_eintraege_audit (eintrag_id, aktion, alte_daten, neue_daten, geaendert_von)
    values (new.id, 'update', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  else
    insert into public.zeit_eintraege_audit (eintrag_id, aktion, alte_daten, geaendert_von)
    values (old.id, 'delete', to_jsonb(old), auth.uid());
    return old;
  end if;
end;
$$;

create trigger zeit_eintraege_audit_trigger
  before insert or update or delete on public.zeit_eintraege
  for each row execute function public.zeit_eintraege_audit_fn();

alter table public.zeit_eintraege enable row level security;
alter table public.zeit_eintraege_audit enable row level security;
alter table public.monatsabschluesse enable row level security;

-- zeit_eintraege: eigene Zeilen lesen/schreiben (nur mit Vereinbarung), Admin alles.
create policy "zeit_eintraege_select_own_or_admin"
  on public.zeit_eintraege
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "zeit_eintraege_insert_own_or_admin"
  on public.zeit_eintraege
  for insert
  to authenticated
  with check (
    (
      profile_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.zeiterfassung_vereinbarung = true
      )
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "zeit_eintraege_update_own_or_admin"
  on public.zeit_eintraege
  for update
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    (
      profile_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.zeiterfassung_vereinbarung = true
      )
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- zeit_eintraege_audit: nur Admin liest, niemand schreibt ueber die App (Trigger via security definer).
create policy "zeit_eintraege_audit_select_admin"
  on public.zeit_eintraege_audit
  for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- monatsabschluesse: alle lesen (Transparenz, welcher Monat offen ist), nur Admin schliesst ab.
create policy "monatsabschluesse_select_authenticated"
  on public.monatsabschluesse
  for select
  to authenticated
  using (true);

create policy "monatsabschluesse_insert_admin"
  on public.monatsabschluesse
  for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
