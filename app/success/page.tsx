"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerifyResponse = {
  ok?: boolean;
  access?: boolean;
  email?: string | null;
  error?: string;
  message?: string;
};

function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("Verifying your payment...");
  const [detail, setDetail] = useState(
    "Please wait while we confirm your Stripe checkout and finish account setup."
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setHasError(true);
      setStatus("Missing checkout session");
      setDetail(
        "We could not find the Stripe session ID in the success URL. Please return to the homepage and try checkout again."
      );
      return;
    }

    const verifiedSessionId = sessionId;
    let cancelled = false;

    async function verifyCheckout() {
      try {
        const res = await fetch(
          `/api/verify-session?session_id=${encodeURIComponent(verifiedSessionId)}`,
          { cache: "no-store", credentials: "include" }
        );

        const data: VerifyResponse = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access) {
          throw new Error(data?.error ?? data?.message ?? "Failed to verify checkout");
        }

        if (cancelled) return;

        setStatus("Access unlocked");
        setDetail("Redirecting you to login…");

        const email = typeof data.email === "string" ? data.email : null;

        window.setTimeout(() => {
          if (email) {
            router.replace(`/login?email=${encodeURIComponent(email)}`);
            return;
          }
          router.replace("/login");
        }, 900);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : null;
        setHasError(true);
        setStatus("Could not unlock access");
        setDetail(message ?? "Verification error");
      }
    }

    verifyCheckout();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.16),_transparent_28%),linear-gradient(180deg,_#0b0b0c_0%,_#111214_55%,_#0a0a0b_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
          Mizo Mastery
        </div>

        <h1 className="mt-4 text-3xl font-extrabold">
          {hasError ? "Setup needs attention" : "Finishing your access"}
        </h1>

        <p className="mt-6 text-xl font-semibold text-white">{status}</p>
        <p className="mt-4 text-sm leading-7 text-white/75">{detail}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Back to homepage
          </button>

          <button type="button" onClick={() => router.replace("/login")} className="mizo-btn">
            Go to login
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
