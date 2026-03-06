"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AppPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error(out?.error ?? "Logout failed");
      }
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : null;
      setError(message ?? "Logout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 text-black">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Mizo Simulator</h1>
        <p className="text-sm text-black/70">
          You’re in. If you got here, your access cookie is set.
        </p>
      </header>

      {error ? (
        <div className="rounded border bg-white p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded bg-yellow-400 px-3 py-2 text-sm font-bold text-black disabled:opacity-60"
          onClick={() => router.push("/")}
          disabled={loading}
        >
          Back to home
        </button>

        <button
          className="rounded border border-black bg-white px-3 py-2 text-sm font-bold text-black disabled:opacity-60"
          onClick={logout}
          disabled={loading}
        >
          {loading ? "Logging out…" : "Log out"}
        </button>
      </div>
    </main>
  );
}

