"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const sessionId = searchParams.get("session_id");
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (!success || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        setVerifying(true);
        setError(null);

        const res = await fetch(
          `/api/verify-session?session_id=${encodeURIComponent(sessionId)}`,
          { method: "GET", credentials: "include" }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access) {
          throw new Error(data?.error ?? "Failed to verify checkout");
        }

        if (cancelled) return;
        router.replace("/app");
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : null;
        setError(message ?? "Verification failed");
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [success, sessionId, router]);

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Checkout error", data);
        alert(data?.error || "Checkout failed");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("No checkout URL returned");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "60px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "52px", fontWeight: 800 }}>
        Pass Your Journeyman Exam With Confidence.
      </h1>

      <p style={{ fontSize: "20px", marginTop: "20px", maxWidth: "720px" }}>
        NEC-referenced practice. Real exam simulations. Clear step-by-step
        explanations built for working electricians.
      </p>

      {reason === "subscribe" && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: "#fff",
            fontWeight: 700,
            fontSize: "20px",
            color: "#000",
          }}
        >
          🔒 Simulator access is Pro-only. Subscribe to unlock.
        </div>
      )}

      {verifying && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: "#fff",
            fontWeight: 700,
          }}
        >
          ✅ Payment received — unlocking access…
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #ffd6d6",
            background: "#fff5f5",
            color: "#b00020",
            fontWeight: 700,
          }}
        >
          Could not unlock access: {error}
        </div>
      )}

      {(success || canceled) && !verifying && !error && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: "#fff",
            fontWeight: 600,
          }}
        >
          {success && "✅ Checkout completed. Finishing unlock…"}
          {canceled && "Checkout canceled."}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={startCheckout}
          disabled={loading || verifying}
          style={{
            marginTop: "30px",
            background: "#FFD700",
            color: "#000",
            fontWeight: 800,
            padding: "14px 20px",
            borderRadius: "10px",
            border: "none",
            cursor: loading || verifying ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Opening Checkout..." : "Start Training — $79/month"}
        </button>

        <button
          onClick={() => router.push("/app")}
          disabled={verifying}
          style={{
            marginTop: "30px",
            background: "#FFD700",
            color: "#000",
            fontWeight: 800,
            padding: "14px 20px",
            borderRadius: "10px",
            border: "1px solid #000",
            cursor: verifying ? "not-allowed" : "pointer",
          }}
        >
          Go to Simulator
        </button>
      </div>

      <section style={{ marginTop: "80px", opacity: 0.9 }}>
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Why Mizo Works</h2>
        <ul style={{ lineHeight: 1.6, paddingLeft: "18px" }}>
          <li>NEC-referenced questions</li>
          <li>Timed exam simulator</li>
          <li>Clear calculation explanations</li>
          <li>Built by a working electrician</li>
        </ul>
      </section>

      <section style={{ marginTop: "50px", opacity: 0.85, maxWidth: "720px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>
          Texas First. Nationwide Expansion.
        </h2>
        <p>
          Mizo launches with Texas Journeyman exam prep and will expand
          state-by-state across the United States.
        </p>
      </section>

      <section style={{ marginTop: "50px", opacity: 0.8 }}>
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>
          30-Day Confidence Guarantee
        </h2>
        <p>If you don’t feel more prepared, email us for a refund.</p>
      </section>
    </main>
  );
}

export default function Home() {
  // IMPORTANT: useSearchParams() requires a Suspense boundary in App Router.
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
