import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get("session_id");

  if (!session_id) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session.subscription || typeof session.subscription !== "string") {
      return NextResponse.json(
        { error: "No subscription found on session" },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: `Subscription not active (${subscription.status})` },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set("mizo_sub", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    console.error("Verify session error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
