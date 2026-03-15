import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutSource =
  | "hero_primary"
  | "pricing_journeyman"
  | "journeyman_track"
  | "pricing_master"
  | "master_track"
  | "demo_question_secondary"
  | "guarantee_primary"
  | "pricing_primary"
  | string;

function getPriceIdForSource(source?: CheckoutSource) {
  const journeymanPriceId = (
    process.env.STRIPE_JOURNEYMAN_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_JOURNEYMAN_PRICE_ID
  )?.trim();

  const masterPriceId = (
    process.env.STRIPE_MASTER_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID
  )?.trim();

  const defaultPriceId = (
    process.env.STRIPE_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
  )?.trim();

  if (
    source === "hero_primary" ||
    source === "pricing_journeyman" ||
    source === "journeyman_track"
  ) {
    return journeymanPriceId ?? defaultPriceId;
  }

  if (source === "pricing_master" || source === "master_track") {
    return masterPriceId ?? defaultPriceId;
  }

  return defaultPriceId ?? journeymanPriceId ?? masterPriceId;
}

export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();

    let source: CheckoutSource | undefined;
    try {
      const body = (await req.json()) as { source?: CheckoutSource };
      source = body?.source;
    } catch {
      source = undefined;
    }

    const priceId = getPriceIdForSource(source);

    const appUrl =
      (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL)?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      new URL(req.url).origin;

    const normalizedAppUrl =
      appUrl.startsWith("http://") || appUrl.startsWith("https://")
        ? appUrl.replace(/\/$/, "")
        : `https://${appUrl.replace(/\/$/, "")}`;

    if (!secret) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "Missing Stripe price ID. Set STRIPE_JOURNEYMAN_PRICE_ID, STRIPE_MASTER_PRICE_ID, or STRIPE_PRICE_ID.",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${normalizedAppUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${normalizedAppUrl}/?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : null;
    return NextResponse.json(
      { error: message ? `Stripe error: ${message}` : "Stripe error" },
      { status: 500 }
    );
  }
}
