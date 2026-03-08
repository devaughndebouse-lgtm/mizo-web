"use client";

import { useEffect, useMemo, useState } from "react";

type TopicId =
  | "mixed"
  | "definitions"
  | "grounding"
  | "motors"
  | "conduit"
  | "voltage_drop"
  | "calculations";

type Choice = {
  id: string;
  text: string;
  explanation: string;
};

type Question = {
  id: string;
  topic: TopicId;
  prompt: string;
  choices: Choice[];
  correctChoiceId: string;
  reference?: string;
};

const TOPICS: Array<{ id: TopicId; label: string }> = [
  { id: "mixed", label: "Mixed" },
  { id: "definitions", label: "Definitions" },
  { id: "grounding", label: "Grounding & Bonding" },
  { id: "motors", label: "Motors" },
  { id: "conduit", label: "Conduit Fill" },
  { id: "voltage_drop", label: "Voltage Drop" },
  { id: "calculations", label: "Calculations" },
];

const EXAM_SECONDS = 15 * 60;
const JOURNEYMAN_SECONDS = 4 * 60 * 60;
const JOURNEYMAN_QUESTION_COUNT = 80;
const PROGRESS_KEY = "mizo_progress_v1";

const serviceAmpPairs = [
  [120, 60], [120, 80], [120, 100], [120, 125], [120, 150],
  [240, 60], [240, 80], [240, 100], [240, 125], [240, 150],
  [240, 175], [240, 200], [240, 225], [240, 250], [240, 300],
  [208, 100], [208, 125], [208, 150], [208, 175], [208, 200],
] as const;

const SERVICE_CALC_QUESTIONS: Question[] = serviceAmpPairs.map(([voltage, amps]) => {
  const correct = voltage * amps;
  return {
    id: `svc-va-${voltage}-${amps}`,
    topic: "calculations",
    prompt: `A service operates at ${voltage}V and ${amps}A. What is the apparent power in volt-amperes?`,
    reference: "Basic service calculation",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: `${amps} VA`, explanation: "That ignores voltage." },
      { id: "b", text: `${correct} VA`, explanation: `Correct. ${voltage} × ${amps} = ${correct} VA.` },
      { id: "c", text: `${correct / 2} VA`, explanation: "That is only half the calculated value." },
      { id: "d", text: `${correct * 2} VA`, explanation: "That is double the calculated value." },
    ],
  };
});

const boxFillPairs = [
  [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
  [3, 4], [3, 5], [3, 6], [3, 7], [3, 8],
  [4, 4], [4, 5], [4, 6], [4, 7], [4, 8],
  [6, 4], [6, 5], [6, 6], [6, 7], [6, 8],
] as const;

const BOX_FILL_QUESTIONS: Question[] = boxFillPairs.map(([devices, conductors]) => {
  const totalUnits = devices * 2 + conductors;
  return {
    id: `boxfill-${devices}-${conductors}`,
    topic: "calculations",
    prompt: `A box contains ${devices} device yokes and ${conductors} insulated conductors that each count as one conductor volume allowance. Ignoring fittings and grounds for this question, how many conductor-volume allowances are required?`,
    reference: "NEC 314.16 box-fill concept",
    correctChoiceId: "d",
    choices: [
      { id: "a", text: `${devices + conductors}`, explanation: "Each device yoke counts as two conductor-volume allowances here, not one." },
      { id: "b", text: `${devices * 3 + conductors}`, explanation: "That overcounts each device yoke." },
      { id: "c", text: `${devices * 2 + conductors + 2}`, explanation: "That adds extra allowances not stated in the problem." },
      { id: "d", text: `${totalUnits}`, explanation: `Correct. ${devices} device yokes × 2 plus ${conductors} conductors = ${totalUnits} conductor-volume allowances.` },
    ],
  };
});

const ampacitySets = [
  [20, 15, 25, 30],
  [30, 25, 35, 40],
  [40, 35, 50, 60],
  [55, 50, 65, 70],
  [70, 60, 75, 80],
  [85, 75, 90, 100],
  [100, 90, 110, 125],
  [115, 100, 125, 150],
  [130, 115, 145, 175],
  [150, 125, 165, 200],
  [170, 145, 185, 225],
  [190, 165, 205, 250],
  [210, 185, 230, 300],
  [230, 200, 255, 350],
  [255, 230, 285, 400],
  [285, 255, 310, 450],
  [310, 285, 335, 500],
  [335, 310, 360, 600],
  [360, 335, 390, 700],
  [390, 360, 420, 800],
] as const;

const AMPACITY_QUESTIONS: Question[] = ampacitySets.map(([ampacity, low, high, breaker]) => ({
  id: `ampacity-${ampacity}`,
  topic: "calculations",
  prompt: `A conductor has an allowable ampacity of ${ampacity}A for this question. What is the best ampacity value to use in sizing before considering standard overcurrent device rounding rules?`,
  reference: "Conductor ampacity sizing concept",
  correctChoiceId: "a",
  choices: [
    { id: "a", text: `${ampacity}A`, explanation: "Correct. The conductor ampacity used for sizing here is the listed allowable ampacity." },
    { id: "b", text: `${low}A`, explanation: "That is lower than the stated allowable ampacity." },
    { id: "c", text: `${high}A`, explanation: "That is higher than the stated allowable ampacity." },
    { id: "d", text: `${breaker}A`, explanation: "That is a standard breaker size, not the conductor ampacity stated in the question." },
  ],
}));

const ocpdSets = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250] as const;

