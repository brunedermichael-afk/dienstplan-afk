"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function upsertZeitEintrag(formData: FormData) {
  const session = await getCurrentUserAndProfile();
  if (!session?.profile) {
    throw new Error("Nicht eingeloggt.");
  }
  if (!session.profile.zeiterfassung_vereinbarung) {
    throw new Error("Zeiterfassung ist fuer dieses Konto noch nicht freigeschaltet.");
  }

  const planSlotId = String(formData.get("plan_slot_id"));
  const datum = String(formData.get("datum"));
  const geplanteStunden = Number(formData.get("geplante_stunden"));
  const istStunden = Number(formData.get("ist_stunden"));
  const grundRaw = String(formData.get("grund") ?? "").trim();

  if (istStunden !== geplanteStunden && grundRaw.length === 0) {
    throw new Error("Bei Abweichung von den geplanten Stunden ist ein Grund Pflicht.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("zeit_eintraege").upsert(
    {
      profile_id: session.profile.id,
      datum,
      plan_slot_id: planSlotId,
      geplante_stunden: geplanteStunden,
      ist_stunden: istStunden,
      grund: grundRaw.length > 0 ? grundRaw : null,
      erstellt_von: session.profile.id,
    },
    { onConflict: "profile_id,datum,plan_slot_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/zeiterfassung");
}
