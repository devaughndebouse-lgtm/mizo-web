import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return jsonError("Missing STRIPE_SECRET_KEY", 500);

  const stripe = new Stripe(secretKey);

  const url = new URL(req.url);
  const sessionId =
    url.searchParams.get("session_id") || url.searchParams.get("sessionId");

  if (!sessionId) return jsonError("Missing session_id");

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    let subscriptionStatus: string | null = null;
    let isActive = false;

    if (session.mode === "subscription" && session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      subscriptionStatus = subscription.status;

      if (subscription.status === "active" || subscription.status === "trialing") {
        isActive = true;
      }
    }

    const paymentComplete =
      session.payment_status === "paid" || isActive;

    const res = NextResponse.json({
      ok: true,
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      mode: session.mode,
      subscription: session.subscription,
      subscription_status: subscriptionStatus,
      customer: session.customer,
      access: paymentComplete,
    });

    // If paid (or active/trialing subscription), set an httpOnly cookie we can use to gate the app.
    if (paymentComplete) {
      res.cookies.set({
        name: "mizo_access",
        value: "1",
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return res;
  } catch (err: any) {
    return jsonError(err?.message ?? "Failed to verify session", 500);
  }
}