-- Fix: die urspruengliche insert/update-Policy liess Admins ihre eigene
-- Vereinbarungspflicht umgehen (admin-Klausel griff unabhaengig vom
-- profile_id-Ziel). Die Vereinbarung ist aber pro Person vorgeschrieben,
-- auch fuer den Admin selbst. Neu: das Vereinbarungs-Flag der Zielperson
-- gilt immer; admin darf zusaetzlich fuer andere Personen schreiben.

drop policy "zeit_eintraege_insert_own_or_admin" on public.zeit_eintraege;
drop policy "zeit_eintraege_update_own_or_admin" on public.zeit_eintraege;

create policy "zeit_eintraege_insert_own_or_admin"
  on public.zeit_eintraege
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = zeit_eintraege.profile_id and p.zeiterfassung_vereinbarung = true
    )
    and (
      profile_id = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
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
    exists (
      select 1 from public.profiles p
      where p.id = zeit_eintraege.profile_id and p.zeiterfassung_vereinbarung = true
    )
    and (
      profile_id = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );
