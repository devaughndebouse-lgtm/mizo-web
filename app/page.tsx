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
  const btn = "mizo-btn";

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
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus("error");
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : null;
        setError(message ?? "Verification failed");
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold text-black">
          Pass Your Journeyman Exam With Confidence.
        </h1>
        <p className="max-w-2xl text-base text-black/80">
          NEC-referenced practice. Real exam simulations. Clear step-by-step
          explanations built for working electricians.
        </p>
      </header>

      {reason === "subscribe" && (
        <div className="rounded border bg-white p-4 text-xl font-extrabold text-black">
          🔒 Simulator access is Pro-only. Subscribe to unlock.
        </div>
      )}

      {status === "verifying" && (
        <div className="rounded border bg-white p-4 text-sm font-semibold text-black">
          ✅ Payment received — unlocking access…
        </div>
      )}

      {status === "error" && (
        <div className="rounded border bg-white p-4 text-sm font-semibold text-red-700">
          Could not unlock access: {error}
        </div>
      )}

      {(success || canceled) && (
        <div className="rounded border bg-white p-4 text-sm text-black">
          {success && <div>✅ Checkout completed. Finishing unlock…</div>}
          {canceled && <div>Checkout canceled.</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button className={btn} onClick={startCheckout}>
          Subscribe – $79/mo
        </button>

        <button className={btn} onClick={() => router.push("/app")}>
          Start Training
        </button>
      </div>

      <section className="rounded-lg border bg-white p-4 shadow-sm text-black">
        <h2 className="text-lg font-semibold">Why Mizo Works</h2>
        <ul className="mt-2 list-disc pl-5 text-sm leading-7 text-black/80">
          <li>NEC-referenced questions</li>
          <li>Timed exam simulator</li>
          <li>Clear calculation explanations</li>
          <li>Built for working electricians</li>
        </ul>
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
