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

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) return jsonError("Missing STRIPE_SECRET_KEY", 500);

    const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
    if (!sessionId) return jsonError("Missing session_id");

    const stripe = new Stripe(secret, {
      apiVersion: "2022-11-15",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const subscription: any = (session as any).subscription;
    const paid = session.payment_status === "paid";
    const subOk =
      !!subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    if (!paid && !subOk) {
      return jsonError("Payment not completed", 402);
    }

    const res = NextResponse.json({ ok: true, access: true });

    res.cookies.set({
      name: "mizo_access",
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd(),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err: any) {
    return jsonError(err?.message || "Failed to verify session", 500);
  }
}
