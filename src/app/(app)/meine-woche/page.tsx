import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import {
  berechneZyklusWoche,
  getDienstplanSettings,
  getPlanSlotsForProfil,
  type EigenerSlot,
} from "@/lib/dienstplan";
import { ABTEILUNG_BADGE_CLASS, ABTEILUNG_LABEL, WOCHENTAGE } from "@/lib/constants";

function gruppiereNachWoche(slots: EigenerSlot[]) {
  const byWoche = new Map<number, Map<number, { vm?: EigenerSlot; nm?: EigenerSlot }>>();
  for (let w = 1; w <= 4; w++) {
    const byTag = new Map<number, { vm?: EigenerSlot; nm?: EigenerSlot }>();
    for (let tag = 0; tag < 6; tag++) byTag.set(tag, {});
    byWoche.set(w, byTag);
  }
  for (const slot of slots) {
    const tage = byWoche.get(slot.zyklus_woche);
    const eintrag = tage?.get(slot.wochentag);
    if (eintrag) {
      eintrag[slot.halbtag] = slot;
    }
  }
  return byWoche;
}

export default async function MeineWochePage() {
  const session = await getCurrentUserAndProfile();
  if (!session?.profile) {
    redirect("/login");
  }
  const { profile } = session;

  const settings = await getDienstplanSettings();
  const aktuelleWoche = berechneZyklusWoche(settings.zyklus_start);
  const slots = await getPlanSlotsForProfil(settings.aktive_variante, profile.id);
  const byWoche = gruppiereNachWoche(slots);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Meine Woche / Mein Zyklus
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Soll: {profile.soll_stunden_woche} Std./Woche
        </p>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4].map((woche) => {
          const byTag = byWoche.get(woche)!;
          const geplanteStunden = slots
            .filter((s) => s.zyklus_woche === woche)
            .reduce((sum, s) => sum + Number(s.stunden), 0);

          return (
            <div
              key={woche}
              className={`rounded-xl border bg-white p-4 ${
                woche === aktuelleWoche
                  ? "border-slate-900"
                  : "border-slate-200"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Woche {woche}
                  {woche === aktuelleWoche ? " (aktuell)" : ""}
                </h2>
                <span className="text-xs text-slate-500">
                  {geplanteStunden} Std. geplant
                </span>
              </div>

              <div className="space-y-1.5">
                {WOCHENTAGE.map((label, tag) => {
                  const { vm, nm } = byTag.get(tag)!;
                  if (!vm && !nm) return null;
                  return (
                    <div
                      key={tag}
                      className="flex items-center justify-between gap-2 border-t border-slate-100 py-1.5 first:border-t-0"
                    >
                      <span className="w-8 shrink-0 text-sm font-medium text-slate-700">
                        {label}
                      </span>
                      <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                        {[vm, nm].filter(Boolean).map((slot, i) => (
                          <span
                            key={i}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              ABTEILUNG_BADGE_CLASS[slot!.abteilung_an_diesem_slot]
                            }`}
                          >
                            {slot!.halbtag === "vm" ? "VM" : "NM"} ·{" "}
                            {ABTEILUNG_LABEL[slot!.abteilung_an_diesem_slot]} ·{" "}
                            {slot!.stunden} Std.
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
