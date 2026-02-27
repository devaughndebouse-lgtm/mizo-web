// REPLACED WITH COMPLETE FILE BELOW

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ChoiceId = "A" | "B" | "C" | "D";
type Choice = { id: ChoiceId; text: string };

type TopicId =
  | "mixed"
  | "definitions"
  | "calc_theory"
  | "services"
  | "feeders"
  | "branch"
  | "wiring"
  | "equipment"
  | "motors"
  | "controls"
  | "special"
  | "renewable"
  | "dwelling";

type Problem = {
  id: string;
  topic: TopicId;
  portion: "knowledge" | "calculations";
  prompt: string;
  choices: Choice[];
  correctChoiceId: ChoiceId;
  answerText: string;
  steps: Array<{ label: string; detail: string }>;
  refs: string[];
};

const TOPICS: Array<{ id: TopicId; label: string }> = [
  { id: "mixed", label: "Mixed" },
  { id: "definitions", label: "Definitions / Plans" },
  { id: "calc_theory", label: "Calculations & Theory" },
  { id: "services", label: "Services" },
  { id: "feeders", label: "Feeders" },
  { id: "branch", label: "Branch Circuits" },
  { id: "wiring", label: "Wiring Methods" },
  { id: "equipment", label: "Equipment & Devices" },
  { id: "motors", label: "Motors" },
  { id: "controls", label: "Controls / Disconnects" },
  { id: "special", label: "Special Occupancies" },
  { id: "renewable", label: "Renewable (PV)" },
  { id: "dwelling", label: "Dwelling Load" },
];

function nextStandardBreakerSize(amps: number): number {
  // Common standard sizes (NEC 240.6). Keep it simple for training.
  const sizes = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];
  for (const s of sizes) if (amps <= s) return s;
  return 200;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fmtVA(va: number) {
  return `${Math.round(va).toLocaleString()} VA`;
}

// ---------- Question generators ----------

function q_pv(): Problem {
  const base = Math.floor(Math.random() * 15) + 5; // 5–19A
  const min = +(base * 1.25).toFixed(2);
  return {
    id: uid("pv"),
    topic: "renewable",
    portion: "calculations",
    prompt: `A PV source circuit has a maximum current of ${base} A. Per NEC 690, what minimum ampacity must the conductors be sized for?`,
    choices: [
      { id: "A", text: `${base} A` },
      { id: "B", text: `${(base * 1.1).toFixed(1)} A` },
      { id: "C", text: `${min} A` },
      { id: "D", text: `${(base * 1.5).toFixed(1)} A` },
    ],
    correctChoiceId: "C",
    answerText: `${min} A (${base} A × 125%)`,
    steps: [
      { label: "Array current", detail: `I = ${base} A` },
      { label: "Apply 125%", detail: `${base} × 1.25 = ${min} A` },
    ],
    refs: ["690.8", "690.8(A)(1)"],
  };
}

function q_dwellingLighting(): Problem {
  const sqft = (Math.floor(Math.random() * 20) + 10) * 100; // 1000–2900
  const load = sqft * 3;
  return {
    id: uid("dw"),
    topic: "dwelling",
    portion: "calculations",
    prompt: `For a dwelling with ${sqft} sq ft, what is the general lighting load at 3 VA/sq ft?`,
    choices: [
      { id: "A", text: `${sqft} VA` },
      { id: "B", text: `${load / 2} VA` },
      { id: "C", text: `${load} VA` },
      { id: "D", text: `${load + 600} VA` },
    ],
    correctChoiceId: "C",
    answerText: `${load} VA (${sqft} × 3)`,
    steps: [
      { label: "Area", detail: `${sqft} sq ft` },
      { label: "Rule", detail: "3 VA per sq ft" },
      { label: "Compute", detail: `${sqft} × 3 = ${load} VA` },
    ],
    refs: ["220.12"],
  };
}

