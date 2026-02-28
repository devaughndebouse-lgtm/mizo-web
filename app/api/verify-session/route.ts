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
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      ok: true,
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      mode: session.mode,
      subscription: session.subscription,
      customer: session.customer,
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "Failed to verify session", 500);
  }
}