import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isLikelyCheckoutSessionId(id: string) {
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(id);
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

    return NextResponse.json({
      ok: true,
      verified: true,
      email:
        session.customer_details?.email ??
        (typeof session.customer_email === "string" ? session.customer_email : null),
      message: "Checkout verified. Final account activation is handled by webhook.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to verify session";
    return jsonError(message, 500);
  }
}