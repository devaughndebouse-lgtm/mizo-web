"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Question = {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
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
  {
    question:
      "Which NEC article primarily covers motors, motor circuits, and controllers?",
    choices: ["Article 250", "Article 300", "Article 430", "Article 690"],
    answer: 2,
    explanation:
      "Motors, motor circuits, and controllers are primarily covered by NEC Article 430.",
  },
  {
    question:
      "What is the general minimum width of working space in front of electrical equipment?",
    choices: ["24 inches", "30 inches", "36 inches", "48 inches"],
    answer: 1,
    explanation:
      "NEC 110.26 generally requires working space to be at least 30 inches wide.",
  },
];

export default function PracticeQuestionsPage() {
  const sample = useMemo(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    {}
  );
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>(
    {}
  );

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-700 sm:text-sm">
            Free sample exam
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
            Electrician Practice Questions
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-700 sm:text-lg">
            Try a few real NEC-style questions from the Mizo Mastery exam simulator.
            Then unlock the full platform for deeper practice, timed simulations,
            and step-by-step explanations.
          </p>
        </section>

        <div className="mt-8 space-y-6">
          {sample.map((q, qi) => {
            const selected = selectedAnswers[qi];
            const submitted = submittedAnswers[qi] === true;

            return (
              <section
                key={qi}
                className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="text-sm font-bold uppercase tracking-wide text-yellow-700">
                  Question {qi + 1}
                </div>

                <h2 className="mt-3 text-xl font-black leading-8 text-neutral-950 sm:text-2xl">
                  {q.question}
                </h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {q.choices.map((choice, i) => {
                    const isSelected = selected === i;
                    const isCorrect = submitted && i === q.answer;
                    const isWrongSelected = submitted && isSelected && i !== q.answer;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedAnswers((prev) => ({ ...prev, [qi]: i }));
                          setSubmittedAnswers((prev) => ({ ...prev, [qi]: false }));
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left font-semibold transition ${
                          isCorrect
                            ? "border-green-300 bg-green-50 text-neutral-950"
                            : isWrongSelected
                            ? "border-red-300 bg-red-50 text-neutral-950"
                            : isSelected
                            ? "border-yellow-400 bg-yellow-50 text-neutral-950"
                            : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSubmittedAnswers((prev) => ({ ...prev, [qi]: true }))
                  }
                  disabled={selected === undefined}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 font-bold text-neutral-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Check Answer
                </button>

                {submitted && (
                  <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="font-bold text-yellow-800">
                      Correct Answer: {q.choices[q.answer]}
                    </div>
                    <p className="mt-2 leading-7 text-neutral-700">{q.explanation}</p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="mt-10 rounded-[28px] border border-yellow-200 bg-yellow-50 p-8 text-center shadow-sm sm:p-10">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">
            You have reached the free sample limit
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
            Want the Full Electrician Exam Simulator?
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-neutral-700 sm:text-lg">
            These were just a few sample questions. Mizo Mastery gives you access
            to more exam-style questions, timed practice, and focused explanations
            built for electricians who want to pass.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-8 py-4 text-lg font-extrabold text-neutral-950 transition hover:bg-yellow-300"
            >
              Unlock the Full Simulator
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 py-4 font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              Login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}