# Sport Mayer – Dienstplan-App (V1)

Interne Web-App für die 6 Mitarbeiter:innen von Sport Mayer, Stadtplatz Schärding.
**Scope V1: nur Dienstplan-Anzeige** — wer wann in welcher Abteilung arbeitet. Kein Login-geschütztes Admin-Panel für Michael nötig, Zeiterfassung/Urlaub/Feedback sind bewusst zurückgestellt (siehe „Später“ unten).
Sprache der UI: Deutsch (Österreich), du-Form. Mobile first – wird fast nur am Handy genutzt.

## Stack
- Next.js (App Router, TypeScript), Tailwind
- Supabase: Auth, Postgres, Row Level Security (RLS) — auch in V1 sinnvoll, damit spätere Phasen ohne Umbau andocken
- Hosting: Vercel, Repo auf GitHub
- Zeitzone überall `Europe/Vienna`

## Rollen (V1)
- `employee`: sieht Filial-Übersicht + eigenen Dienstplan (read-only)
- `admin` (Michael): zusätzlich Dienstplan pflegen (Slots bearbeiten, Zyklus-Start setzen, Variante A/B wählen)

Kein gesondertes „Admin-Dashboard“ mit Auswertungen o.ä. in V1 — nur die Bearbeiten-Funktion für den Plan selbst, an derselben Stelle wie die Anzeige.

## Login
- Supabase Auth mit E-Mail + Magic Link (kein Passwort-Management nötig)
- Keine offene Registrierung: Admin legt Accounts an (Einladung per E-Mail)
- Session bleibt am Handy lange angemeldet

## Datenmodell (V1)
- `profiles`: id (= auth.users.id), name, role, soll_stunden_woche, abteilung (sport/schuh/flex), aktiv
  - `abteilung = 'flex'` für Michael und Klaus: beide sind universell in Schuh & Sport einsetzbar und werden bei der Anzeige/Planung nicht auf eine Abteilung fixiert
- `plan_slots`: zyklus_woche (1–4), wochentag (0=Mo … 5=Sa), halbtag (vm/nm), profile_id, stunden, abteilung_an_diesem_slot (sport/schuh/admin/digital/backoffice — bei flex-Personen pro Slot wählbar), pause_min
- `zyklus_start`: Datum, an dem Woche 1 des 4-Wochen-Zyklus beginnt (rollierend, unabhängig vom Monat)

Seed-Daten: `dienstplan-seed.json` (Variante A und B, Soll-Stunden, Samstags-Rad).

## Funktionen (V1)
### Alle Mitarbeiter:innen
1. **Filiale:** Übersicht Mo–Sa, wer wann in welcher Abteilung da ist (wie die HTML-Vorschau, nur live aus der DB)
2. **Meine Woche/Mein Zyklus:** eigener Plan über die 4 Wochen, inkl. Samstags-Rotation
3. **Wochenstunden-Soll** je Person sichtbar (nur zur Orientierung, keine Ist-Erfassung)

### Admin (Michael)
1. **Plan bearbeiten:** Slots anlegen/ändern, Zyklus-Start setzen, zwischen Variante A/B wechseln
2. **Flex-Zuordnung:** bei Michael und Klaus pro Slot Schuh oder Sport wählen, ohne die Person aus dem Plan zu nehmen

## Sicherheit
- RLS: alle lesen den gesamten Dienstplan (kein sensibler Inhalt), nur `admin` darf `plan_slots`/`zyklus_start` schreiben
- Keine personenbezogenen Daten außer Name und Abteilung — daher kein DSGVO-Sonderaufwand in V1

## Arbeitsweise für Claude Code
- In kleinen Schritten bauen, nach jedem Schritt lauffähig halten
- Reihenfolge: 1) Setup + Auth + Rollen, 2) Datenmodell + RLS + Seed aus `dienstplan-seed.json`, 3) Filial-Übersicht (read-only), 4) Meine-Woche-Ansicht, 5) Admin-Bearbeiten (inkl. Flex-Zuordnung Michael/Klaus)
- Migrations als SQL-Dateien unter `supabase/migrations`
- `.env.example` pflegen, keine Secrets committen
- Design/Optik orientiert sich an der bereits gebauten HTML-Vorschau (Farben, Typografie, Tab-Navigation)

## Später (bewusst nicht in V1, aber Datenmodell so anlegen, dass es andockbar bleibt)
- **Zeiterfassung:** Stempeln, Abweichungen/Nachträge mit Begründungspflicht, Audit-Log pro Änderung, Monatsabschluss + Sperre, PDF/CSV-Export für Lohnverrechnung und für Mitarbeiter:innen-Selbstauskunft. Rechtlicher Hintergrund (§ 26 AZG) bereits geklärt: eigene Aufzeichnung ist zulässig, braucht aber eine Vereinbarung pro Person, Anleitung/Kontrolle durch den Arbeitgeber und – bei fixem Dienstplan – nur eine Abweichungs-Aufzeichnung statt Vollerfassung.
- **Urlaubs-/Abwesenheitsanträge:** Antrag mit Zeitraum + Typ, Admin bekommt Benachrichtigung, genehmigt/lehnt ab, Status für Mitarbeiter:in einsehbar. Braucht eine `absences`-Tabelle plus `notifications`.
- **Anonymes Feedback:** Freitextfeld ohne Personenbezug (keine user_id/IP, nur Datum), Insert über Server-Route mit Service-Role, RLS nur für Admin lesbar. Bei 6 Personen bleibt Inhalt potenziell zuordenbar — technisch nicht lösbar, nur als Hinweis in der UI.

Wenn eine dieser Erweiterungen ansteht, eigenen Abschnitt hier ergänzen statt alles auf einmal vorzubauen.