function q_serviceGeneralLoad(): Problem {
  const sqft = (Math.floor(Math.random() * 16) + 12) * 100; // 1200–2700
  const lighting = sqft * 3;
  const sa = 2 * 1500;
  const laundry = 1 * 1500;
  const total = lighting + sa + laundry;

  return {
    id: uid("svc"),
    topic: "services",
    portion: "calculations",
    prompt: `A dwelling is ${sqft} sq ft and has (2) required small-appliance circuits and (1) laundry circuit. What is the minimum general load before demand factors?`,
    choices: [
      { id: "A", text: `${lighting} VA` },
      { id: "B", text: `${lighting + sa} VA` },
      { id: "C", text: `${total} VA` },
      { id: "D", text: `${total + 1500} VA` },
    ],
    correctChoiceId: "C",
    answerText: `${total} VA (${sqft}×3 + 2×1500 + 1×1500)`,
    steps: [
      { label: "General lighting", detail: `${sqft} × 3 VA = ${lighting} VA (220.12)` },
      { label: "Small appliance", detail: `2 × 1500 VA = ${sa} VA (220.52(A))` },
      { label: "Laundry", detail: `1 × 1500 VA = ${laundry} VA (220.52(B))` },
      { label: "Total", detail: `${lighting} + ${sa} + ${laundry} = ${total} VA` },
    ],
    refs: ["220.12", "220.52(A)", "220.52(B)"],
  };
}

function q_dwellingDemand22042(): Problem {
  const sqft = randInt(1200, 2800);
  const lighting = sqft * 3;
  const sa = 2 * 1500;
  const laundry = 1 * 1500;
  const general = lighting + sa + laundry;

  const first = 3000;
  const remainder = Math.max(0, general - first);
  const demand = first + remainder * 0.35;

  return {
    id: uid("22042"),
    topic: "services",
    portion: "calculations",
    prompt: `A dwelling is ${sqft} sq ft with (2) small-appliance circuits and (1) laundry circuit. What is the demand load for general lighting + SA + laundry using 220.42?`,
    choices: [
      { id: "A", text: fmtVA(general) },
      { id: "B", text: fmtVA(demand) },
      { id: "C", text: fmtVA(first + remainder * 0.4) },
      { id: "D", text: fmtVA(first + remainder * 0.25) },
    ],
    correctChoiceId: "B",
    answerText: `${fmtVA(demand)} (first 3,000 VA at 100% + remainder at 35%)`,
    steps: [
      { label: "General lighting", detail: `${sqft} × 3 = ${fmtVA(lighting)} (220.12)` },
      { label: "SA + laundry", detail: `2×1500 + 1×1500 = ${fmtVA(sa + laundry)} (220.52)` },
      { label: "Total general", detail: `${fmtVA(general)}` },
      { label: "220.42 demand", detail: `3,000 VA + (${fmtVA(remainder)} × 35%) = ${fmtVA(demand)}` },
    ],
    refs: ["220.12", "220.52(A)", "220.52(B)", "220.42"],
  };
}

function q_feederAmpsFromKVA_3ph(): Problem {
  const kva = randInt(15, 75);
  const v = [208, 240, 480][randInt(0, 2)];
  const amps = round2((kva * 1000) / (Math.sqrt(3) * v));

  return {
    id: uid("fd3ph"),
    topic: "feeders",
    portion: "calculations",
    prompt: `A 3φ feeder supplies a ${kva} kVA load at ${v}V. What is the line current?`,
    choices: [
      { id: "A", text: `${round2((kva * 1000) / v)} A` },
      { id: "B", text: `${amps} A` },
      { id: "C", text: `${round2(amps * 1.25)} A` },
      { id: "D", text: `${round2((kva * 1000) / (2 * v))} A` },
    ],
    correctChoiceId: "B",
    answerText: `${amps} A (I = kVA×1000 ÷ (√3×V))`,
    steps: [
      { label: "Formula", detail: `I = (kVA × 1000) ÷ (√3 × V)` },
      { label: "Compute", detail: `${kva}×1000 ÷ (1.732×${v}) = ${amps} A` },
    ],
    refs: ["3φ power formulas"],
  };
}

