import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(secret);
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

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000").replace(/\/$/, "");
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function ensureSupabaseUserAndInvite(email: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { mode: "disabled" as const };

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listErr) {
    return { mode: "error" as const, error: listErr.message };
  }

  const existing = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
  );

  const redirectTo = `${getAppUrl()}/login`;

  if (existing) {
    return { mode: "existing" as const, userId: existing.id, invited: false };
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      source: "stripe_checkout",
    },
  });

  if (createErr || !created.user) {
    return { mode: "error" as const, error: createErr?.message ?? "Failed to create user" };
  }

  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (inviteErr) {
    return {
      mode: "created" as const,
      userId: created.user.id,
      inviteWarning: inviteErr.message,
    };
  }

  return { mode: "created" as const, userId: created.user.id, invited: true };
}

async function upsertMizoUser(args: {
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  accessActive: boolean;
  supabaseUserId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("mizo_users").upsert(
    {
      email: args.email,
      supabase_user_id: args.supabaseUserId ?? null,
      stripe_customer_id: args.stripeCustomerId,
      stripe_subscription_id: args.stripeSubscriptionId,
      subscription_status: args.subscriptionStatus,
      access_active: args.accessActive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}

async function updateAccessByCustomerId(args: {
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus: string | null;
  accessActive: boolean;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from("mizo_users")
    .update({
      stripe_subscription_id: args.stripeSubscriptionId ?? null,
      subscription_status: args.subscriptionStatus,
      access_active: args.accessActive,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", args.stripeCustomerId);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscriptionValue = (
    invoice as Stripe.Invoice & {
      subscription?: string | { id?: string | null } | null;
    }
  ).subscription;

  if (typeof subscriptionValue === "string") {
    return subscriptionValue;
  }

  if (
    subscriptionValue &&
    typeof subscriptionValue === "object" &&
    typeof subscriptionValue.id === "string"
  ) {
    return subscriptionValue.id;
  }

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

async function getSubscriptionTrack(
  stripe: Stripe,
  subscriptionId: string
): Promise<"journeyman" | "master" | null> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  for (const item of subscription.items.data) {
    const priceId =
      typeof item.price === "string" ? item.price : item.price?.id ?? null;
    const track = getTrackFromPriceId(priceId);
    if (track) return track;
  }

  return null;
}

async function setSupabaseUserTrackByEmail(args: {
  email: string;
  track: "journeyman" | "master" | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !args.track) return;

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listErr) {
    console.error("Failed to list Supabase users for track update:", listErr.message);
    return;
  }

  const existing = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === args.email.toLowerCase()
  );

  if (!existing) return;

  const { error: updateErr } = await supabase.auth.admin.updateUserById(
    existing.id,
    {
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        last_purchased_track: args.track,
      },
    }
  );

  if (updateErr) {
    console.error("Failed to update Supabase user track:", updateErr.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      return NextResponse.json(
        { ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { ok: false, error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid webhook signature";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    console.log("Stripe webhook received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const email =
        session.customer_details?.email?.trim() ||
        (typeof session.customer_email === "string" ? session.customer_email.trim() : null);

      const stripeCustomerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

      const stripeSubscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

      if (email) {
        const sessionTrack = await getCheckoutSessionTrack(stripe, session.id);
        const ensured = await ensureSupabaseUserAndInvite(email);

        await upsertMizoUser({
          email,
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: "active",
          accessActive: true,
          supabaseUserId:
            ensured.mode === "created" || ensured.mode === "existing"
              ? ensured.userId
              : null,
        });

        await setSupabaseUserTrackByEmail({
          email,
          track: sessionTrack,
        });

        if (sessionTrack) {
          console.log(`Checkout completed for ${email} on ${sessionTrack} track`);
        }
        if (ensured.mode === "error") {
          console.error("Supabase provisioning error:", ensured.error);
        }

        if (ensured.mode === "created" && "inviteWarning" in ensured && ensured.inviteWarning) {
          console.error("Supabase invite warning:", ensured.inviteWarning);
        }

        if (ensured.mode === "created") {
          console.log(`Supabase invite sent to ${email}`);
        }

        if (ensured.mode === "existing") {
          console.log(`Supabase user already exists for ${email}`);
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null;

      const stripeSubscriptionId = subscription.id;
      const subscriptionTrack = await getSubscriptionTrack(stripe, subscription.id);

      if (stripeCustomerId) {
        await updateAccessByCustomerId({
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: subscription.status,
          accessActive:
            subscription.status === "active" || subscription.status === "trialing",
        });

        if (subscriptionTrack) {
          console.log(
            `Subscription updated for ${stripeCustomerId} on ${subscriptionTrack} track`
          );
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null;

      const stripeSubscriptionId = subscription.id;
      const subscriptionTrack = await getSubscriptionTrack(stripe, subscription.id);

      if (stripeCustomerId) {
        await updateAccessByCustomerId({
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: subscription.status,
          accessActive: false,
        });

        if (subscriptionTrack) {
          console.log(
            `Subscription deleted for ${stripeCustomerId} on ${subscriptionTrack} track`
          );
        }
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

      if (stripeCustomerId) {
        await updateAccessByCustomerId({
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: "active",
          accessActive: true,
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

      if (stripeCustomerId) {
        await updateAccessByCustomerId({
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: "past_due",
          accessActive: false,
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}