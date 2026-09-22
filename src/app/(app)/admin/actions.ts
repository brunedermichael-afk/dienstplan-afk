"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { HalbtagTyp, PlanVarianteTyp, SlotAbteilungTyp } from "@/lib/supabase/types";

async function requireAdmin() {
  const session = await getCurrentUserAndProfile();
  if (!session?.profile || session.profile.role !== "admin") {
    throw new Error("Nur Admins duerfen den Dienstplan bearbeiten.");
  }
  return session.profile;
}

export async function updateSettings(formData: FormData) {
  await requireAdmin();
  const zyklus_start = String(formData.get("zyklus_start"));
  const aktive_variante = String(formData.get("aktive_variante")) as PlanVarianteTyp;

  const supabase = await createClient();
  const { error } = await supabase
    .from("dienstplan_settings")
    .update({ zyklus_start, aktive_variante, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/filiale");
  revalidatePath("/meine-woche");
}

export async function createSlot(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("plan_slots").insert({
    variante: String(formData.get("variante")) as PlanVarianteTyp,
    zyklus_woche: Number(formData.get("zyklus_woche")),
    wochentag: Number(formData.get("wochentag")),
    halbtag: String(formData.get("halbtag")) as HalbtagTyp,
    profile_id: String(formData.get("profile_id")),
    abteilung_an_diesem_slot: String(
      formData.get("abteilung_an_diesem_slot")
    ) as SlotAbteilungTyp,
    stunden: Number(formData.get("stunden")),
    pause_min: Number(formData.get("pause_min")) || 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/filiale");
  revalidatePath("/meine-woche");
}

export async function updateSlot(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("plan_slots")
    .update({
      abteilung_an_diesem_slot: String(
        formData.get("abteilung_an_diesem_slot")
      ) as SlotAbteilungTyp,
      stunden: Number(formData.get("stunden")),
      pause_min: Number(formData.get("pause_min")) || 0,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/filiale");
  revalidatePath("/meine-woche");
}

export async function deleteSlot(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const { error } = await supabase.from("plan_slots").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/filiale");
  revalidatePath("/meine-woche");
}

export async function setZeiterfassungVereinbarung(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const profileId = String(formData.get("profile_id"));
  const vereinbarung = formData.get("zeiterfassung_vereinbarung") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({ zeiterfassung_vereinbarung: vereinbarung })
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function monatAbschliessen(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const jahr = Number(formData.get("jahr"));
  const monat = Number(formData.get("monat"));

  const { error } = await supabase
    .from("monatsabschluesse")
    .insert({ jahr, monat, gesperrt_von: admin.id });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/zeiterfassung");
}