const OCPD_QUESTIONS: Question[] = ocpdSets.map((rating) => ({
  id: `ocpd-${rating}`,
  topic: "calculations",
  prompt: `Which of the following is the standard overcurrent device rating identified in this question set?`,
  reference: "NEC 240.6(A)",
  correctChoiceId: "c",
  choices: [
    { id: "a", text: `${rating - 3}A`, explanation: "That is not the standard rating being targeted here." },
    { id: "b", text: `${rating + 2}A`, explanation: "That is not the standard rating being targeted here." },
    { id: "c", text: `${rating}A`, explanation: "Correct. This is the intended standard overcurrent device rating for this question." },
    { id: "d", text: `${rating + 7}A`, explanation: "That is not the standard rating being targeted here." },
  ],
}));

const transformerPairs = [
  [25, 240], [25, 480], [37.5, 240], [37.5, 480], [45, 240],
  [45, 480], [50, 240], [50, 480], [75, 240], [75, 480],
  [100, 240], [100, 480], [112.5, 240], [112.5, 480], [150, 240],
  [150, 480], [225, 240], [225, 480], [300, 240], [300, 480],
] as const;

const TRANSFORMER_QUESTIONS: Question[] = transformerPairs.map(([kva, voltage]) => {
  const correct = Math.round((kva * 1000) / voltage * 100) / 100;
  return {
    id: `xfmr-${kva}-${voltage}`,
    topic: "calculations",
    prompt: `A single-phase transformer is rated ${kva} kVA at ${voltage}V. What is the full-load current on that side?`,
    reference: "Single-phase transformer current formula",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: `${Math.round(correct / 2 * 100) / 100}A`, explanation: "That is only half of the full-load current." },
      { id: "b", text: `${correct}A`, explanation: `Correct. ${kva} kVA × 1000 ÷ ${voltage}V = ${correct}A.` },
      { id: "c", text: `${Math.round(correct * 1.25 * 100) / 100}A`, explanation: "That is above the full-load current value asked for here." },
      { id: "d", text: `${Math.round(correct * 2 * 100) / 100}A`, explanation: "That doubles the correct answer." },
    ],
  };
});

const dwellingDemandPairs = [
  [3000, 35], [3500, 35], [4000, 35], [4500, 35], [5000, 35],
  [6000, 35], [7000, 35], [8000, 35], [9000, 35], [10000, 35],
  [11000, 35], [12000, 35], [13000, 35], [14000, 35], [15000, 35],
  [16000, 35], [17000, 35], [18000, 35], [19000, 35], [20000, 35],
] as const;

const DWELLING_DEMAND_QUESTIONS: Question[] = dwellingDemandPairs.map(([remainder, factor]) => {
  const correct = Math.round((remainder * (factor / 100)) * 100) / 100;
  return {
    id: `dw-demand-${remainder}`,
    topic: "calculations",
    prompt: `A dwelling-load remainder of ${remainder} VA is subject to a ${factor}% demand factor for this question. What is the demand load?`,
    reference: "Dwelling demand-factor arithmetic concept",
    correctChoiceId: "a",
    choices: [
      { id: "a", text: `${correct} VA`, explanation: `Correct. ${remainder} × ${factor}% = ${correct} VA.` },
      { id: "b", text: `${remainder} VA`, explanation: "That applies no demand factor." },
      { id: "c", text: `${Math.round((remainder * 0.5) * 100) / 100} VA`, explanation: "That uses the wrong factor." },
      { id: "d", text: `${Math.round((remainder * 0.25) * 100) / 100} VA`, explanation: "That uses the wrong factor." },
    ],
  };
});

