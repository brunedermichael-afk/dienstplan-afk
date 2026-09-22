import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { berechneZyklusWoche, getDienstplanSettings } from "@/lib/dienstplan";
import {
  datumFuerWochentag,
  getPlanSlotsFuerZeiterfassung,
  getZeitEintraegeFuerProfilUndDaten,
  istMonatGesperrt,
  montagMitOffset,
} from "@/lib/zeiterfassung";
import { WOCHENTAGE } from "@/lib/constants";
import type { ZeitEintragRow } from "@/lib/supabase/types";
import { upsertZeitEintrag } from "./actions";

function formatiereTag(datum: string) {
  const d = new Date(`${datum}T00:00:00Z`);
  return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" });
}

export default async function ZeiterfassungPage({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string }>;
}) {
  const session = await getCurrentUserAndProfile();
  if (!session?.profile) {
    redirect("/login");
  }
  const { profile } = session;

  const { woche } = await searchParams;
  const offset = Math.min(0, Math.max(-8, Number(woche) || 0));
  const montag = montagMitOffset(offset);

  const settings = await getDienstplanSettings();
  const zyklusWoche = berechneZyklusWoche(settings.zyklus_start, montag);

  const [planSlots] = await Promise.all([
    getPlanSlotsFuerZeiterfassung(settings.aktive_variante, profile.id, zyklusWoche),
  ]);

  const tageDaten = Array.from({ length: 6 }, (_, tag) => datumFuerWochentag(montag, tag));
  const eintraege = await getZeitEintraegeFuerProfilUndDaten(profile.id, tageDaten);
  const eintragBySlot = new Map<string, ZeitEintragRow>();
  for (const e of eintraege) {
    if (e.plan_slot_id) eintragBySlot.set(e.plan_slot_id, e);
  }

  const monateInWoche = new Set(
    tageDaten.map((d) => `${d.slice(0, 4)}-${d.slice(5, 7)}`)
  );
  const gesperrtProMonat = new Map<string, boolean>();
  for (const monatKey of monateInWoche) {
    const [jahr, monat] = monatKey.split("-").map(Number);
    gesperrtProMonat.set(monatKey, await istMonatGesperrt(jahr, monat));
  }

  if (!profile.zeiterfassung_vereinbarung) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">Zeiterfassung</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Zeiterfassung ist für dein Konto noch nicht freigeschaltet. Sprich
          mit dem Admin — er aktiviert es nach Unterzeichnung der
          Vereinbarung.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Zeiterfassung</h1>

      <div className="flex items-center justify-between">
        <Link
          href={`/zeiterfassung?woche=${offset - 1}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
        >
          ← Vorherige
        </Link>
        <span className="text-sm text-slate-500">
          {formatiereTag(montag)}–{formatiereTag(datumFuerWochentag(montag, 5))}
        </span>
        {offset < 0 ? (
          <Link
            href={`/zeiterfassung?woche=${offset + 1}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          >
            Nächste →
          </Link>
        ) : (
          <span className="w-[92px]" />
        )}
      </div>

      <div className="space-y-2">
        {WOCHENTAGE.map((label, tag) => {
          const datum = tageDaten[tag];
          const slots = planSlots.filter((s) => s.wochentag === tag);
          if (slots.length === 0) return null;
          const monatKey = `${datum.slice(0, 4)}-${datum.slice(5, 7)}`;
          const gesperrt = gesperrtProMonat.get(monatKey) ?? false;

          return (
            <div key={tag} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {label} · {formatiereTag(datum)}
                </h2>
                {gesperrt && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    Monat abgeschlossen
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {slots.map((slot) => {
                  const bestehend = eintragBySlot.get(slot.id);
                  const istStunden = bestehend?.ist_stunden ?? slot.stunden;
                  return (
                    <form
                      key={slot.id}
                      action={upsertZeitEintrag}
                      className="space-y-2 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0"
                    >
                      <input type="hidden" name="plan_slot_id" value={slot.id} />
                      <input type="hidden" name="datum" value={datum} />
                      <input type="hidden" name="geplante_stunden" value={slot.stunden} />
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{slot.halbtag === "vm" ? "Vormittag" : "Nachmittag"}</span>
                        <span>Geplant: {slot.stunden} Std.</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="ist_stunden"
                          step="0.25"
                          min="0"
                          defaultValue={istStunden}
                          disabled={gesperrt}
                          required
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                        />
                        <input
                          type="text"
                          name="grund"
                          defaultValue={bestehend?.grund ?? ""}
                          disabled={gesperrt}
                          placeholder="Grund bei Abweichung"
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                        />
                        <button
                          type="submit"
                          disabled={gesperrt}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                        >
                          Speichern
                        </button>
                      </div>
                    </form>
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