function q_continuousOCPD(): Problem {
  const Icont = Math.floor(Math.random() * 16) + 8; // 8–23A
  const required = +(Icont * 1.25).toFixed(2);
  const breaker = nextStandardBreakerSize(required);

  return {
    id: uid("ocpd"),
    topic: "branch",
    portion: "calculations",
    prompt: `A continuous load is ${Icont} A. What is the minimum standard OCPD size required?`,
    choices: [
      { id: "A", text: `${Icont} A` },
      { id: "B", text: `${Math.ceil(required)} A` },
      { id: "C", text: `${breaker} A` },
      { id: "D", text: `${nextStandardBreakerSize(required * 1.2)} A` },
    ],
    correctChoiceId: "C",
    answerText: `${breaker} A (125% = ${required} A, then next standard size)`,
    steps: [
      { label: "Continuous rule", detail: `${Icont} × 125% = ${required} A` },
      { label: "Standard size", detail: `Next standard OCPD size ≥ ${required} A is ${breaker} A (240.6)` },
    ],
    refs: ["210.20(A)", "215.3", "230.42(A)(1)", "240.6"],
  };
}

function q_motorConductors(): Problem {
  const flc = Math.floor(Math.random() * 31) + 12; // 12–42A
  const minAmp = +(flc * 1.25).toFixed(2);
  return {
    id: uid("mtr"),
    topic: "motors",
    portion: "calculations",
    prompt: `A motor has an FLC of ${flc} A. What minimum ampacity must the branch-circuit conductors be sized for?`,
    choices: [
      { id: "A", text: `${flc} A` },
      { id: "B", text: `${(flc * 1.15).toFixed(2)} A` },
      { id: "C", text: `${minAmp} A` },
      { id: "D", text: `${(flc * 1.5).toFixed(2)} A` },
    ],
    correctChoiceId: "C",
    answerText: `${minAmp} A (${flc} × 125%)`,
    steps: [
      { label: "Rule", detail: "Motor conductors ≥ 125% of FLC" },
      { label: "Compute", detail: `${flc} × 1.25 = ${minAmp} A` },
    ],
    refs: ["430.22"],
  };
}

function q_definitionAccessible(): Problem {
  return {
    id: uid("def"),
    topic: "definitions",
    portion: "knowledge",
    prompt: `In NEC terms, what does “readily accessible” generally mean?`,
    choices: [
      { id: "A", text: "Accessible only by ladder" },
      { id: "B", text: "Capable of being reached quickly without tools, ladders, or removing obstacles" },
      { id: "C", text: "Behind a locked panel is fine" },
      { id: "D", text: "Only accessible to qualified persons" },
    ],
    correctChoiceId: "B",
    answerText: "Reachable quickly without tools/ladders/obstacles",
    steps: [{ label: "Tip", detail: "Definitions are heavily tested — verify in Article 100." }],
    refs: ["Article 100"],
  };
}

function q_motorTable(): Problem {
  return {
    id: uid("mtrtbl"),
    topic: "motors",
    portion: "knowledge",
    prompt: `A 10 HP, 3-phase, 230V motor: which table is used to find FLC?`,
    choices: [
      { id: "A", text: "Table 430.247" },
      { id: "B", text: "Table 430.248" },
      { id: "C", text: "Table 430.250" },
      { id: "D", text: "Table 430.252" },
    ],
    correctChoiceId: "C",
    answerText: "Table 430.250 (three-phase motors)",
    steps: [{ label: "Check phase", detail: "Three-phase motor → Table 430.250" }],
    refs: ["430.250"],
  };
}