const EXTENDED_CALCULATION_QUESTIONS: Question[] = [
  ...SERVICE_CALC_QUESTIONS,
  ...BOX_FILL_QUESTIONS,
  ...AMPACITY_QUESTIONS,
  ...OCPD_QUESTIONS,
  ...TRANSFORMER_QUESTIONS,
  ...DWELLING_DEMAND_QUESTIONS,
];

const DEFINITION_QUESTIONS: Question[] = [
  {
    id: "def-1",
    topic: "definitions",
    prompt: 'In NEC terms, what does "readily accessible" generally mean?',
    correctChoiceId: "b",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "Accessible only by ladder", explanation: "Needing a ladder usually does not meet the definition." },
      { id: "b", text: "Capable of being reached quickly without tools, ladders, or obstacles", explanation: "Correct." },
      { id: "c", text: "Located behind a locked door", explanation: "A locked door is a barrier." },
      { id: "d", text: "Only accessible to qualified persons", explanation: "That is a different concept." },
    ],
  },
  {
    id: "def-2",
    topic: "definitions",
    prompt: "What does the NEC define as a continuous load?",
    correctChoiceId: "b",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "Load lasting 30 minutes", explanation: "Too short." },
      { id: "b", text: "Load expected to run for 3 hours or more", explanation: "Correct." },
      { id: "c", text: "Any lighting load", explanation: "Not always." },
      { id: "d", text: "Motor loads only", explanation: "Incorrect." },
    ],
  },
  {
    id: "def-3",
    topic: "definitions",
    prompt: "Which answer best describes a branch circuit?",
    correctChoiceId: "c",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "The conductors between the utility transformer and meter", explanation: "That is not the branch-circuit definition." },
      { id: "b", text: "Any conductors installed in conduit", explanation: "That is too broad." },
      { id: "c", text: "The circuit conductors between the final overcurrent device and the outlet(s)", explanation: "Correct." },
      { id: "d", text: "Only the grounded conductor of a feeder", explanation: "Incorrect." },
    ],
  },
  {
    id: "def-4",
    topic: "definitions",
    prompt: "Which answer best describes a feeder?",
    correctChoiceId: "a",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "All circuit conductors between the service equipment and the final branch-circuit overcurrent device", explanation: "Correct." },
      { id: "b", text: "Only the grounded conductor of a service", explanation: "Incorrect." },
      { id: "c", text: "Any conductors leaving a disconnect", explanation: "Too broad." },
      { id: "d", text: "Only motor branch-circuit conductors", explanation: "Incorrect." },
    ],
  },
  {
    id: "def-5",
    topic: "definitions",
    prompt: "Which answer best describes a grounded conductor?",
    correctChoiceId: "d",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "Any equipment grounding conductor", explanation: "That is a different conductor." },
      { id: "b", text: "Any conductor in a raceway", explanation: "Too broad." },
      { id: "c", text: "A conductor that never carries current", explanation: "Incorrect." },
      { id: "d", text: "A system or circuit conductor that is intentionally grounded", explanation: "Correct." },
    ],
  },
];

