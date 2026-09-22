import { createClient } from "@/lib/supabase/server";
import type { PlanVarianteTyp, ZeitEintragRow } from "@/lib/supabase/types";
import { heuteInWien } from "@/lib/dienstplan";

/** Montag (YYYY-MM-DD) der Kalenderwoche, in der `datum` liegt. */
export function montagDerWoche(datum: string = heuteInWien()): string {
  const d = new Date(`${datum}T00:00:00Z`);
  const isoWochentag = (d.getUTCDay() + 6) % 7; // 0=Mo ... 6=So
  d.setUTCDate(d.getUTCDate() - isoWochentag);
  return d.toISOString().slice(0, 10);
}

/** Echtes Kalenderdatum fuer einen Wochentag-Index (0=Mo..5=Sa) ab einem Montag. */
export function datumFuerWochentag(montag: string, wochentag: number): string {
  const d = new Date(`${montag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + wochentag);
  return d.toISOString().slice(0, 10);
}

/** Montag der Woche `offsetWochen` relativ zu dieser Woche (0=aktuell, -1=letzte Woche). */
export function montagMitOffset(offsetWochen: number): string {
  const d = new Date(`${montagDerWoche()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetWochen * 7);
  return d.toISOString().slice(0, 10);
}

export async function getZeitEintraegeFuerProfilUndDaten(
  profileId: string,
  daten: string[]
): Promise<ZeitEintragRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zeit_eintraege")
    .select("*")
    .eq("profile_id", profileId)
    .in("datum", daten);

  if (error) {
    throw new Error(`Zeiteintraege konnten nicht geladen werden: ${error.message}`);
  }

  return data ?? [];
}

export interface ZeiterfassungSlot {
  id: string;
  wochentag: number;
  halbtag: "vm" | "nm";
  stunden: number;
}

export async function getPlanSlotsFuerZeiterfassung(
  variante: PlanVarianteTyp,
  profileId: string,
  zyklusWoche: number
): Promise<ZeiterfassungSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_slots")
    .select("id, wochentag, halbtag, stunden")
    .eq("variante", variante)
    .eq("profile_id", profileId)
    .eq("zyklus_woche", zyklusWoche)
    .order("wochentag")
    .order("halbtag");

  if (error) {
    throw new Error(`Plan-Slots konnten nicht geladen werden: ${error.message}`);
  }

  return data ?? [];
}

export async function istMonatGesperrt(jahr: number, monat: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monatsabschluesse")
    .select("jahr")
    .eq("jahr", jahr)
    .eq("monat", monat)
    .maybeSingle();

  if (error) {
    throw new Error(`Monatsabschluss konnte nicht geprueft werden: ${error.message}`);
  }

  return data !== null;
}
