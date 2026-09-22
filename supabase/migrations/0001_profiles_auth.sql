-- Profile-Tabelle + Rollen (employee/admin) fuer die Sport Mayer Dienstplan-App.
-- Accounts werden vom Admin ueber die Supabase-Einladung per E-Mail angelegt;
-- der Trigger unten legt dabei automatisch eine passende profiles-Zeile an.

create type public.user_role as enum ('employee', 'admin');
create type public.abteilung_typ as enum ('sport', 'schuh', 'flex');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.user_role not null default 'employee',
  soll_stunden_woche numeric(5, 2) not null default 0,
  abteilung public.abteilung_typ not null default 'flex',
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Alle eingeloggten Personen sehen alle Profile (Namen im Dienstplan, keine sensiblen Daten).
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Nur Admins duerfen Profile aendern (Rolle, Soll-Stunden, Abteilung, aktiv).
create policy "profiles_update_admin"
  on public.profiles
  for update
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

-- Legt bei neuer Einladung/Anmeldung automatisch ein profiles-Grunddatensatz an.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