function q_calcTheory_power(): Problem {
  return {
    id: uid("ct"),
    topic: "calc_theory",
    portion: "calculations",
    prompt: "Which formula is used to calculate single-phase power (watts) when voltage and current are known?",
    choices: [
      { id: "A", text: "P = V ÷ I" },
      { id: "B", text: "P = V × I" },
      { id: "C", text: "P = I ÷ V" },
      { id: "D", text: "P = V × R" },
    ],
    correctChoiceId: "B",
    answerText: "P = V × I",
    steps: [{ label: "Rule", detail: "Single-phase watts = volts × amps." }],
    refs: ["Power formulas"],
  };
}

const QUESTION_FACTORY: Record<TopicId, Array<() => Problem>> = {
  mixed: [
    q_serviceGeneralLoad,
    q_dwellingDemand22042,
    q_feederAmpsFromKVA_3ph,
    q_continuousOCPD,
    q_motorConductors,
    q_dwellingLighting,
    q_pv,
    q_definitionAccessible,
    q_motorTable,
    q_calcTheory_power,
  ],
  definitions: [q_definitionAccessible],
  calc_theory: [q_calcTheory_power],
  services: [q_serviceGeneralLoad, q_dwellingDemand22042],
  feeders: [q_feederAmpsFromKVA_3ph],
  branch: [q_continuousOCPD],
  wiring: [q_continuousOCPD],
  equipment: [q_definitionAccessible],
  motors: [q_motorTable, q_motorConductors],
  controls: [q_definitionAccessible],
  special: [q_definitionAccessible],
  renewable: [q_pv],
  dwelling: [q_dwellingLighting],
};

function pickQuestion(topic: TopicId, want: "knowledge" | "calculations" | "mixed" = "mixed"): Problem {
  const pool = QUESTION_FACTORY[topic] ?? QUESTION_FACTORY.mixed;
  for (let i = 0; i < 8; i++) {
    const fn = pool[Math.floor(Math.random() * pool.length)];
    const q = fn();
    if (want === "mixed" || q.portion === want) return q;
  }
  return pool[Math.floor(Math.random() * pool.length)]();
}

const JOURNEYMAN_KNOWLEDGE_PLAN: Array<[TopicId, number]> = [
  ["definitions", 3],
  ["services", 6],
  ["feeders", 3],
  ["branch", 10],
  ["wiring", 10],
  ["equipment", 10],
  ["motors", 5],
  ["controls", 1],
  ["special", 6],
  ["renewable", 2],
];

const JOURNEYMAN_CALC_PLAN: Array<[TopicId, number]> = [
  ["calc_theory", 2],
  ["services", 4],
  ["feeders", 3],
  ["branch", 4],
  ["wiring", 2],
  ["equipment", 2],
  ["motors", 2],
  ["controls", 1],
  ["special", 3],
  ["renewable", 1],
];

type ExamStyle = "training" | "strict";

