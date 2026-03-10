"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const QUESTIONS = [
  {
    question:
      "What is the minimum size copper equipment grounding conductor for a 100-amp overcurrent device?",
    choices: ["#10 AWG", "#8 AWG", "#6 AWG", "#4 AWG"],
    answer: 1,
    explanation:
      "NEC Table 250.122 requires a #8 AWG copper equipment grounding conductor for a 100-amp device.",
  },
  {
    question: "What NEC article covers photovoltaic systems?",
    choices: ["240", "690", "250", "430"],
    answer: 1,
    explanation: "Photovoltaic systems are covered in NEC Article 690.",
  },
  {
    question:
      "Minimum working clearance in front of 120-240V equipment under normal conditions?",
    choices: ["24 in", "30 in", "36 in", "42 in"],
    answer: 2,
    explanation: "NEC 110.26 typically requires 36 inches.",
  },
  {
    question:
      "What conductor size is required for a 20-amp branch circuit using copper?",
    choices: ["#14", "#12", "#10", "#8"],
    answer: 1,
    explanation: "NEC 210.19 requires #12 copper for a 20-amp circuit.",
  },
];

export default function PracticeQuestionsPage() {
  const sample = useMemo(() => {
    return QUESTIONS.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, []);

  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">

      <h1 className="text-4xl font-black">
        Electrician Practice Questions
      </h1>

      <p className="mt-4 text-lg text-neutral-700">
        Try a few real NEC-style questions from the Mizo Mastery exam simulator.
      </p>

      {sample.map((q, qi) => (
        <div key={qi} className="mt-10 border rounded-xl p-6">

          <div className="font-semibold text-lg">
            {q.question}
          </div>

          <div className="mt-4 grid gap-3">
            {q.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(i);
                  setSubmitted(false);
                }}
                className="border rounded-lg px-4 py-3 text-left hover:bg-neutral-100"
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSubmitted(true)}
            className="mt-4 bg-yellow-400 px-5 py-3 rounded-lg font-bold"
          >
            Check Answer
          </button>

          {submitted && (
            <div className="mt-4 p-4 bg-yellow-50 border rounded">
              <strong>Answer:</strong> {q.choices[q.answer]}
              <p className="mt-2">{q.explanation}</p>
            </div>
          )}

        </div>
      ))}

      {/* PAYWALL MESSAGE */}

      <div className="mt-14 text-center border rounded-2xl p-8 bg-yellow-50">

        <h2 className="text-3xl font-black">
          Want the Full Electrician Exam Simulator?
        </h2>

        <p className="mt-4 text-lg">
          These were just a few sample questions.
        </p>

        <p className="mt-2 text-neutral-700">
          The full Mizo Mastery platform includes hundreds of NEC-based
          questions, timed exam simulations, and step-by-step explanations
          built specifically for electricians preparing for licensing exams.
        </p>

        <Link
          href="/pricing"
          className="inline-block mt-6 bg-yellow-400 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300"
        >
          Unlock the Full Simulator
        </Link>

      </div>
    </main>
  );
}