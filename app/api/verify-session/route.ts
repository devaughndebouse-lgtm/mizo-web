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
  return /^cs_(test|live)_[A-Za-z0-9_]+$/.test(id);
}

function getJourneymanPriceId() {
  return (
    process.env.STRIPE_JOURNEYMAN_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_JOURNEYMAN_PRICE_ID
  )?.trim() ?? null;
}

function getMasterPriceId() {
  return (
    process.env.STRIPE_MASTER_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID
  )?.trim() ?? null;
}

function getTrackFromPriceId(priceId: string | null) {
  if (!priceId) return null;
  if (priceId === getJourneymanPriceId()) return "journeyman";
  if (priceId === getMasterPriceId()) return "master";
  return null;
}

async function getCheckoutSessionTrack(
  stripe: Stripe,
  sessionId: string
): Promise<"journeyman" | "master" | null> {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 10,
  });

  for (const item of lineItems.data) {
    const priceId =
      typeof item.price === "string" ? item.price : item.price?.id ?? null;
    const track = getTrackFromPriceId(priceId);
    if (track) return track;
  }

  return null;
}

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function updateAccessFromCheckout(args: {
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  track: "journeyman" | "master" | null;
}) {
  if (!args.email) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: list } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  const existingUser = list?.users.find(
    (user) => (user.email ?? "").toLowerCase() === args.email?.toLowerCase()
  );

  if (existingUser && args.track) {
    await supabase.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        last_purchased_track: args.track,
      },
    });
  }

  await supabase.from("mizo_users").upsert(
    {
      email: args.email,
      supabase_user_id: existingUser?.id ?? null,
      stripe_customer_id:
        typeof args.stripeCustomerId === "string" ? args.stripeCustomerId : null,
      stripe_subscription_id: args.stripeSubscriptionId,
      subscription_status: args.subscriptionStatus,
      access_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) return jsonError("Missing STRIPE_SECRET_KEY", 500);

    const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
    if (!sessionId) return jsonError("Missing session_id");
    if (!isLikelyCheckoutSessionId(sessionId)) return jsonError("Invalid session_id", 400);

    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    const paymentOk =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    const subscription = session.subscription as Stripe.Subscription | null;

    const subOk =
      !!subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    if (!paymentOk && !subOk) {
      return jsonError("Payment not completed", 402);
    }
    const track = await getCheckoutSessionTrack(stripe, sessionId);

    const email =
      session.customer_details?.email ??
      (typeof session.customer_email === "string" ? session.customer_email : null);
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const stripeSubscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    await updateAccessFromCheckout({
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: subscription?.status ?? null,
      track,
    });

    const res = NextResponse.json(
      {
        ok: true,
        access: true,
        verified: true,
        email,
        track,
      },
      { status: 200 }
    );

    // Cookie used by `proxy.ts` to gate /app routes.
    res.cookies.set({
      name: "mizo_access",
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd(),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    if (track) {
      res.cookies.set({
        name: "mizo_track",
        value: track,
        httpOnly: true,
        sameSite: "lax",
        secure: isProd(),
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : null;
    return jsonError(message ?? "Failed to verify session", 500);
  }
}
