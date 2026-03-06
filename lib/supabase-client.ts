import { createClient } from "@supabase/supabase-js";

let cached:
  | ReturnType<typeof createClient>
  | null
  | undefined;

export function getSupabaseClient() {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, anonKey);
  return cached;
}
