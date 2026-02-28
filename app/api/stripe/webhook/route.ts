import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey)
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });

  if (!webhookSecret)
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

 const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
}

const stripe = new Stripe(secretKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const payload = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message ?? err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("✅ Webhook received:", event.type);

  return NextResponse.json({ received: true });
}
