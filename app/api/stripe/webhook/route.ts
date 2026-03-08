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

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app`;

  if (existing) {
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    if (inviteErr) {
      return {
        mode: "existing" as const,
        userId: existing.id,
        inviteWarning: inviteErr.message,
      };
    }

    return { mode: "existing" as const, userId: existing.id, invited: true };
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
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

        if (ensured.mode === "error") {
          console.error("Supabase provisioning error:", ensured.error);
        }

        if (
          (ensured.mode === "created" || ensured.mode === "existing") &&
          "inviteWarning" in ensured &&
          ensured.inviteWarning
        ) {
          console.error("Supabase invite warning:", ensured.inviteWarning);
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null;

      if (stripeCustomerId) {
        await updateAccessByCustomerId({
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          accessActive:
            subscription.status === "active" || subscription.status === "trialing",
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null;

      if (stripeCustomerId) {
        await updateAccessByCustomerId({
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          accessActive: false,
        });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;

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

      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;

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