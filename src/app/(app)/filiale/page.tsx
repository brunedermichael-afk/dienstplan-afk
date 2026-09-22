import { getCurrentUserAndProfile } from "@/lib/auth";

export default async function FilialePage() {
  const session = await getCurrentUserAndProfile();
  const profile = session?.profile;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">
        Filial-Übersicht
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>Eingeloggt als {profile?.name ?? "…"}</p>
        <p className="mt-1 text-slate-400">
          Rolle: {profile?.role ?? "wird geladen"}
        </p>
        <p className="mt-3 text-slate-400">
          Der Dienstplan (Mo–Sa, wer wann in welcher Abteilung) folgt in
          Schritt 3.
        </p>
      </div>
    </div>
  );
}
