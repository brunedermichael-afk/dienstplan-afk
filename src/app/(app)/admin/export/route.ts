import { NextResponse } from "next/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csvZelle(wert: string | number) {
  const text = String(wert);
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  const session = await getCurrentUserAndProfile();
  if (!session?.profile || session.profile.role !== "admin") {
    return NextResponse.json({ error: "Nur fuer Admins." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const jahr = Number(searchParams.get("jahr"));
  const monat = Number(searchParams.get("monat"));
  if (!jahr || !monat) {
    return NextResponse.json({ error: "jahr und monat erforderlich." }, { status: 400 });
  }

  const von = `${jahr}-${String(monat).padStart(2, "0")}-01`;
  const bisDatum = new Date(Date.UTC(jahr, monat, 0));
  const bis = bisDatum.toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zeit_eintraege")
    .select(
      "datum, geplante_stunden, ist_stunden, grund, profile:profiles!zeit_eintraege_profile_id_fkey(name)"
    )
    .gte("datum", von)
    .lte("datum", bis)
    .order("datum");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const zeilen = (
    data as unknown as {
      datum: string;
      geplante_stunden: number;
      ist_stunden: number;
      grund: string | null;
      profile: { name: string };
    }[]
  ) ?? [];

  const header = ["Name", "Datum", "Geplante Stunden", "Ist Stunden", "Grund"];
  const csv = [
    header.join(";"),
    ...zeilen.map((z) =>
      [
        csvZelle(z.profile.name),
        csvZelle(z.datum),
        csvZelle(z.geplante_stunden),
        csvZelle(z.ist_stunden),
        csvZelle(z.grund ?? ""),
      ].join(";")
    ),
  ].join("\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zeiterfassung_${jahr}-${String(monat).padStart(2, "0")}.csv"`,
    },
  });
}
