import { createClient } from "@/lib/supabase/server";
import type {
  DienstplanSettingsRow,
  PlanVarianteTyp,
  ProfileRow,
  SlotAbteilungTyp,
} from "@/lib/supabase/types";

const ZEITZONE = "Europe/Vienna";

/** Heutiges Datum als YYYY-MM-DD in Europe/Vienna. */
export function heuteInWien(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZEITZONE }).format(
    new Date()
  );
}

/** Ermittelt die aktuelle Zyklus-Woche (1-4) aus dem Start-Datum, rollierend. */
export function berechneZyklusWoche(
  zyklusStart: string,
  heute: string = heuteInWien()
): number {
  const start = new Date(`${zyklusStart}T00:00:00Z`);
  const jetzt = new Date(`${heute}T00:00:00Z`);
  const tageSeitStart = Math.floor(
    (jetzt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const wochenIndex = Math.floor(tageSeitStart / 7);
  // Modulo, das auch fuer negative Werte (Start liegt in der Zukunft) 0..3 liefert.
  const zyklusIndex = ((wochenIndex % 4) + 4) % 4;
  return zyklusIndex + 1;
}

export async function getDienstplanSettings(): Promise<DienstplanSettingsRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dienstplan_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error || !data) {
    throw new Error(
      `Dienstplan-Einstellungen konnten nicht geladen werden: ${error?.message}`
    );
  }

  return data;
}

export interface FilialeSlot {
  wochentag: number;
  halbtag: "vm" | "nm";
  stunden: number;
  abteilung_an_diesem_slot: SlotAbteilungTyp;
  profile: Pick<ProfileRow, "id" | "name">;
}

export async function getPlanSlotsForWeek(
  variante: PlanVarianteTyp,
  zyklusWoche: number
): Promise<FilialeSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_slots")
    .select(
      "wochentag, halbtag, stunden, abteilung_an_diesem_slot, profile:profiles(id, name)"
    )
    .eq("variante", variante)
    .eq("zyklus_woche", zyklusWoche)
    .order("wochentag")
    .order("halbtag");

  if (error) {
    throw new Error(`Dienstplan konnte nicht geladen werden: ${error.message}`);
  }

  return (data ?? []) as unknown as FilialeSlot[];
}

export interface EigenerSlot {
  zyklus_woche: number;
  wochentag: number;
  halbtag: "vm" | "nm";
  stunden: number;
  abteilung_an_diesem_slot: SlotAbteilungTyp;
}

export async function getPlanSlotsForProfil(
  variante: PlanVarianteTyp,
  profileId: string
): Promise<EigenerSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_slots")
    .select("zyklus_woche, wochentag, halbtag, stunden, abteilung_an_diesem_slot")
    .eq("variante", variante)
    .eq("profile_id", profileId)
    .order("zyklus_woche")
    .order("wochentag")
    .order("halbtag");

  if (error) {
    throw new Error(`Dienstplan konnte nicht geladen werden: ${error.message}`);
  }

  return data ?? [];
}

export async function getAlleAktivenProfile(): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("aktiv", true)
    .order("name");

  if (error) {
    throw new Error(`Profile konnten nicht geladen werden: ${error.message}`);
  }

  return data ?? [];
}
