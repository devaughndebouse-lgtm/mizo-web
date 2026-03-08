import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const adminSecret = process.env.ADMIN_SECRET?.trim();

  // If no admin secret is configured, block access entirely
  if (!adminSecret) {
    notFound();
  }

  // Require request header to match admin secret
  const reqHeaders = headers();
  const providedSecret = reqHeaders.get("x-admin-secret");

  if (providedSecret !== adminSecret) {
    notFound();
  }

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
    return <pre>{JSON.stringify(error, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
