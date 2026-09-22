"use server";

import { redirect } from "next/navigation";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Nur fuer die lokale Entwicklung: loggt ohne Magic-Link-Mail direkt als
// Test-Account ein (umgeht Supabases strenges E-Mail-Rate-Limit beim Testen).
// Auf Vercel/Production nicht sichtbar (Button ist im UI per NODE_ENV
// ausgeblendet) und hier zusaetzlich hart blockiert.
const DEV_EMAILS: Record<"admin" | "employee", string> = {
  admin: "michael@sportmayer-dienstplan.local",
  employee: "babsi@sportmayer-dienstplan.local",
};

export async function devLogin(rolle: "admin" | "employee") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev-Login ist in Production deaktiviert.");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local.");
  }

  const admin = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEV_EMAILS[rolle],
  });
  if (error) throw new Error(error.message);

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw new Error(verifyError.message);

  redirect("/filiale");
}
