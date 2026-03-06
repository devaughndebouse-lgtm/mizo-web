import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <pre>
        Missing server Supabase env vars. Set SUPABASE_URL and
        SUPABASE_SERVICE_ROLE_KEY.
      </pre>
    );
  }

  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    return (
      <pre>
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  return (
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
