import type { SlotAbteilungTyp } from "@/lib/supabase/types";

export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

export const ABTEILUNG_LABEL: Record<SlotAbteilungTyp, string> = {
  sport: "Sport",
  schuh: "Schuh",
  admin: "Admin",
  digital: "Digital",
  backoffice: "Backoffice",
};

export const ABTEILUNG_BADGE_CLASS: Record<SlotAbteilungTyp, string> = {
  sport: "bg-blue-100 text-blue-800",
  schuh: "bg-emerald-100 text-emerald-800",
  admin: "bg-slate-200 text-slate-700",
  digital: "bg-violet-100 text-violet-800",
  backoffice: "bg-amber-100 text-amber-800",
};
