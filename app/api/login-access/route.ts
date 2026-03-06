import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function POST(req: Request) {
  try {
    const { access_token } = await req.json().catch(() => ({}));

    if (!access_token || typeof access_token !== "string") {
      return NextResponse.json({ ok: false, error: "Missing access_token" }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: "Supabase server keys not configured" }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify token -> get user
    const { data: userData, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !userData.user?.email) {
      return NextResponse.json({ ok: false, error: "Invalid login token" }, { status: 401 });
    }

    const email = userData.user.email;

    // Check paid status in your Postgres table
    const { data: row, error: rowErr } = await supabase
      .from("mizo_users")
      .select("subscription_status")
      .eq("email", email)
      .maybeSingle();

    if (rowErr) {
      return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
    }

    const status = row?.subscription_status ?? null;
    const okPaid = status === "active" || status === "trialing";

    if (!okPaid) {
      return NextResponse.json(
        { ok: false, error: "No active subscription found for this email" },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true, email }, { status: 200 });
    res.cookies.set({
      name: "mizo_access",
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd(),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : null;
    return NextResponse.json(
      { ok: false, error: message ?? "Server error" },
      { status: 500 }
    );
  }
}
