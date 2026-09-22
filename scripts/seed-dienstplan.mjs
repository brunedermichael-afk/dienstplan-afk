// Einmaliges Seed-Skript: legt die 6 Mitarbeiter-Accounts (Platzhalter-E-Mails) an
// und importiert den kompletten Dienstplan aus dienstplan-seed.json.
//
// Benoetigt SUPABASE_SERVICE_ROLE_KEY in der Umgebung (nicht committen!):
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-dienstplan.mjs
//
// Kann gefahrlos mehrfach ausgefuehrt werden: bereits vorhandene Accounts
// werden wiederverwendet, plan_slots/dienstplan_settings werden vorher geleert.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Fehlend: NEXT_PUBLIC_SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL_DOMAIN = "sportmayer-dienstplan.local";

const STAFF = [
  { name: "Michael", role: "admin" },
  { name: "Barbara", role: "employee" },
  { name: "Klaus", role: "employee" },
  { name: "Babsi", role: "employee" },
  { name: "Elfi", role: "employee" },
  { name: "Christine", role: "employee" },
];

function resolveAbteilung(person, t, home, satdept) {
  switch (t) {
    case "admin":
      return "admin";
    case "digital":
      return "digital";
    case "back":
      return "backoffice";
    case "sat":
      return satdept[person];
    case "floor":
      return home[person] === "flex" ? satdept[person] : home[person];
    default:
      throw new Error(`Unbekannter Slot-Typ "${t}" fuer ${person}`);
  }
}

async function findExistingUserIdByEmail(email) {
  // Kleine Mitarbeiterliste (6 Personen) -> eine Seite reicht.
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id ?? null;
}

async function ensureAuthUser(name) {
  const email = `${name.toLowerCase()}@${EMAIL_DOMAIN}`;
  const existingId = await findExistingUserIdByEmail(email);
  if (existingId) {
    console.log(`- ${name} <${email}> existiert bereits (${existingId})`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  console.log(`- ${name} <${email}> angelegt (${data.user.id})`);
  return data.user.id;
}

async function main() {
  const seed = JSON.parse(
    await readFile(new URL("../dienstplan-seed.json", import.meta.url))
  );
  const { soll, satdept, home } = seed.meta;

  console.log("Lege Accounts an (falls noch nicht vorhanden)...");
  const idByName = {};
  for (const { name } of STAFF) {
    idByName[name] = await ensureAuthUser(name);
  }

  console.log("Aktualisiere Profile (Name, Rolle, Abteilung, Soll-Stunden)...");
  for (const { name, role } of STAFF) {
    const { error } = await admin
      .from("profiles")
      .update({
        name,
        role,
        abteilung: home[name],
        soll_stunden_woche: soll[name],
        aktiv: true,
      })
      .eq("id", idByName[name]);
    if (error) throw error;
  }

  console.log("Leere bestehende plan_slots / dienstplan_settings...");
  {
    const { error } = await admin
      .from("plan_slots")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
  }

  console.log("Baue plan_slots aus Seed-Daten...");
  const rows = [];
  for (const variante of ["A", "B"]) {
    for (const [wocheStr, personen] of Object.entries(seed[variante])) {
      const zyklus_woche = Number(wocheStr);
      for (const [name, slots] of Object.entries(personen)) {
        for (const [key, slot] of Object.entries(slots)) {
          const [wochentagStr, halbtagStr] = key.split("-");
          rows.push({
            variante,
            zyklus_woche,
            wochentag: Number(wochentagStr),
            halbtag: halbtagStr === "0" ? "vm" : "nm",
            profile_id: idByName[name],
            stunden: slot.h,
            abteilung_an_diesem_slot: resolveAbteilung(
              name,
              slot.t,
              home,
              satdept
            ),
            pause_min: 0,
          });
        }
      }
    }
  }

  console.log(`Fuege ${rows.length} plan_slots ein...`);
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from("plan_slots").insert(chunk);
    if (error) throw error;
  }

  console.log("Setze dienstplan_settings (Zyklus-Start, aktive Variante)...");
  {
    const { error } = await admin.from("dienstplan_settings").upsert({
      id: 1,
      zyklus_start: "2026-09-21", // Montag der aktuellen Woche, Annahme (per Admin-UI aenderbar)
      aktive_variante: "A",
    });
    if (error) throw error;
  }

  console.log("Fertig.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
