import { createClient } from "@supabase/supabase-js";

let cached:
  | ReturnType<typeof createClient>
  | null
  | undefined;

export function getSupabaseAdmin() {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRole) {
    cached = null;
    return null;
  }

  cached = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
