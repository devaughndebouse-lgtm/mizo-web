import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

function isLikelyCheckoutSessionId(id: string) {
  // Stripe Checkout Session IDs are typically like: cs_test_..., cs_live_...
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(id);
}

function generateTempPassword() {
  // 12 chars, url-safe-ish
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function ensureSupabaseUser(email: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { mode: "disabled" as const };
  }

  // 1) Try to find user by email
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    return { mode: "error" as const, error: listErr.message };
  }

  const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  if (existing) {
    return { mode: "existing" as const, userId: existing.id };
  }

  // 2) Create user with temp password (Supabase stores hashed passwords)
  const tempPassword = generateTempPassword();
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return { mode: "error" as const, error: createErr?.message ?? "Failed to create user" };
  }

  return { mode: "created" as const, userId: created.user.id, tempPassword };
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) return jsonError("Missing STRIPE_SECRET_KEY", 500);

    const sessionIdRaw = req.nextUrl.searchParams.get("session_id")?.trim();
    if (!sessionIdRaw) return jsonError("Missing session_id");

    if (!isLikelyCheckoutSessionId(sessionIdRaw)) {
      return jsonError("Invalid session_id", 400);
    }

    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.retrieve(sessionIdRaw, {
      expand: ["subscription", "customer"],
    });

    const paymentOk =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    const subscription = session.subscription as Stripe.Subscription | null;
    const subOk =
      !!subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    const accessGranted = paymentOk || subOk;
    if (!accessGranted) {
      return jsonError("Payment not completed", 402);
    }

    // Pull email from checkout/session
    const emailFromCheckout = session.customer_details?.email?.trim();
    const customerExpanded = session.customer as Stripe.Customer | string | null;
    const emailFromCustomer =
      typeof customerExpanded === "object" && customerExpanded?.email
        ? customerExpanded.email.trim()
        : null;

    const email = emailFromCheckout || emailFromCustomer || null;

    const responseBody: Record<string, unknown> = { ok: true, access: true, email };

    // If we have an email + Supabase configured, create/link a real user.
    if (email) {
      const ensured = await ensureSupabaseUser(email);

      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const stripeSubscriptionId = typeof subscription === "object" && subscription ? subscription.id : null;
      const subscriptionStatus = typeof subscription === "object" && subscription ? subscription.status : null;

      // Upsert into Postgres table (best-effort; app still works if table is missing)
      const supabase = getSupabaseAdmin();
      if (supabase && ensured.mode !== "disabled") {
        if (ensured.mode === "created" || ensured.mode === "existing") {
          await supabase
            .from("mizo_users")
            .upsert(
              {
                email,
                supabase_user_id: ensured.userId,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
                subscription_status: subscriptionStatus,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "email" }
            );
        }
      }

      // Return temp password only when we just created the user.
      if (ensured.mode === "created") {
        responseBody.tempPassword = ensured.tempPassword;
      }

      if (ensured.mode === "existing") {
        // nothing extra to add
      }

      if (ensured.mode === "error") {
        // Don't block access due to user provisioning errors—log-like response for debugging.
        responseBody.provisioningWarning = ensured.error;
      }
    }

    const res = NextResponse.json(responseBody, { status: 200 });
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
    return jsonError(message ?? "Failed to verify session", 500);
  }
}
