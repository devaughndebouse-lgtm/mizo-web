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
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(id);
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
  if (!supabase) return { mode: "disabled" as const };

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) return { mode: "error" as const, error: listErr.message };

  const existing = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (existing) return { mode: "existing" as const, userId: existing.id };

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return { mode: "error" as const, error: createErr?.message ?? "Failed to create user" };
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app`;
  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (inviteErr) {
    return {
      mode: "created" as const,
      userId: created.user.id,
      inviteWarning: inviteErr.message,
    };
  }

  return { mode: "created" as const, userId: created.user.id, invited: true };
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) return jsonError("Missing STRIPE_SECRET_KEY", 500);

    const sessionIdRaw = req.nextUrl.searchParams.get("session_id")?.trim();
    if (!sessionIdRaw) return jsonError("Missing session_id");
    if (!isLikelyCheckoutSessionId(sessionIdRaw)) return jsonError("Invalid session_id", 400);

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

    if (!paymentOk && !subOk) return jsonError("Payment not completed", 402);

    const emailFromCheckout = session.customer_details?.email?.trim();
    const customerExpanded = session.customer as Stripe.Customer | string | null;
    const emailFromCustomer =
      typeof customerExpanded === "object" && customerExpanded?.email
        ? customerExpanded.email.trim()
        : null;

    const email = emailFromCheckout || emailFromCustomer || null;

    const responseBody: Record<string, unknown> = {
      ok: true,
      access: true,
      email,
    };

    if (email) {
      const ensured = await ensureSupabaseUser(email);

      const stripeCustomerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      const stripeSubscriptionId =
        typeof subscription === "object" && subscription ? subscription.id : null;
      const subscriptionStatus =
        typeof subscription === "object" && subscription ? subscription.status : null;

      const supabase = getSupabaseAdmin();
      if (supabase && ensured.mode !== "disabled") {
        if (ensured.mode === "created" || ensured.mode === "existing") {
          await supabase.from("mizo_users").upsert(
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

      if (ensured.mode === "created") {
        responseBody.accountCreated = true;
        responseBody.accessEmailSent = ensured.invited === true;
        if ("inviteWarning" in ensured && ensured.inviteWarning) {
          responseBody.provisioningWarning = ensured.inviteWarning;
        }
      }
      if (ensured.mode === "error") responseBody.provisioningWarning = ensured.error;
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
