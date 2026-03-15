import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

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
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : null;
    return jsonError(message ?? "Failed to verify session", 500);
  }
}