const GROUNDING_QUESTIONS: Question[] = [
  {
    id: "gnd-1",
    topic: "grounding",
    prompt: "What is the purpose of equipment grounding conductors?",
    correctChoiceId: "c",
    reference: "NEC 250.4",
    choices: [
      { id: "a", text: "Increase resistance", explanation: "Incorrect." },
      { id: "b", text: "Reduce voltage", explanation: "Incorrect." },
      { id: "c", text: "Provide effective fault current path", explanation: "Correct." },
      { id: "d", text: "Replace neutral", explanation: "Incorrect." },
    ],
  },
  {
    id: "gnd-2",
    topic: "grounding",
    prompt: "Which conductor bonds metal equipment to ground?",
    correctChoiceId: "a",
    reference: "NEC 250.118",
    choices: [
      { id: "a", text: "Equipment grounding conductor", explanation: "Correct." },
      { id: "b", text: "Neutral", explanation: "Incorrect." },
      { id: "c", text: "Ungrounded conductor", explanation: "Incorrect." },
      { id: "d", text: "Grounding electrode", explanation: "Different function." },
    ],
  },
  {
    id: "gnd-3",
    topic: "grounding",
    prompt: "Why must the fault-current path be low impedance?",
    correctChoiceId: "b",
    reference: "NEC 250.4(A)(5)",
    choices: [
      { id: "a", text: "To reduce breaker size", explanation: "Incorrect." },
      { id: "b", text: "So enough fault current flows to open the overcurrent device quickly", explanation: "Correct." },
      { id: "c", text: "To carry normal neutral current", explanation: "Incorrect." },
      { id: "d", text: "To replace disconnects", explanation: "Incorrect." },
    ],
  },
  {
    id: "gnd-4",
    topic: "grounding",
    prompt: "What is the main purpose of bonding metal parts?",
    correctChoiceId: "d",
    reference: "NEC 250.4(A)(3) and (4)",
    choices: [
      { id: "a", text: "To increase voltage", explanation: "Incorrect." },
      { id: "b", text: "To eliminate overcurrent devices", explanation: "Incorrect." },
      { id: "c", text: "To reduce conductor size", explanation: "Incorrect." },
      { id: "d", text: "To ensure continuity and conduct fault current safely", explanation: "Correct." },
    ],
  },
  {
    id: "gnd-5",
    topic: "grounding",
    prompt: "At the service, where is the grounded conductor normally bonded?",
    correctChoiceId: "a",
    reference: "NEC 250.24",
    choices: [
      { id: "a", text: "At the service disconnecting means", explanation: "Correct." },
      { id: "b", text: "At every downstream panelboard", explanation: "Incorrect." },
      { id: "c", text: "At the first receptacle", explanation: "Incorrect." },
      { id: "d", text: "Only at the grounding electrode", explanation: "Incorrect." },
    ],
  },
];

const MOTOR_QUESTIONS: Question[] = [
  {
    id: "mot-1",
    topic: "motors",
    prompt: "Motor conductors must generally be sized at what percentage of full-load current?",
    correctChoiceId: "d",
    reference: "NEC 430.22",
    choices: [
      { id: "a", text: "100%", explanation: "Too low." },
      { id: "b", text: "110%", explanation: "Too low." },
      { id: "c", text: "120%", explanation: "Incorrect." },
      { id: "d", text: "125%", explanation: "Correct." },
    ],
  },
  {
    id: "mot-2",
    topic: "motors",
    prompt: "Which NEC table provides 3-phase motor full-load current values?",
    correctChoiceId: "b",
    reference: "NEC Table 430.250",
    choices: [
      { id: "a", text: "Table 310.16", explanation: "Ampacity table." },
      { id: "b", text: "Table 430.250", explanation: "Correct." },
      { id: "c", text: "Table 240.6", explanation: "Breaker ratings." },
      { id: "d", text: "Chapter 9 Table 1", explanation: "Conduit fill." },
    ],
  },
  {
    id: "mot-3",
    topic: "motors",
    prompt: "What is the basic purpose of motor overload protection?",
    correctChoiceId: "c",
    reference: "NEC 430.31 through 430.44",
    choices: [
      { id: "a", text: "To replace short-circuit protection", explanation: "Incorrect." },
      { id: "b", text: "To increase horsepower", explanation: "Incorrect." },
      { id: "c", text: "To protect from excessive overheating due to overload", explanation: "Correct." },
      { id: "d", text: "To eliminate disconnect requirements", explanation: "Incorrect." },
    ],
  },
  {
    id: "mot-4",
    topic: "motors",
    prompt: "Why is a motor disconnect often required within sight of the motor?",
    correctChoiceId: "a",
    reference: "NEC 430.102",
    choices: [
      { id: "a", text: "To provide a local means to disconnect the motor and driven machinery", explanation: "Correct." },
      { id: "b", text: "To increase motor efficiency", explanation: "Incorrect." },
      { id: "c", text: "To raise available fault current", explanation: "Incorrect." },
      { id: "d", text: "To reduce ampacity", explanation: "Incorrect." },
    ],
  },
  {
    id: "mot-5",
    topic: "motors",
    prompt: "A motor has a full-load current of 40A. What minimum branch-circuit conductor ampacity is required?",
    correctChoiceId: "b",
    reference: "NEC 430.22",
    choices: [
      { id: "a", text: "40A", explanation: "That is only 100% of FLC." },
      { id: "b", text: "50A", explanation: "Correct. 40A × 125% = 50A." },
      { id: "c", text: "46A", explanation: "Incorrect." },
      { id: "d", text: "60A", explanation: "Above minimum." },
    ],
  },
];

