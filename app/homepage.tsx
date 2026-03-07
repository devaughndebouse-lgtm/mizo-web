"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LandingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const success = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id");
  const canceled = searchParams.get("canceled") === "true";
  const reason = searchParams.get("reason");

  const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!success || !sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        setStatus("verifying");
        setError(null);

        const res = await fetch(
          `/api/verify-session?session_id=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access) {
          throw new Error(data?.error ?? "Failed to verify checkout");
        }

        if (cancelled) return;
        router.replace("/app");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setError(e?.message ?? "Verification failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [success, sessionId, router]);

  async function startCheckout() {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!data?.url) {
      alert(`Stripe error: ${data?.error ?? "No checkout URL returned"}`);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-10 text-white">
      <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-1 text-sm font-semibold text-yellow-300">
            Built for electricians. Built to pass.
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-white">
            Pass Your Journeyman Exam the First Time.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
            Real NEC-style exam simulations, timed practice tests, and clear
            step-by-step explanations built for working electricians.
          </p>

          <p className="mt-4 text-base font-semibold text-yellow-300">
            Built by a 24-year electrician who knows the exam.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="mizo-btn" onClick={startCheckout}>
              Start Training — $79/month
            </button>
          </div>

          <div className="mt-4 space-y-1 text-sm text-white/70">
            <div>Cancel anytime.</div>
            <div>✔ 30-Day Confidence Guarantee</div>
            <div>✔ Get an additional month free if you’re not satisfied</div>
          </div>

          {reason === "subscribe" && (
            <div className="mt-6 rounded-lg border border-yellow-300/30 bg-white p-4 text-lg font-extrabold text-black">
              🔒 Simulator access is Pro-only. Start training to unlock.
            </div>
          )}

          {status === "verifying" && (
            <div className="mt-6 rounded-lg border bg-white p-4 text-sm font-semibold text-black">
              ✅ Payment received — unlocking access…
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 rounded-lg border bg-white p-4 text-sm font-semibold text-red-700">
              Could not unlock access: {error}
            </div>
          )}

          {(success || canceled) && (
            <div className="mt-6 rounded-lg border bg-white p-4 text-sm text-black">
              {success && <div>✅ Checkout completed. Finishing unlock…</div>}
              {canceled && <div>Checkout canceled.</div>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="text-sm font-semibold uppercase tracking-wide text-yellow-300">
            Why electricians choose Mizo
          </div>
          <ul className="mt-5 space-y-4 text-base text-white/85">
            <li>✔ NEC-referenced questions</li>
            <li>✔ Timed exam simulator</li>
            <li>✔ Clear calculation walkthroughs</li>
            <li>✔ Built by an experienced electrician</li>
            <li>✔ Texas first, nationwide next</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-black/60">
            1
          </div>
          <h2 className="mt-2 text-xl font-bold">Practice real questions</h2>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Train with exam-style questions that build code navigation,
            confidence, and speed.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-black/60">
            2
          </div>
          <h2 className="mt-2 text-xl font-bold">Take timed simulations</h2>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Stop guessing how ready you are. Practice under real pressure before
            exam day.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-black/60">
            3
          </div>
          <h2 className="mt-2 text-xl font-bold">Walk in prepared</h2>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Build the pace and confidence needed to pass the Journeyman exam the
            first time.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white p-8 text-black shadow-sm">
        <h2 className="text-2xl font-extrabold">
          Why this works better than studying alone
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-lg font-bold">Most people fail because they:</div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-black/80">
              <li>• Memorize answers instead of learning the code book</li>
              <li>• Never practice under time pressure</li>
              <li>• Don’t simulate the real testing environment</li>
            </ul>
          </div>
          <div>
            <div className="text-lg font-bold">Mizo fixes that by giving you:</div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-black/80">
              <li>• Structured practice</li>
              <li>• Exam-speed repetition</li>
              <li>• Step-by-step explanations that actually teach</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-8 text-center">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">
          30-Day Confidence Guarantee
        </div>
        <h2 className="mt-3 text-3xl font-extrabold text-white">
          Get an Additional Month Free if You’re Not Satisfied
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/80">
          If after your first month you don’t feel significantly more prepared
          for the Journeyman exam, we’ll give you an additional month free.
          Train with confidence and build the speed you need to pass.
        </p>

        <div className="mt-6">
          <button className="mizo-btn" onClick={startCheckout}>
            Start Training
          </button>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingInner />
    </Suspense>
  );
}