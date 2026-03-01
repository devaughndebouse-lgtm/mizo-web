import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    const priceId = (process.env.STRIPE_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID)?.trim();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL)?.trim();

    if (!secret) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    if (!priceId)
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_ID (or NEXT_PUBLIC_STRIPE_PRICE_ID)" },
        { status: 500 }
      );
    if (!appUrl)
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL (or APP_URL)" },
        { status: 500 }
      );

    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ? `Stripe error: ${err.message}` : "Stripe error" },
      { status: 500 }
    );
  }
}