const CONDUIT_QUESTIONS: Question[] = [
  {
    id: "con-1",
    topic: "conduit",
    prompt: "Maximum conduit fill for more than two conductors is:",
    correctChoiceId: "c",
    reference: "NEC Chapter 9 Table 1",
    choices: [
      { id: "a", text: "31%", explanation: "Incorrect." },
      { id: "b", text: "35%", explanation: "Incorrect." },
      { id: "c", text: "40%", explanation: "Correct." },
      { id: "d", text: "53%", explanation: "Single conductor." },
    ],
  },
  {
    id: "con-2",
    topic: "conduit",
    prompt: "Maximum fill for one conductor in a raceway is:",
    correctChoiceId: "d",
    reference: "NEC Chapter 9 Table 1",
    choices: [
      { id: "a", text: "31%", explanation: "Two conductors." },
      { id: "b", text: "40%", explanation: "More than two conductors." },
      { id: "c", text: "45%", explanation: "Incorrect." },
      { id: "d", text: "53%", explanation: "Correct." },
    ],
  },
  {
    id: "con-3",
    topic: "conduit",
    prompt: "Maximum fill for exactly two conductors in a raceway is:",
    correctChoiceId: "a",
    reference: "NEC Chapter 9 Table 1",
    choices: [
      { id: "a", text: "31%", explanation: "Correct." },
      { id: "b", text: "40%", explanation: "Incorrect." },
      { id: "c", text: "53%", explanation: "Incorrect." },
      { id: "d", text: "60%", explanation: "Incorrect." },
    ],
  },
  {
    id: "con-4",
    topic: "conduit",
    prompt: "Which NEC reference is commonly used first for basic raceway fill percentages?",
    correctChoiceId: "b",
    reference: "NEC Chapter 9 Table 1",
    choices: [
      { id: "a", text: "Table 310.16", explanation: "That is an ampacity table." },
      { id: "b", text: "Chapter 9, Table 1", explanation: "Correct." },
      { id: "c", text: "Table 430.250", explanation: "Motor table." },
      { id: "d", text: "Table 240.6(A)", explanation: "Breaker ratings." },
    ],
  },
  {
    id: "con-5",
    topic: "conduit",
    prompt: "If more than two conductors are installed in a raceway, which fill limit applies?",
    correctChoiceId: "c",
    reference: "NEC Chapter 9 Table 1",
    choices: [
      { id: "a", text: "31%", explanation: "That applies to exactly two conductors." },
      { id: "b", text: "53%", explanation: "That applies to one conductor." },
      { id: "c", text: "40%", explanation: "Correct." },
      { id: "d", text: "25%", explanation: "Incorrect." },
    ],
  },
];

const VOLTAGE_DROP_QUESTIONS: Question[] = [
  {
    id: "vd-1",
    topic: "voltage_drop",
    prompt: "120V circuit drops 3V. Voltage drop percent?",
    correctChoiceId: "a",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "2.5%", explanation: "Correct." },
      { id: "b", text: "3%", explanation: "Too high." },
      { id: "c", text: "4%", explanation: "Too high." },
      { id: "d", text: "5%", explanation: "Too high." },
    ],
  },
  {
    id: "vd-2",
    topic: "voltage_drop",
    prompt: "240V circuit drops 6V. Percent drop?",
    correctChoiceId: "b",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "2%", explanation: "Incorrect." },
      { id: "b", text: "2.5%", explanation: "Correct." },
      { id: "c", text: "3%", explanation: "Incorrect." },
      { id: "d", text: "5%", explanation: "Incorrect." },
    ],
  },
  {
    id: "vd-3",
    topic: "voltage_drop",
    prompt: "A 480V circuit has a 12V drop. What is the approximate percentage?",
    correctChoiceId: "d",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "1.5%", explanation: "Too low." },
      { id: "b", text: "2%", explanation: "Too low." },
      { id: "c", text: "2.25%", explanation: "Incorrect." },
      { id: "d", text: "2.5%", explanation: "Correct. 12 ÷ 480 = 0.025 = 2.5%." },
    ],
  },
  {
    id: "vd-4",
    topic: "voltage_drop",
    prompt: "A 208V circuit has a 4V drop. What is the approximate percentage?",
    correctChoiceId: "c",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "1%", explanation: "Too low." },
      { id: "b", text: "1.5%", explanation: "Too low." },
      { id: "c", text: "1.92%", explanation: "Correct." },
      { id: "d", text: "2.5%", explanation: "Too high." },
    ],
  },
  {
    id: "vd-5",
    topic: "voltage_drop",
    prompt: "A 277V circuit has a 6V drop. What is the approximate percentage?",
    correctChoiceId: "b",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "1.5%", explanation: "Too low." },
      { id: "b", text: "2.17%", explanation: "Correct." },
      { id: "c", text: "2.5%", explanation: "Too high." },
      { id: "d", text: "3%", explanation: "Too high." },
    ],
  },
];

