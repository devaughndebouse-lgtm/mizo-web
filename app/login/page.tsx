"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [password, setPassword] = useState(sp.get("temp") ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onLogin() {
    if (!supabase) {
      setMsg(
        "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session?.access_token) throw new Error("No session token returned");

      // Ask server to confirm subscription + set mizo_access cookie
      const res = await fetch("/api/login-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token: data.session.access_token }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) {
        throw new Error(out?.error ?? "Login access check failed");
      }

      router.replace("/app");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : null;
      setMsg(message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-black">Login</h1>
      <p className="text-sm text-black/70">
        Use the email you paid with. If this is your first login, use the temporary password you were issued after checkout.
      </p>

      <label className="text-sm font-semibold text-black">Email</label>
      <input
        className="rounded border p-2 text-black"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <label className="text-sm font-semibold text-black">Password</label>
      <input
        className="rounded border p-2 text-black"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
      />

      <button className="mizo-btn" onClick={onLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

      {msg && (
        <div className="rounded border bg-white p-3 text-sm font-semibold text-red-700">
          {msg}
        </div>
      )}

      <button
        className="mizo-btn"
        onClick={() => router.replace("/")}
        disabled={loading}
      >
        Back to Home
      </button>
    </main>
  );
}

export default function LoginPage() {
  // IMPORTANT: useSearchParams() requires a Suspense boundary in App Router.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
