import Link from "next/link";
import {
  berechneZyklusWoche,
  getDienstplanSettings,
  getPlanSlotsForWeek,
  type FilialeSlot,
} from "@/lib/dienstplan";
import { ABTEILUNG_BADGE_CLASS, ABTEILUNG_LABEL, WOCHENTAGE } from "@/lib/constants";

function groupByTag(slots: FilialeSlot[]) {
  const byTag = new Map<number, { vm: FilialeSlot[]; nm: FilialeSlot[] }>();
  for (let tag = 0; tag < 6; tag++) {
    byTag.set(tag, { vm: [], nm: [] });
  }
  for (const slot of slots) {
    byTag.get(slot.wochentag)?.[slot.halbtag].push(slot);
  }
  return byTag;
}

export default async function FilialePage({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string }>;
}) {
  const { woche } = await searchParams;
  const settings = await getDienstplanSettings();
  const aktuelleWoche = berechneZyklusWoche(settings.zyklus_start);
  const gewaehlteWoche = Math.min(
    4,
    Math.max(1, Number(woche) || aktuelleWoche)
  );

  const slots = await getPlanSlotsForWeek(
    settings.aktive_variante,
    gewaehlteWoche
  );
  const byTag = groupByTag(slots);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Filial-Übersicht
        </h1>
        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
          Variante {settings.aktive_variante}
        </span>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((w) => (
          <Link
            key={w}
            href={`/filiale?woche=${w}`}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium ${
              w === gewaehlteWoche
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Woche {w}
            {w === aktuelleWoche ? " •" : ""}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {WOCHENTAGE.map((label, tag) => {
          const tagSlots = byTag.get(tag)!;
          if (tagSlots.vm.length === 0 && tagSlots.nm.length === 0) {
            return null;
          }
          return (
            <div
              key={tag}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                {label}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <HalbtagListe titel="Vormittag" slots={tagSlots.vm} />
                <HalbtagListe titel="Nachmittag" slots={tagSlots.nm} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HalbtagListe({
  titel,
  slots,
}: {
  titel: string;
  slots: FilialeSlot[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {titel}
      </p>
      {slots.length === 0 ? (
        <p className="text-sm text-slate-300">–</p>
      ) : (
        <ul className="space-y-1.5">
          {slots.map((slot, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700">
                {slot.profile.name}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  ABTEILUNG_BADGE_CLASS[slot.abteilung_an_diesem_slot]
                }`}
              >
                {ABTEILUNG_LABEL[slot.abteilung_an_diesem_slot]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