const CALCULATION_QUESTIONS: Question[] = [
  {
    id: "calc-1",
    topic: "calculations",
    prompt: "A 120V circuit carries 10A. Power equals:",
    correctChoiceId: "c",
    reference: "P = V × I",
    choices: [
      { id: "a", text: "10W", explanation: "Incorrect." },
      { id: "b", text: "120W", explanation: "Incorrect." },
      { id: "c", text: "1200W", explanation: "Correct." },
      { id: "d", text: "12,000W", explanation: "Incorrect." },
    ],
  },
  {
    id: "calc-2",
    topic: "calculations",
    prompt: "20A continuous load must be sized to:",
    correctChoiceId: "c",
    reference: "NEC 210.19",
    choices: [
      { id: "a", text: "20A", explanation: "Too low." },
      { id: "b", text: "22A", explanation: "Incorrect." },
      { id: "c", text: "25A", explanation: "Correct." },
      { id: "d", text: "30A", explanation: "Above minimum." },
    ],
  },
  {
    id: "calc-3",
    topic: "calculations",
    prompt: "A 240V circuit carries 15A. Power equals:",
    correctChoiceId: "a",
    reference: "P = V × I",
    choices: [
      { id: "a", text: "3600W", explanation: "Correct. 240 × 15 = 3600W." },
      { id: "b", text: "2400W", explanation: "Incorrect." },
      { id: "c", text: "1800W", explanation: "Incorrect." },
      { id: "d", text: "4800W", explanation: "Incorrect." },
    ],
  },
  {
    id: "calc-4",
    topic: "calculations",
    prompt: "Using 3 VA per square foot, what is the general lighting load for a 1,500 sq ft dwelling?",
    correctChoiceId: "d",
    reference: "NEC 220.12",
    choices: [
      { id: "a", text: "1500 VA", explanation: "That uses 1 VA per square foot." },
      { id: "b", text: "3000 VA", explanation: "That uses 2 VA per square foot." },
      { id: "c", text: "5000 VA", explanation: "Too high." },
      { id: "d", text: "4500 VA", explanation: "Correct. 1500 × 3 = 4500 VA." },
    ],
  },
  {
    id: "calc-5",
    topic: "calculations",
    prompt: "A 30A continuous load must be sized to what minimum ampacity?",
    correctChoiceId: "b",
    reference: "NEC 210.19(A)(1)",
    choices: [
      { id: "a", text: "30A", explanation: "Too low." },
      { id: "b", text: "37.5A", explanation: "Correct. 30 × 1.25 = 37.5A." },
      { id: "c", text: "35A", explanation: "Incorrect." },
      { id: "d", text: "40A", explanation: "Above minimum." },
    ],
  },
];

const QUESTIONS: Question[] = [
  ...DEFINITION_QUESTIONS,
  ...GROUNDING_QUESTIONS,
  ...MOTOR_QUESTIONS,
  ...CONDUIT_QUESTIONS,
  ...VOLTAGE_DROP_QUESTIONS,
  ...CALCULATION_QUESTIONS,
  ...EXTENDED_CALCULATION_QUESTIONS,
].slice(0, 500);

