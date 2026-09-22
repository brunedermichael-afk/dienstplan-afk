// Einmaliger Helfer: generiert einen Magic-Link ohne E-Mail-Versand (umgeht
// Supabases strenges Rate-Limit beim eingebauten Mailer). Nicht Teil des Produkts.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const redirectTo = process.argv[3] ?? "http://localhost:3010/auth/callback";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo },
});
if (error) throw error;

console.log(data.properties.action_link);
