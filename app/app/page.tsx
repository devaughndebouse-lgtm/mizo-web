"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Simulator } from "./simulator";

type TopicOption = {
  value: string;
  label: string;
  description: string;
};

const TOPIC_OPTIONS: TopicOption[] = [
  {
    value: "mixed",
    label: "Mixed Exam Mode",
    description: "A balanced mix of NEC-style questions across all major exam categories.",
  },
  {
    value: "definitions",
    label: "Definitions / Plans",
    description: "Sharpen code language, terms, symbols, and print-reading basics.",
  },
  {
    value: "calc_theory",
    label: "Calculations & Theory",
    description: "Practice formulas, load math, and core electrical theory concepts.",
  },
  {
    value: "services",
    label: "Services",
    description: "Study service rules, sizing, and installation requirements.",
  },
  {
    value: "feeders",
    label: "Feeders",
    description: "Build confidence with feeder sizing, protection, and code references.",
  },
  {
    value: "branch",
    label: "Branch Circuits",
    description: "Train on branch-circuit rules, loads, and common exam traps.",
  },
  {
    value: "wiring",
    label: "Wiring Methods",
    description: "Focus on raceways, cable types, fittings, and installation rules.",
  },
  {
    value: "equipment",
    label: "Equipment & Devices",
    description: "Practice receptacles, panels, disconnects, and equipment rules.",
  },
  {
    value: "motors",
    label: "Motors",
    description: "Work on motor circuits, overloads, conductors, and controls.",
  },
  {
    value: "controls",
    label: "Controls / Disconnects",
    description: "Review disconnecting means, controller locations, and switching rules.",
  },
  {
    value: "special",
    label: "Special Occupancies",
    description: "Prepare for hazardous locations and special-use NEC requirements.",
  },
  {
    value: "renewable",
    label: "Renewable (PV)",
    description: "Study photovoltaic rules, disconnects, labeling, and calculations.",
  },
  {
    value: "dwelling",
    label: "Dwelling Load",
    description: "Practice residential service and feeder load calculations.",
  },
];

function AppPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) return null;

    return createClient(url, anonKey);
  }, []);

  const [authChecked, setAuthChecked] = useState(false);
  const [topic, setTopic] = useState("mixed");
  const requestedTrack =
    searchParams.get("track") === "master" ? "master" : "journeyman";

  const currentTopic = useMemo(
    () => TOPIC_OPTIONS.find((item) => item.value === topic) ?? TOPIC_OPTIONS[0],
    [topic]
  );

  useEffect(() => {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    let isMounted = true;

    const verifyAccess = async (email: string) => {
      const { data: accessRow, error: accessError } = await supabase
        .from("mizo_users")
        .select("access_active")
        .eq("email", email)
        .maybeSingle();

      if (!isMounted) return;

      if (accessError || !accessRow?.access_active) {
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/");
        return;
      }

      setAuthChecked(true);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;

      const session = data.session;
      if (!session) {
        return;
      }

      const userEmail = session.user.email;
      if (!userEmail) {
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/login");
        return;
      }

      await verifyAccess(userEmail);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
        return;
      }

      if (!session) {
        return;
      }

      void (async () => {
        const userEmail = session.user.email;
        if (!userEmail) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
          return;
        }

        await verifyAccess(userEmail);
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLogout() {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_28%),linear-gradient(180deg,_#0b0b0c_0%,_#111214_55%,_#0a0a0b_100%)] px-6 py-8 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white/80 backdrop-blur">
            Checking access...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_28%),linear-gradient(180deg,_#0b0b0c_0%,_#111214_55%,_#0a0a0b_100%)] px-6 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
                Mizo Mastery
              </div>
              <h1 className="mt-2 text-3xl font-extrabold">
                {requestedTrack === "master"
                  ? "Master Electrician Exam Simulator"
                  : "Journeyman Electrician Exam Simulator"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">
                {requestedTrack === "master"
                  ? "Focus your practice by topic, build speed under pressure, and train with a master-level exam simulator built for tougher code work, calculations, and commercial-style scenarios."
                  : "Focus your practice by topic, build speed under pressure, and train with an exam-style simulator designed for working electricians."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Log Out
              </button>
              <Link href="/" className="mizo-btn">
                Back Home
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="text-sm font-black uppercase tracking-[0.22em] text-yellow-300">
              Training Mode
            </div>
            <h2 className="mt-3 text-2xl font-extrabold">Choose your focus</h2>
            <p className="mt-2 text-sm leading-7 text-white/75">
              Switch between mixed exam practice or targeted drills to strengthen weak areas before test day.
            </p>

            <div className="mt-5">
              <label className="block text-sm font-bold text-white">Topic</label>
              <select
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {TOPIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="text-black">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-6 shadow-2xl">
            <div className="text-sm font-black uppercase tracking-[0.22em] text-yellow-200">
              Current Focus
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-white">{currentTopic.label}</h2>
            <p className="mt-3 text-sm leading-7 text-white/85">{currentTopic.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-white/60">Mode</div>
                <div className="mt-2 text-sm font-bold text-white">Targeted Practice</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-white/60">Goal</div>
                <div className="mt-2 text-sm font-bold text-white">Speed + Accuracy</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-white/60">Access</div>
                <div className="mt-2 text-sm font-bold text-white">Subscriber Area</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-6">
          <div id="simulator">
            <Simulator initialTrack={requestedTrack} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={null}>
      <AppPageInner />
    </Suspense>
  );
}