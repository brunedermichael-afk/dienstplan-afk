import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

export async function getCurrentUserAndProfile(): Promise<{
  userId: string;
  email: string | undefined;
  profile: ProfileRow | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, email: user.email, profile: profile ?? null };
}
