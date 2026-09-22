import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import {
  berechneZyklusWoche,
  getAlleAktivenProfile,
  getDienstplanSettings,
  getPlanSlotsForWeekAdmin,
  type AdminSlot,
} from "@/lib/dienstplan";
import { ABTEILUNG_LABEL, WOCHENTAGE } from "@/lib/constants";
import type { SlotAbteilungTyp } from "@/lib/supabase/types";
import { createSlot, deleteSlot, updateSettings, updateSlot } from "./actions";

const ABTEILUNG_OPTIONEN = Object.keys(ABTEILUNG_LABEL) as SlotAbteilungTyp[];

function groupByTag(slots: AdminSlot[]) {
  const byTag = new Map<number, { vm: AdminSlot[]; nm: AdminSlot[] }>();
  for (let tag = 0; tag < 6; tag++) byTag.set(tag, { vm: [], nm: [] });
  for (const slot of slots) {
    byTag.get(slot.wochentag)?.[slot.halbtag].push(slot);
  }
  return byTag;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ variante?: string; woche?: string }>;
}) {
  const session = await getCurrentUserAndProfile();
  if (!session?.profile || session.profile.role !== "admin") {
    redirect("/filiale");
  }

  const { variante: varianteParam, woche } = await searchParams;
  const settings = await getDienstplanSettings();
  const aktuelleWoche = berechneZyklusWoche(settings.zyklus_start);
  const variante = varianteParam === "B" ? "B" : varianteParam === "A" ? "A" : settings.aktive_variante;
  const zyklusWoche = Math.min(4, Math.max(1, Number(woche) || aktuelleWoche));

  const [profile, slots] = await Promise.all([
    getAlleAktivenProfile(),
    getPlanSlotsForWeekAdmin(variante, zyklusWoche),
  ]);
  const byTag = groupByTag(slots);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Plan bearbeiten</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Einstellungen
        </h2>
        <form action={updateSettings} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Zyklus-Start (Montag von Woche 1)
            </label>
            <input
              type="date"
              name="zyklus_start"
              defaultValue={settings.zyklus_start}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Aktive Variante (was Mitarbeiter:innen sehen)
            </label>
            <div className="flex gap-2">
              {(["A", "B"] as const).map((v) => (
                <label
                  key={v}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="aktive_variante"
                    value={v}
                    defaultChecked={settings.aktive_variante === v}
                    className="sr-only"
                  />
                  Variante {v}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Speichern
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex gap-2">
          {(["A", "B"] as const).map((v) => (
            <Link
              key={v}
              href={`/admin?variante=${v}&woche=${zyklusWoche}`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium ${
                v === variante
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Variante {v} bearbeiten
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((w) => (
            <Link
              key={w}
              href={`/admin?variante=${variante}&woche=${w}`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium ${
                w === zyklusWoche
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Woche {w}
            </Link>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        {WOCHENTAGE.map((label, tag) => {
          const tagSlots = byTag.get(tag)!;
          return (
            <div key={tag} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                {label}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <HalbtagBearbeiten
                  titel="Vormittag"
                  halbtag="vm"
                  slots={tagSlots.vm}
                  profile={profile}
                  variante={variante}
                  zyklusWoche={zyklusWoche}
                  wochentag={tag}
                />
                <HalbtagBearbeiten
                  titel="Nachmittag"
                  halbtag="nm"
                  slots={tagSlots.nm}
                  profile={profile}
                  variante={variante}
                  zyklusWoche={zyklusWoche}
                  wochentag={tag}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HalbtagBearbeiten({
  titel,
  halbtag,
  slots,
  profile,
  variante,
  zyklusWoche,
  wochentag,
}: {
  titel: string;
  halbtag: "vm" | "nm";
  slots: AdminSlot[];
  profile: Awaited<ReturnType<typeof getAlleAktivenProfile>>;
  variante: "A" | "B";
  zyklusWoche: number;
  wochentag: number;
}) {
  const zugewieseneIds = new Set(slots.map((s) => s.profile.id));
  const verfuegbar = profile.filter((p) => !zugewieseneIds.has(p.id));

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {titel}
      </p>
      <ul className="space-y-2">
        {slots.map((slot) => (
          <li key={slot.id} className="rounded-lg border border-slate-200 p-2">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                <span className="text-sm text-slate-700">
                  {slot.profile.name}
                  {slot.profile.abteilung === "flex" ? " (flex)" : ""}
                </span>
                <span className="text-xs text-slate-400">
                  {ABTEILUNG_LABEL[slot.abteilung_an_diesem_slot]} ·{" "}
                  {slot.stunden} Std.
                </span>
              </summary>
              <form
                action={updateSlot}
                className="mt-2 space-y-2 border-t border-slate-100 pt-2"
              >
                <input type="hidden" name="id" value={slot.id} />
                <select
                  name="abteilung_an_diesem_slot"
                  defaultValue={slot.abteilung_an_diesem_slot}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {ABTEILUNG_OPTIONEN.map((a) => (
                    <option key={a} value={a}>
                      {ABTEILUNG_LABEL[a]}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="stunden"
                    step="0.5"
                    min="0.5"
                    defaultValue={slot.stunden}
                    required
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="Stunden"
                  />
                  <input
                    type="number"
                    name="pause_min"
                    step="5"
                    min="0"
                    defaultValue={slot.pause_min}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    placeholder="Pause (Min.)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Speichern
                  </button>
                </div>
              </form>
              <form action={deleteSlot} className="mt-2">
                <input type="hidden" name="id" value={slot.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                >
                  Entfernen
                </button>
              </form>
            </details>
          </li>
        ))}
      </ul>

      {verfuegbar.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 underline underline-offset-2">
            + Hinzufügen
          </summary>
          <form
            action={createSlot}
            className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2"
          >
            <input type="hidden" name="variante" value={variante} />
            <input type="hidden" name="zyklus_woche" value={zyklusWoche} />
            <input type="hidden" name="wochentag" value={wochentag} />
            <input type="hidden" name="halbtag" value={halbtag} />
            <select
              name="profile_id"
              required
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {verfuegbar.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.abteilung === "flex" ? " (flex)" : ""}
                </option>
              ))}
            </select>
            <select
              name="abteilung_an_diesem_slot"
              required
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {ABTEILUNG_OPTIONEN.map((a) => (
                <option key={a} value={a}>
                  {ABTEILUNG_LABEL[a]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                name="stunden"
                step="0.5"
                min="0.5"
                defaultValue={4}
                required
                className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Stunden"
              />
              <input
                type="number"
                name="pause_min"
                step="5"
                min="0"
                defaultValue={0}
                className="w-1/2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Pause (Min.)"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              Slot anlegen
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