function buildSteps(plan: Array<[TopicId, number]>, portion: "knowledge" | "calculations") {
  const steps: Array<{ portion: "knowledge" | "calculations"; topic: TopicId }> = [];
  for (const [t, n] of plan) for (let i = 0; i < n; i++) steps.push({ portion, topic: t });
  return steps;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function paceSeconds(portion: "knowledge" | "calculations") {
  return portion === "knowledge" ? Math.round((130 * 60) / 59) : Math.round((110 * 60) / 26);
}

export default function Page() {
  const [tab, setTab] = useState<"practice" | "exam">("practice");
  const [topic, setTopic] = useState<TopicId>("mixed");
  const [style, setStyle] = useState<ExamStyle>("training");
  const [showRefs, setShowRefs] = useState(true);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [q, setQ] = useState<Problem | null>(null);
  const [selected, setSelected] = useState<ChoiceId | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [reveal, setReveal] = useState(false);

  const [scoreA, setScoreA] = useState(0);
  const [scoreC, setScoreC] = useState(0);

  const [examSteps, setExamSteps] = useState<Array<{ portion: "knowledge" | "calculations"; topic: TopicId }>>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [portion, setPortion] = useState<"knowledge" | "calculations">("knowledge");

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const pct = useMemo(() => (scoreA ? Math.round((scoreC / scoreA) * 100) : 0), [scoreA, scoreC]);

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimerFor(p: "knowledge" | "calculations") {
    clearTimer();
    const s = paceSeconds(p);
    setSecondsLeft(s);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function newPracticeQuestion() {
    setSelected(null);
    setResult(null);
    setReveal(false);
    const qq = pickQuestion(topic, "mixed");
    setQ(qq);
    setPortion(qq.portion);
    setSecondsLeft(null);
  }

  function startExam() {
    setTab("exam");
    setScoreA(0);
    setScoreC(0);
    setSelected(null);
    setResult(null);
    setReveal(false);

    const steps = [...shuffle(buildSteps(JOURNEYMAN_KNOWLEDGE_PLAN, "knowledge")), ...shuffle(buildSteps(JOURNEYMAN_CALC_PLAN, "calculations"))];
    setExamSteps(steps);
    setExamIndex(0);

    const first = steps[0];
    const qq = pickQuestion(first.topic, first.portion);
    setPortion(first.portion);
    setQ(qq);
    startTimerFor(first.portion);
  }

  function nextExamQuestion(idx: number, steps: Array<{ portion: "knowledge" | "calculations"; topic: TopicId }>) {
    const next = steps[idx];
    if (!next) {
      clearTimer();
      setSecondsLeft(null);
      setQ(null);
      return;
    }

    setSelected(null);
    setResult(null);
    setReveal(false);

    setPortion(next.portion);
    setQ(pickQuestion(next.topic, next.portion));
    startTimerFor(next.portion);
  }

  function grade(choice: ChoiceId) {
    if (!q) return;

    setSelected(choice);
    setScoreA((a) => a + 1);

    const ok = choice === q.correctChoiceId;
    setResult(ok ? "correct" : "incorrect");
    if (ok) setScoreC((c) => c + 1);

    if (tab === "practice") {
      if (style === "training") setReveal(true);
      return;
    }

    if (style === "training") setReveal(true);
  }

  // exam timeout
  useEffect(() => {
    if (tab !== "exam") return;
    if (!q) return;

    if (secondsLeft === 0 && result === null) {
      setScoreA((a) => a + 1);
      setResult("incorrect");
      if (style === "training") setReveal(true);
    }
  }, [secondsLeft, tab, q, result, style]);

  // exam auto-advance
  useEffect(() => {
    if (tab !== "exam") return;
    if (!q) return;
    if (!result) return;

    const delay = style === "training" ? 2500 : 250;
    const t = window.setTimeout(() => {
      const nextIdx = examIndex + 1;
      setExamIndex(nextIdx);
      nextExamQuestion(nextIdx, examSteps);
    }, delay);

    return () => window.clearTimeout(t);
  }, [result, tab, q, style, examIndex, examSteps]);

  // initial
  useEffect(() => {
    if (!q) newPracticeQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mizo Mastery</h1>
          <p className="text-sm opacity-80">Texas Journeyman training — NEC-referenced questions + timed exam simulator</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded px-3 py-2 text-sm ${tab === "practice" ? "bg-black text-white" : "bg-neutral-200"}`}
            onClick={() => {
              clearTimer();
              setSecondsLeft(null);
              setTab("practice");
              newPracticeQuestion();
            }}
          >
            Practice
          </button>
          <button
            className={`rounded px-3 py-2 text-sm ${tab === "exam" ? "bg-black text-white" : "bg-neutral-200"}`}
            onClick={() => startExam()}
          >
            Exam Simulator
          </button>
          <button
            className="rounded bg-black px-3 py-2 text-sm text-white"
            onClick={async () => {
              const res = await fetch("/api/create-checkout-session", { method: "POST" });
              const data = await res.json();

              if (!data?.url) {
                alert(`Stripe error: ${data?.error ?? "No checkout url returned"}`);
                console.log(data);
                return;
              }

              window.location.href = data.url;
            }}
          >
            Subscribe – $79/mo
          </button>
        </div>
      </div>

      {(success || canceled) && (
        <section className="rounded-lg border bg-white p-4 shadow-sm text-black">
          {success && <div className="text-sm">✅ Subscription checkout completed. Next: we’ll lock access to Pro features.</div>}
          {canceled && <div className="text-sm">Checkout canceled.</div>}
        </section>
      )}

      <section className="rounded-lg border bg-white p-4 shadow-sm text-black">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Topic</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value as TopicId)}
              disabled={tab === "exam"}
              title={tab === "exam" ? "Exam uses the full blueprint" : ""}
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="ml-2 text-sm font-medium">Style</label>
            <select className="rounded border px-2 py-1 text-sm" value={style} onChange={(e) => setStyle(e.target.value as ExamStyle)}>
              <option value="training">training</option>
              <option value="strict">strict</option>
            </select>

            <label className="ml-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showRefs} onChange={(e) => setShowRefs(e.target.checked)} />
              Show NEC refs
            </label>
          </div>

          <div className="text-sm">
            <span className="font-medium">Score:</span> {scoreC}/{scoreA} ({pct}%)
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm text-black">
        {!q ? (
          <div className="text-sm">Exam complete. Your score is above.</div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wide opacity-70">
                  {tab === "exam" ? "Exam" : "Practice"} • {portion}
                </div>
                {secondsLeft !== null && <div className="text-xs font-semibold">Time: {secondsLeft}s</div>}
              </div>

              <div className="text-base font-medium text-black">{q.prompt}</div>
              {showRefs && <div className="text-xs text-black opacity-80">NEC: {q.refs.join(", ")}</div>}
            </div>

            <div className="mt-4 grid gap-2">
              {q.choices.map((c) => {
                const isPicked = selected === c.id;
                const isCorrect = c.id === q.correctChoiceId;
                const showResult = result !== null;

                let cls = "rounded border px-3 py-2 text-left text-sm text-black";
                if (isPicked) cls += " border-black";
                if (showResult && isCorrect) cls += " bg-green-50";
                if (showResult && isPicked && !isCorrect) cls += " bg-red-50";

                return (
                  <button
                    key={c.id}
                    className={cls}
                    onClick={() => {
                      if (result) return;
                      grade(c.id);
                    }}
                  >
                    <span className="font-semibold">{c.id})</span> {c.text}
                  </button>
                );
              })}
            </div>

            {result && (
              <div className="mt-3 text-sm">{result === "correct" ? <span className="font-semibold">✅ Correct</span> : <span className="font-semibold">❌ Incorrect</span>}</div>
            )}

            {reveal && (
              <div className="mt-4 rounded border bg-neutral-50 p-3 text-black">
                <div className="text-sm font-semibold">Explanation</div>
                <div className="mt-1 text-sm">
                  <span className="font-medium">Correct:</span> {q.correctChoiceId}) {q.answerText}
                </div>
                <div className="mt-2 text-sm">
                  <div className="font-medium">Steps</div>
                  <ul className="mt-1 list-disc pl-5">
                    {q.steps.map((s, i) => (
                      <li key={i}>
                        <span className="font-medium">{s.label}:</span> {s.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {tab === "practice" && (
                <>
                  <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={() => newPracticeQuestion()}>
                    Next Question
                  </button>
                  {style === "strict" && result && (
                    <button className="rounded bg-neutral-200 px-3 py-2 text-sm" onClick={() => setReveal((r) => !r)}>
                      {reveal ? "Hide Explanation" : "Reveal Explanation"}
                    </button>
                  )}
                </>
              )}

              {tab === "exam" && <div className="text-xs opacity-70">Exam auto-advances {style === "training" ? "after a short delay" : "immediately"}.</div>}
            </div>
          </>
        )}
      </section>

      <section className="text-xs opacity-70">MVP: Next we expand to 100+ questions, add login + Stripe ($79/mo), and store progress.</section>
    </main>
  );
}