function shuffleArray<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildJourneymanSet(source: Question[]) {
  const base = shuffleArray(source);
  const out: Question[] = [];

  while (out.length < JOURNEYMAN_QUESTION_COUNT) {
    const template = base[out.length % base.length];
    out.push({
      ...template,
      id: `${template.id}-jx-${out.length + 1}`,
    });
  }

  return out;
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function Simulator() {
  const [topic, setTopic] = useState<TopicId>("mixed");
  const [mode, setMode] = useState<"practice" | "exam" | "journeyman">("practice");
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState(() => {
    if (typeof window === "undefined") {
      return { examsTaken: 0, bestScore: 0, lastScore: 0 };
    }

    try {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (!raw) return { examsTaken: 0, bestScore: 0, lastScore: 0 };
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return { examsTaken: 0, bestScore: 0, lastScore: 0 };
      }

      const p = parsed as { examsTaken?: unknown; bestScore?: unknown; lastScore?: unknown };
      return {
        examsTaken: Number(p.examsTaken ?? 0),
        bestScore: Number(p.bestScore ?? 0),
        lastScore: Number(p.lastScore ?? 0),
      };
    } catch {
      return { examsTaken: 0, bestScore: 0, lastScore: 0 };
    }
  });

  const baseQuestions = useMemo(() => {
    return topic === "mixed" ? QUESTIONS : QUESTIONS.filter((q) => q.topic === topic);
  }, [topic]);

  const questions = started ? sessionQuestions : baseQuestions;

  const current = questions[index] ?? null;
  const picked = current ? answers[current.id] ?? null : null;

  const score = useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctChoiceId) correct += 1;
    }
    return { correct, total: questions.length };
  }, [answers, questions]);

  useEffect(() => {
    if (!started || submitted || (mode !== "exam" && mode !== "journeyman")) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, submitted, mode]);

  function reset(nextMode: typeof mode = mode) {
    setStarted(false);
    setSubmitted(false);
    setIndex(0);
    setAnswers({});
    setSessionQuestions([]);
    setSecondsLeft(nextMode === "journeyman" ? JOURNEYMAN_SECONDS : EXAM_SECONDS);
  }

  function pick(choiceId: string) {
    if (!current || submitted) return;
    setAnswers((prev) => ({ ...prev, [current.id]: choiceId }));
  }

  function setTopicAndReset(nextTopic: TopicId) {
    setTopic(nextTopic);
    reset(mode);
  }

  function setModeAndReset(nextMode: typeof mode) {
    setMode(nextMode);
    reset(nextMode);
  }

  function beginSession() {
    const randomized = mode === "journeyman"
      ? buildJourneymanSet(baseQuestions)
      : shuffleArray(baseQuestions);

    setSessionQuestions(randomized);
    setAnswers({});
    setSubmitted(false);
    setIndex(0);
    setSecondsLeft(mode === "journeyman" ? JOURNEYMAN_SECONDS : EXAM_SECONDS);
    setStarted(true);
  }

  function next() {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  if (!questions.length) {
    return (
      <section className="rounded-xl border bg-white p-5 text-black shadow-sm">
        <h2 className="text-lg font-extrabold">No questions found</h2>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="rounded-xl border bg-white p-5 text-black shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-bold text-black">Topic</label>
            <select
              className="mt-2 rounded border border-black px-3 py-2 text-sm text-black"
              value={topic}
              onChange={(e) => setTopicAndReset(e.target.value as TopicId)}
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-black">Mode</label>
            <select
              className="mt-2 rounded border border-black px-3 py-2 text-sm text-black"
              value={mode}
              onChange={(e) => setModeAndReset(e.target.value as typeof mode)}
            >
              <option value="practice">Practice</option>
              <option value="exam">Timed Exam</option>
              <option value="journeyman">Journeyman Mock Exam</option>
            </select>
          </div>
        </div>

        <h2 className="mt-5 text-lg font-extrabold">Exam Simulator</h2>
        <p className="mt-1 text-sm text-black/70">
          Topic filtering, timer mode, and NEC-style questions are now active.
        </p>

        <div className="mt-4 text-sm text-black/80">
          Questions: <span className="font-bold text-black">{mode === "journeyman" ? JOURNEYMAN_QUESTION_COUNT : baseQuestions.length}</span>
          {mode === "exam" || mode === "journeyman" ? (
            <span className="ml-4">
              Timer: <span className="font-bold text-black">{formatClock(mode === "journeyman" ? JOURNEYMAN_SECONDS : EXAM_SECONDS)}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 rounded-lg border bg-neutral-50 p-4 text-sm text-black/80 sm:grid-cols-3">
          <div>
            Exams taken: <span className="font-bold text-black">{progress.examsTaken}</span>
          </div>
          <div>
            Best score: <span className="font-bold text-black">{progress.bestScore}%</span>
          </div>
          <div>
            Last score: <span className="font-bold text-black">{progress.lastScore}%</span>
          </div>
        </div>

        <button className="mizo-btn mt-4" onClick={beginSession}>
          {mode === "journeyman"
            ? "Start journeyman mock exam"
            : mode === "exam"
              ? "Start timed exam"
              : "Start practice"}
        </button>
      </section>
    );
  }

  if (submitted) {
    const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;

    if (typeof window !== "undefined") {
      const nextProgress = {
        examsTaken: progress.examsTaken + 1,
        bestScore: Math.max(progress.bestScore, percent),
        lastScore: percent,
      };

      const currentStored = window.localStorage.getItem(PROGRESS_KEY);
      const currentStoredParsed = currentStored ? JSON.parse(currentStored) : null;
      const alreadySaved = currentStoredParsed?.lastScore === percent && currentStoredParsed?.examsTaken === nextProgress.examsTaken;

      if (!alreadySaved) {
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextProgress));
        if (
          nextProgress.examsTaken !== progress.examsTaken ||
          nextProgress.bestScore !== progress.bestScore ||
          nextProgress.lastScore !== progress.lastScore
        ) {
          setProgress(nextProgress);
        }
      }
    }

    return (
      <section className="rounded-xl border bg-white p-5 text-black shadow-sm">
        <h2 className="text-lg font-extrabold">Results</h2>
        <p className="mt-1 text-sm text-black/70">
          Score: <span className="font-bold text-black">{score.correct}/{score.total} ({percent}%)</span>
        </p>
        <p className="mt-1 text-sm text-black/70">
          Best score: <span className="font-bold text-black">{Math.max(progress.bestScore, percent)}%</span>
        </p>

        <div className="mt-4 grid gap-3">
          {questions.map((q) => {
            const pickedId = answers[q.id] ?? null;
            const ok = pickedId === q.correctChoiceId;
            const selected = q.choices.find((c) => c.id === pickedId);
            const correct = q.choices.find((c) => c.id === q.correctChoiceId);

            return (
              <div key={q.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-black">{q.prompt}</div>
                    {q.reference ? <div className="mt-1 text-xs text-black/60">{q.reference}</div> : null}
                  </div>
                  <div className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {ok ? "Correct" : "Missed"}
                  </div>
                </div>

                <div className="mt-2 text-xs text-black/70">
                  Your answer: <span className="font-semibold text-black">{selected?.text ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-black/70">
                  Correct answer: <span className="font-semibold text-black">{correct?.text ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="mizo-btn mt-5" onClick={() => reset()}>
          Start over
        </button>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="rounded-xl border bg-white p-5 text-black shadow-sm">
        <h2 className="text-lg font-extrabold">Simulator error</h2>
        <button className="mizo-btn mt-4" onClick={() => reset()}>
          Reset
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-5 text-black shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-black/60">
            Question {index + 1} of {questions.length}
          </div>
          <h2 className="mt-1 text-lg font-extrabold">
            {mode === "journeyman" ? "Journeyman Mock Exam" : mode === "exam" ? "Timed Exam" : "Simulation"}
          </h2>
          <div className="mt-1 text-xs text-black/60">
            Topic: {TOPICS.find((t) => t.id === topic)?.label}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === "exam" || mode === "journeyman" ? (
            <div className="rounded border border-black bg-yellow-50 px-3 py-2 text-xs font-bold text-black">
              Time left: {formatClock(secondsLeft)}
            </div>
          ) : null}
          <button
            className="rounded border border-black bg-white px-3 py-2 text-xs font-bold text-black"
            onClick={() => reset()}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4 text-base font-semibold text-black">{current.prompt}</div>
      {current.reference ? <div className="mt-1 text-xs text-black/60">{current.reference}</div> : null}

      <div className="mt-4 grid gap-2">
        {current.choices.map((c) => {
          const isPicked = picked === c.id;
          const showExplanation = isPicked && mode === "practice";

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className={`rounded-lg border border-gray-300 px-3 py-3 text-left text-sm font-semibold text-black transition ${
                isPicked ? "border-black bg-yellow-50" : "bg-white hover:bg-gray-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded border border-gray-400 text-xs font-extrabold text-black">
                  {c.id.toUpperCase()}
                </span>
                <span className="flex-1 text-black">{c.text}</span>
              </div>

              {showExplanation ? (
                <div className="mt-2 text-xs font-medium text-black/70">{c.explanation}</div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded border border-black bg-white px-3 py-2 text-sm font-bold text-black disabled:opacity-50"
          onClick={prev}
          disabled={index === 0}
        >
          Back
        </button>
        <button
          className="rounded border border-black bg-white px-3 py-2 text-sm font-bold text-black disabled:opacity-50"
          onClick={next}
          disabled={index === questions.length - 1}
        >
          Next
        </button>
        <button
          className="mizo-btn disabled:opacity-50"
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}
        >
          Submit
        </button>

        <div className="ml-auto text-xs font-semibold text-black/70">
          Answered {Object.keys(answers).length}/{questions.length}
        </div>
      </div>
    </section>
  );
}
