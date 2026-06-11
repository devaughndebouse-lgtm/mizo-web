"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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


type TrackId = "journeyman" | "master";

type SimulatorProps = {
  initialTrack?: TrackId;
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
const MOCK_SECONDS = 4 * 60 * 60;
const MOCK_QUESTION_COUNT = 80;
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

const standardOcpdRatings = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175,
  200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800,
] as const;

function roundTo(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(roundTo(value));
}

function nextStandardRating(amps: number) {
  return standardOcpdRatings.find((rating) => rating >= amps) ?? standardOcpdRatings[standardOcpdRatings.length - 1];
}

const journeymanLookupItems = [
  ["definitions", "Which NEC article contains definitions used throughout the Code?", "Article 100", "Article 90", "Article 110", "Article 250", "NEC Article 100"],
  ["definitions", "Which NEC article covers general requirements for electrical installations?", "Article 110", "Article 90", "Article 210", "Article 300", "NEC Article 110"],
  ["definitions", "Which NEC article covers branch circuits?", "Article 210", "Article 215", "Article 220", "Article 230", "NEC Article 210"],
  ["definitions", "Which NEC article covers feeders?", "Article 215", "Article 210", "Article 230", "Article 250", "NEC Article 215"],
  ["definitions", "Which NEC article covers branch-circuit, feeder, and service load calculations?", "Article 220", "Article 200", "Article 240", "Article 300", "NEC Article 220"],
  ["grounding", "Which NEC article is the main grounding and bonding article?", "Article 250", "Article 210", "Article 300", "Article 430", "NEC Article 250"],
  ["grounding", "Which NEC table is commonly used to size equipment grounding conductors by overcurrent device rating?", "Table 250.122", "Table 310.16", "Table 430.250", "Table 300.5", "NEC Table 250.122"],
  ["motors", "Which NEC article covers motors, motor circuits, and controllers?", "Article 430", "Article 210", "Article 250", "Article 690", "NEC Article 430"],
  ["motors", "Which NEC table is commonly used for full-load current values of single-phase AC motors?", "Table 430.248", "Table 310.16", "Table 240.6(A)", "Chapter 9 Table 1", "NEC Table 430.248"],
  ["motors", "Which NEC table is commonly used for full-load current values of three-phase AC motors?", "Table 430.250", "Table 310.16", "Table 250.122", "Table 300.5", "NEC Table 430.250"],
  ["conduit", "Which NEC chapter contains raceway fill tables and notes?", "Chapter 9", "Chapter 1", "Chapter 5", "Chapter 8", "NEC Chapter 9"],
  ["conduit", "For more than two conductors in a raceway, what fill percentage is generally used?", "40%", "31%", "53%", "60%", "NEC Chapter 9 Table 1"],
  ["voltage_drop", "What formula is used to find voltage-drop percentage?", "Voltage drop ÷ circuit voltage × 100", "Circuit voltage ÷ voltage drop", "Amps ÷ volts × 100", "Watts ÷ amps", "Voltage drop formula"],
  ["calculations", "What formula gives single-phase apparent power in volt-amperes?", "Volts × amps", "Volts ÷ amps", "Amps ÷ volts", "Volts × ohms", "VA = V × I"],
  ["calculations", "What multiplier is commonly applied to continuous loads for conductor sizing?", "125%", "80%", "100%", "150%", "Continuous-load sizing"],
] as const;

const JOURNEYMAN_LOOKUP_QUESTIONS: Question[] = Array.from({ length: 60 }, (_, index) => {
  const item = journeymanLookupItems[index % journeymanLookupItems.length];
  const [topic, prompt, correct, wrong1, wrong2, wrong3, reference] = item;

  return {
    id: `j-look-${index + 1}`,
    topic,
    prompt,
    reference,
    correctChoiceId: "a",
    choices: [
      { id: "a", text: correct, explanation: `Correct. ${reference} is the right reference for this question.` },
      { id: "b", text: wrong1, explanation: "That reference does not best match this question." },
      { id: "c", text: wrong2, explanation: "That reference covers a different topic." },
      { id: "d", text: wrong3, explanation: "That is not the best answer here." },
    ],
  };
});

const journeymanOhmsLawPairs = [
  [120, 6], [120, 8], [120, 12], [120, 16], [120, 20], [120, 24],
  [208, 10], [208, 12], [208, 15], [208, 18], [208, 20], [208, 24],
  [240, 8], [240, 10], [240, 12], [240, 15], [240, 18], [240, 20],
  [277, 5], [277, 8], [277, 10], [277, 12], [277, 15], [277, 18],
  [480, 5], [480, 8], [480, 10], [480, 12], [480, 15], [480, 20],
] as const;

const JOURNEYMAN_OHMS_LAW_QUESTIONS: Question[] = Array.from({ length: 60 }, (_, index) => {
  const [voltage, amps] = journeymanOhmsLawPairs[index % journeymanOhmsLawPairs.length];
  const correct = voltage * amps;

  return {
    id: `j-ohms-${index + 1}`,
    topic: "calculations",
    prompt: `A ${voltage}V circuit carries ${amps}A. What is the apparent power?`,
    reference: "VA = volts × amperes",
    correctChoiceId: "c",
    choices: [
      { id: "a", text: `${correct / 2} VA`, explanation: "That is half of the calculated value." },
      { id: "b", text: `${voltage + amps} VA`, explanation: "That adds voltage and current instead of multiplying." },
      { id: "c", text: `${correct} VA`, explanation: `Correct. ${voltage} × ${amps} = ${correct} VA.` },
      { id: "d", text: `${correct * 2} VA`, explanation: "That is double the calculated value." },
    ],
  };
});

const continuousLoads = [
  12, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 42, 44, 48, 50, 52,
  56, 60, 64, 68, 72, 75, 80,
] as const;

const JOURNEYMAN_CONTINUOUS_LOAD_QUESTIONS: Question[] = Array.from({ length: 50 }, (_, index) => {
  const load = continuousLoads[index % continuousLoads.length];
  const correct = roundTo(load * 1.25, 2);

  return {
    id: `j-cont-${index + 1}`,
    topic: "calculations",
    prompt: `A branch circuit has a continuous load of ${load}A. What minimum ampacity is required before other corrections or adjustments?`,
    reference: "Continuous-load sizing concept",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: `${load}A`, explanation: "Continuous loads are not sized at only 100% in this question." },
      { id: "b", text: `${formatNumber(correct)}A`, explanation: `Correct. ${load}A × 125% = ${formatNumber(correct)}A.` },
      { id: "c", text: `${formatNumber(roundTo(load * 1.1, 2))}A`, explanation: "That uses too small a multiplier." },
      { id: "d", text: `${formatNumber(roundTo(load * 1.5, 2))}A`, explanation: "That is above the required 125% value." },
    ],
  };
});

const journeymanVoltageDropPairs = [
  [120, 2.4], [120, 3.6], [120, 4.8], [208, 4.16], [208, 5.2],
  [208, 6.24], [240, 4.8], [240, 6], [240, 7.2], [277, 5.54],
  [277, 6.93], [277, 8.31], [480, 9.6], [480, 12], [480, 14.4],
  [600, 12], [600, 15], [600, 18], [120, 6], [240, 9.6],
] as const;

const JOURNEYMAN_VOLTAGE_DROP_PRACTICE: Question[] = Array.from({ length: 50 }, (_, index) => {
  const [voltage, drop] = journeymanVoltageDropPairs[index % journeymanVoltageDropPairs.length];
  const correct = roundTo((drop / voltage) * 100, 2);

  return {
    id: `j-vdrop-${index + 1}`,
    topic: "voltage_drop",
    prompt: `A ${voltage}V circuit has a ${drop}V drop. What is the voltage-drop percentage?`,
    reference: "Voltage drop ÷ circuit voltage × 100",
    correctChoiceId: "d",
    choices: [
      { id: "a", text: `${formatNumber(roundTo(correct / 2, 2))}%`, explanation: "That is too low." },
      { id: "b", text: `${formatNumber(roundTo(correct + 1, 2))}%`, explanation: "That is too high." },
      { id: "c", text: `${formatNumber(roundTo(correct * 2, 2))}%`, explanation: "That doubles the correct percentage." },
      { id: "d", text: `${formatNumber(correct)}%`, explanation: `Correct. ${drop} ÷ ${voltage} × 100 = ${formatNumber(correct)}%.` },
    ],
  };
});

const journeymanMotorFlaValues = [
  6, 7.6, 9.6, 11, 14, 17, 21, 22, 27, 28, 34, 40, 42, 52, 65, 77, 96, 124,
  156, 180, 240, 302, 361, 414, 477,
] as const;

const JOURNEYMAN_MOTOR_CONDUCTOR_QUESTIONS: Question[] = Array.from({ length: 50 }, (_, index) => {
  const fla = journeymanMotorFlaValues[index % journeymanMotorFlaValues.length];
  const correct = roundTo(fla * 1.25, 2);

  return {
    id: `j-motor-cond-${index + 1}`,
    topic: "motors",
    prompt: `For this practice question, a single motor has an FLC of ${fla}A. What conductor ampacity is required at 125% of motor FLC?`,
    reference: "NEC 430.22 motor conductor concept",
    correctChoiceId: "a",
    choices: [
      { id: "a", text: `${formatNumber(correct)}A`, explanation: `Correct. ${fla}A × 125% = ${formatNumber(correct)}A.` },
      { id: "b", text: `${formatNumber(fla)}A`, explanation: "That uses only 100% of motor FLC." },
      { id: "c", text: `${formatNumber(roundTo(fla * 1.15, 2))}A`, explanation: "That uses too small a multiplier." },
      { id: "d", text: `${formatNumber(roundTo(fla * 1.5, 2))}A`, explanation: "That is above the 125% value asked for here." },
    ],
  };
});

const journeymanBoxFillPairs = [
  [1, 4], [1, 5], [1, 6], [2, 4], [2, 5], [2, 6], [2, 7], [3, 5],
  [3, 6], [3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 8], [5, 9],
  [6, 8], [6, 10], [7, 10], [8, 12],
] as const;

const JOURNEYMAN_BOX_FILL_PRACTICE: Question[] = Array.from({ length: 40 }, (_, index) => {
  const [deviceYokes, conductors] = journeymanBoxFillPairs[index % journeymanBoxFillPairs.length];
  const correct = deviceYokes * 2 + conductors;

  return {
    id: `j-box-${index + 1}`,
    topic: "calculations",
    prompt: `A box has ${deviceYokes} device yoke(s) and ${conductors} insulated conductors. Ignoring fittings and grounds for this practice question, how many conductor-volume allowances are required?`,
    reference: "NEC 314.16 box-fill concept",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: `${deviceYokes + conductors}`, explanation: "That counts each device yoke as one allowance instead of two." },
      { id: "b", text: `${correct}`, explanation: `Correct. ${deviceYokes} yoke(s) × 2 plus ${conductors} conductors = ${correct}.` },
      { id: "c", text: `${correct + 2}`, explanation: "That adds extra allowances not stated in the question." },
      { id: "d", text: `${conductors * 2}`, explanation: "That doubles only the conductor count." },
    ],
  };
});

const journeymanConduitScenarios = [
  [1, "53%"], [2, "31%"], [3, "40%"], [4, "40%"], [5, "40%"], [6, "40%"],
  [7, "40%"], [8, "40%"], [9, "40%"], [10, "40%"],
] as const;

const JOURNEYMAN_CONDUIT_FILL_PRACTICE: Question[] = Array.from({ length: 40 }, (_, index) => {
  const [count, correct] = journeymanConduitScenarios[index % journeymanConduitScenarios.length];

  return {
    id: `j-conduit-fill-${index + 1}`,
    topic: "conduit",
    prompt: `Using NEC Chapter 9 Table 1 concepts, what maximum raceway fill percentage generally applies when a raceway contains ${count} conductor(s)?`,
    reference: "NEC Chapter 9 Table 1",
    correctChoiceId: "c",
    choices: [
      { id: "a", text: "25%", explanation: "That is not the general Chapter 9 Table 1 value for this conductor count." },
      { id: "b", text: "60%", explanation: "That is not the general Chapter 9 Table 1 fill limit." },
      { id: "c", text: correct, explanation: `Correct for this conductor count under the Chapter 9 Table 1 concept.` },
      { id: "d", text: "75%", explanation: "That is too high for the general raceway fill limit." },
    ],
  };
});

const JOURNEYMAN_EXPANDED_QUESTIONS: Question[] = [
  ...JOURNEYMAN_LOOKUP_QUESTIONS,
  ...JOURNEYMAN_OHMS_LAW_QUESTIONS,
  ...JOURNEYMAN_CONTINUOUS_LOAD_QUESTIONS,
  ...JOURNEYMAN_VOLTAGE_DROP_PRACTICE,
  ...JOURNEYMAN_MOTOR_CONDUCTOR_QUESTIONS,
  ...JOURNEYMAN_BOX_FILL_PRACTICE,
  ...JOURNEYMAN_CONDUIT_FILL_PRACTICE,
];

const JOURNEYMAN_QUESTIONS: Question[] = [
  ...DEFINITION_QUESTIONS,
  ...GROUNDING_QUESTIONS,
  ...MOTOR_QUESTIONS,
  ...CONDUIT_QUESTIONS,
  ...VOLTAGE_DROP_QUESTIONS,
  ...CALCULATION_QUESTIONS,
  ...EXTENDED_CALCULATION_QUESTIONS,
  ...JOURNEYMAN_EXPANDED_QUESTIONS,
].slice(0, 500);

const MASTER_DEFINITION_QUESTIONS: Question[] = [
  {
    id: "mdef-1",
    topic: "definitions",
    prompt: "Which answer best describes a separately derived system in NEC usage?",
    correctChoiceId: "b",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "Any system supplied by a feeder", explanation: "Too broad." },
      { id: "b", text: "A premises wiring system whose power is derived from a source other than a service, and that has no direct electrical connection to another supply conductors except through grounding and bonding connections", explanation: "Correct." },
      { id: "c", text: "Any branch circuit over 150 volts", explanation: "Incorrect." },
      { id: "d", text: "Only a utility-owned transformer system", explanation: "Incorrect." },
    ],
  },
  {
    id: "mdef-2",
    topic: "definitions",
    prompt: "Which answer best describes service conductors in NEC terminology?",
    correctChoiceId: "c",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "All conductors after the final overcurrent device", explanation: "That describes branch-circuit conductors in part, not service conductors." },
      { id: "b", text: "Only grounded conductors on the line side of disconnects", explanation: "Too narrow." },
      { id: "c", text: "The conductors from the service point to the service disconnecting means", explanation: "Correct." },
      { id: "d", text: "Any conductors installed in service raceway", explanation: "Too broad." },
    ],
  },
  {
    id: "mdef-3",
    topic: "definitions",
    prompt: "On master-level exams, which NEC article is most central to branch-circuit, feeder, and service load calculations?",
    correctChoiceId: "d",
    reference: "NEC Article 220",
    choices: [
      { id: "a", text: "Article 250", explanation: "Grounding and bonding article." },
      { id: "b", text: "Article 300", explanation: "Wiring methods article." },
      { id: "c", text: "Article 430", explanation: "Motor article." },
      { id: "d", text: "Article 220", explanation: "Correct." },
    ],
  },
  {
    id: "mdef-4",
    topic: "definitions",
    prompt: "Which NEC article is the main starting point for service conductors, service equipment, and service disconnecting means?",
    correctChoiceId: "a",
    reference: "NEC Article 230",
    choices: [
      { id: "a", text: "Article 230", explanation: "Correct." },
      { id: "b", text: "Article 240", explanation: "Overcurrent protection article." },
      { id: "c", text: "Article 250", explanation: "Grounding and bonding article." },
      { id: "d", text: "Article 300", explanation: "General wiring methods article." },
    ],
  },
  {
    id: "mdef-5",
    topic: "definitions",
    prompt: "Which answer best describes an overcurrent protective device in NEC usage?",
    correctChoiceId: "d",
    reference: "NEC Article 100",
    choices: [
      { id: "a", text: "A device used only for motor overload protection", explanation: "Too narrow." },
      { id: "b", text: "A disconnect that never opens automatically", explanation: "Incorrect." },
      { id: "c", text: "Any controller installed ahead of a feeder", explanation: "Too broad." },
      { id: "d", text: "A device capable of providing protection for service, feeder, and branch-circuit conductors and equipment over the full range of overcurrents between its rated current and its interrupting rating", explanation: "Correct." },
    ],
  },
  {
    id: "mdef-6",
    topic: "definitions",
    prompt: "On a master exam, which article is most associated with feeder requirements?",
    correctChoiceId: "b",
    reference: "NEC Article 215",
    choices: [
      { id: "a", text: "Article 210", explanation: "Branch circuits." },
      { id: "b", text: "Article 215", explanation: "Correct." },
      { id: "c", text: "Article 220", explanation: "Load calculations article." },
      { id: "d", text: "Article 430", explanation: "Motors." },
    ],
  },
];

const MASTER_GROUNDING_QUESTIONS: Question[] = [
  {
    id: "mgnd-1",
    topic: "grounding",
    prompt: "Which NEC article becomes especially important when sizing grounding electrode conductors and bonding service equipment?",
    correctChoiceId: "a",
    reference: "NEC Article 250",
    choices: [
      { id: "a", text: "Article 250", explanation: "Correct." },
      { id: "b", text: "Article 210", explanation: "Branch circuits." },
      { id: "c", text: "Article 230", explanation: "Service rules, but not the main grounding and bonding article." },
      { id: "d", text: "Article 430", explanation: "Motors." },
    ],
  },
  {
    id: "mgnd-2",
    topic: "grounding",
    prompt: "Why is grounding and bonding a major master electrician exam topic?",
    correctChoiceId: "c",
    reference: "NEC 250",
    choices: [
      { id: "a", text: "Because it only applies to residential systems", explanation: "Incorrect." },
      { id: "b", text: "Because it replaces overcurrent protection", explanation: "Incorrect." },
      { id: "c", text: "Because it requires understanding fault-current paths, service bonding, and electrode systems in greater detail", explanation: "Correct." },
      { id: "d", text: "Because it eliminates conductor sizing", explanation: "Incorrect." },
    ],
  },
  {
    id: "mgnd-3",
    topic: "grounding",
    prompt: "At a service, which location is the normal bonding point for the grounded conductor and equipment grounding/bonding path?",
    correctChoiceId: "b",
    reference: "NEC 250.24",
    choices: [
      { id: "a", text: "At every downstream panelboard", explanation: "Incorrect." },
      { id: "b", text: "At the service disconnecting means", explanation: "Correct." },
      { id: "c", text: "At the first receptacle outlet", explanation: "Incorrect." },
      { id: "d", text: "Only at the utility transformer", explanation: "Incorrect." },
    ],
  },
  {
    id: "mgnd-4",
    topic: "grounding",
    prompt: "What is the main reason master-level grounding questions are often harder than journeyman-level grounding questions?",
    correctChoiceId: "c",
    reference: "NEC Article 250",
    choices: [
      { id: "a", text: "Because grounding no longer depends on code references", explanation: "Incorrect." },
      { id: "b", text: "Because only utility systems are tested", explanation: "Incorrect." },
      { id: "c", text: "Because they often require applying multiple bonding and grounding rules together across services, feeders, and separately derived systems", explanation: "Correct." },
      { id: "d", text: "Because equipment grounding conductors replace overcurrent devices", explanation: "Incorrect." },
    ],
  },
  {
    id: "mgnd-5",
    topic: "grounding",
    prompt: "Which NEC section is commonly associated with grounding electrode conductor sizing by conductor size concepts on master-level exams?",
    correctChoiceId: "a",
    reference: "NEC 250.66",
    choices: [
      { id: "a", text: "250.66", explanation: "Correct." },
      { id: "b", text: "250.122", explanation: "Equipment grounding conductor sizing." },
      { id: "c", text: "210.19", explanation: "Branch-circuit conductor sizing." },
      { id: "d", text: "430.22", explanation: "Motor conductor sizing." },
    ],
  },
  {
    id: "mgnd-6",
    topic: "grounding",
    prompt: "At a separately derived system, what is one major grounding and bonding concept commonly tested at the master level?",
    correctChoiceId: "b",
    reference: "NEC 250.30",
    choices: [
      { id: "a", text: "That grounding is never required", explanation: "Incorrect." },
      { id: "b", text: "That the bonding and grounding connections must be evaluated under separately derived system rules rather than standard service rules alone", explanation: "Correct." },
      { id: "c", text: "That neutrals are always isolated from all bonding points everywhere", explanation: "Too broad and inaccurate." },
      { id: "d", text: "That equipment grounding conductors are optional", explanation: "Incorrect." },
    ],
  },
];

const MASTER_MOTOR_QUESTIONS: Question[] = [
  {
    id: "mmot-1",
    topic: "motors",
    prompt: "Which NEC table is commonly used to find full-load current values for 3-phase AC motors on master-level exams?",
    correctChoiceId: "c",
    reference: "NEC Table 430.250",
    choices: [
      { id: "a", text: "Table 240.6(A)", explanation: "Breaker ratings." },
      { id: "b", text: "Table 310.16", explanation: "Ampacity table." },
      { id: "c", text: "Table 430.250", explanation: "Correct." },
      { id: "d", text: "Chapter 9 Table 1", explanation: "Conduit fill." },
    ],
  },
  {
    id: "mmot-2",
    topic: "motors",
    prompt: "Why do master-level motor questions often require careful distinction between overload protection and short-circuit/ground-fault protection?",
    correctChoiceId: "a",
    reference: "NEC Article 430",
    choices: [
      { id: "a", text: "Because the NEC treats them as different protective functions with different sizing rules", explanation: "Correct." },
      { id: "b", text: "Because they are always sized the same", explanation: "Incorrect." },
      { id: "c", text: "Because overload protection replaces conductor sizing", explanation: "Incorrect." },
      { id: "d", text: "Because motors never need branch-circuit protection", explanation: "Incorrect." },
    ],
  },
  {
    id: "mmot-3",
    topic: "motors",
    prompt: "Which NEC article is the primary source for motor branch-circuit conductors, short-circuit protection, and overload protection rules?",
    correctChoiceId: "d",
    reference: "NEC Article 430",
    choices: [
      { id: "a", text: "Article 250", explanation: "Grounding and bonding." },
      { id: "b", text: "Article 300", explanation: "General wiring methods." },
      { id: "c", text: "Article 310", explanation: "General conductor ampacity rules." },
      { id: "d", text: "Article 430", explanation: "Correct." },
    ],
  },
  {
    id: "mmot-4",
    topic: "motors",
    prompt: "Why are motor questions often considered master-level exam material?",
    correctChoiceId: "a",
    reference: "NEC Article 430",
    choices: [
      { id: "a", text: "Because they often require multiple-step coordination of conductor sizing, overload protection, short-circuit protection, and disconnect rules", explanation: "Correct." },
      { id: "b", text: "Because motor questions never involve calculations", explanation: "Incorrect." },
      { id: "c", text: "Because motors use feeder rules only", explanation: "Incorrect." },
      { id: "d", text: "Because disconnects are not required for motors", explanation: "Incorrect." },
    ],
  },
  {
    id: "mmot-5",
    topic: "motors",
    prompt: "Which table is typically used for three-phase motor full-load current values when the nameplate current is not the sizing basis for a question?",
    correctChoiceId: "b",
    reference: "NEC Table 430.250",
    choices: [
      { id: "a", text: "Table 310.16", explanation: "General ampacity table." },
      { id: "b", text: "Table 430.250", explanation: "Correct." },
      { id: "c", text: "Table 240.6(A)", explanation: "Standard overcurrent device ratings." },
      { id: "d", text: "Chapter 9 Table 1", explanation: "Conduit fill." },
    ],
  },
];

const MASTER_CONDUIT_QUESTIONS: Question[] = [
  {
    id: "mcon-1",
    topic: "conduit",
    prompt: "For more than two conductors in a raceway, what maximum fill percentage is generally used from NEC Chapter 9, Table 1?",
    correctChoiceId: "d",
    reference: "NEC Chapter 9 Table 1",
    choices: [
      { id: "a", text: "31%", explanation: "That applies to exactly two conductors." },
      { id: "b", text: "35%", explanation: "Incorrect." },
      { id: "c", text: "53%", explanation: "That applies to a single conductor." },
      { id: "d", text: "40%", explanation: "Correct." },
    ],
  },
  {
    id: "mcon-2",
    topic: "conduit",
    prompt: "Why do conduit-fill questions remain important on master electrician exams?",
    correctChoiceId: "b",
    reference: "NEC Chapter 9",
    choices: [
      { id: "a", text: "Because raceway fill is no longer tied to code rules", explanation: "Incorrect." },
      { id: "b", text: "Because they test code navigation, table use, and practical installation limits", explanation: "Correct." },
      { id: "c", text: "Because raceway fill only matters for motors", explanation: "Incorrect." },
      { id: "d", text: "Because all raceways are always filled to 53%", explanation: "Incorrect." },
    ],
  },
  {
    id: "mcon-3",
    topic: "conduit",
    prompt: "Which NEC chapter is most often referenced for conduit and tubing fill tables on master-level exam questions?",
    correctChoiceId: "c",
    reference: "NEC Chapter 9",
    choices: [
      { id: "a", text: "Chapter 1", explanation: "General rules only." },
      { id: "b", text: "Chapter 3", explanation: "Wiring methods, but fill tables are commonly in Chapter 9." },
      { id: "c", text: "Chapter 9", explanation: "Correct." },
      { id: "d", text: "Annex D only", explanation: "Annex D is helpful but not the primary chapter for fill tables." },
    ],
  },
  {
    id: "mcon-4",
    topic: "conduit",
    prompt: "Why do master-level conduit-fill questions often require careful table navigation?",
    correctChoiceId: "a",
    reference: "NEC Chapter 9 and Annex C",
    choices: [
      { id: "a", text: "Because they may require moving between fill percentages, conductor dimensions, and raceway dimensions instead of relying on a single table", explanation: "Correct." },
      { id: "b", text: "Because all raceways use the same fill area", explanation: "Incorrect." },
      { id: "c", text: "Because fill rules are based only on voltage", explanation: "Incorrect." },
      { id: "d", text: "Because conductor count never affects conduit size", explanation: "Incorrect." },
    ],
  },
  {
    id: "mcon-5",
    topic: "conduit",
    prompt: "On tougher raceway questions, what is often being tested beyond simple memorization of percentages?",
    correctChoiceId: "d",
    reference: "NEC Chapter 9",
    choices: [
      { id: "a", text: "Only the name of the raceway", explanation: "Too narrow." },
      { id: "b", text: "Only conductor color identification", explanation: "Incorrect." },
      { id: "c", text: "Only overcurrent device sizing", explanation: "Incorrect." },
      { id: "d", text: "The ability to navigate multiple tables and apply conductor count and raceway dimensions correctly", explanation: "Correct." },
    ],
  },
];

const MASTER_VOLTAGE_DROP_QUESTIONS: Question[] = [
  {
    id: "mvd-1",
    topic: "voltage_drop",
    prompt: "A 480V feeder has a calculated drop of 9.6V. What is the percentage voltage drop?",
    correctChoiceId: "a",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "2%", explanation: "Correct. 9.6 ÷ 480 = 0.02 = 2%." },
      { id: "b", text: "2.5%", explanation: "Too high." },
      { id: "c", text: "3%", explanation: "Too high." },
      { id: "d", text: "4%", explanation: "Too high." },
    ],
  },
  {
    id: "mvd-2",
    topic: "voltage_drop",
    prompt: "A 208V branch circuit has a 5.2V drop. What is the approximate percentage voltage drop?",
    correctChoiceId: "c",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "1.5%", explanation: "Too low." },
      { id: "b", text: "2%", explanation: "Too low." },
      { id: "c", text: "2.5%", explanation: "Correct. 5.2 ÷ 208 = 0.025 = 2.5%." },
      { id: "d", text: "3.5%", explanation: "Too high." },
    ],
  },
  {
    id: "mvd-3",
    topic: "voltage_drop",
    prompt: "A 240V feeder has a 4.8V drop. What is the percentage voltage drop?",
    correctChoiceId: "a",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "2%", explanation: "Correct. 4.8 ÷ 240 = 0.02 = 2%." },
      { id: "b", text: "2.5%", explanation: "Too high." },
      { id: "c", text: "3%", explanation: "Too high." },
      { id: "d", text: "4%", explanation: "Too high." },
    ],
  },
  {
    id: "mvd-4",
    topic: "voltage_drop",
    prompt: "A 600V circuit has a calculated drop of 18V. What is the percentage voltage drop?",
    correctChoiceId: "c",
    reference: "Voltage drop formula",
    choices: [
      { id: "a", text: "2%", explanation: "Too low." },
      { id: "b", text: "2.5%", explanation: "Too low." },
      { id: "c", text: "3%", explanation: "Correct. 18 ÷ 600 = 0.03 = 3%." },
      { id: "d", text: "4%", explanation: "Too high." },
    ],
  },
  {
    id: "mvd-5",
    topic: "voltage_drop",
    prompt: "Why are voltage-drop questions often included in master-level prep even when they may be advisory in some contexts?",
    correctChoiceId: "b",
    reference: "Voltage drop design concept",
    choices: [
      { id: "a", text: "Because they replace ampacity rules", explanation: "Incorrect." },
      { id: "b", text: "Because they test design judgment, arithmetic accuracy, and system-performance thinking", explanation: "Correct." },
      { id: "c", text: "Because voltage drop is only relevant to motors", explanation: "Incorrect." },
      { id: "d", text: "Because the NEC uses the same percentage for every application as a hard rule", explanation: "Incorrect." },
    ],
  },
];

const MASTER_CALCULATION_QUESTIONS: Question[] = [
  {
    id: "mcalc-1",
    topic: "calculations",
    prompt: "For a 277/480V, 3-phase, 4-wire wye service with a calculated load of 360A, what minimum standard ampere rating is permitted for the service disconnecting means?",
    correctChoiceId: "a",
    reference: "NEC 230.79 and 240.6(A)",
    choices: [
      { id: "a", text: "400A", explanation: "Correct. A 360A calculated load requires at least the next standard rating of 400A." },
      { id: "b", text: "350A", explanation: "Below the calculated load." },
      { id: "c", text: "450A", explanation: "Above the minimum required standard size." },
      { id: "d", text: "500A", explanation: "Above the minimum required standard size." },
    ],
  },
  {
    id: "mcalc-2",
    topic: "calculations",
    prompt: "A 225 kVA single-phase transformer is rated at 480V on the primary. What is the full-load primary current?",
    correctChoiceId: "b",
    reference: "Transformer current formula",
    choices: [
      { id: "a", text: "375A", explanation: "Too low." },
      { id: "b", text: "468.75A", explanation: "Correct. 225,000 ÷ 480 = 468.75A." },
      { id: "c", text: "500A", explanation: "Not the exact full-load current." },
      { id: "d", text: "562.5A", explanation: "Too high." },
    ],
  },
  {
    id: "mcalc-3",
    topic: "calculations",
    prompt: "If a feeder supplies a continuous load of 160A, what minimum ampacity must the feeder conductors have before any other adjustments or corrections?",
    correctChoiceId: "d",
    reference: "Continuous-load sizing concept",
    choices: [
      { id: "a", text: "160A", explanation: "Too low." },
      { id: "b", text: "180A", explanation: "Incorrect." },
      { id: "c", text: "190A", explanation: "Incorrect." },
      { id: "d", text: "200A", explanation: "Correct. 160A × 125% = 200A." },
    ],
  },
  {
    id: "mcalc-4",
    topic: "calculations",
    prompt: "Which NEC article is the main starting point for advanced service and feeder load calculations on master-level exams?",
    correctChoiceId: "c",
    reference: "NEC Article 220",
    choices: [
      { id: "a", text: "Article 210", explanation: "Branch circuits." },
      { id: "b", text: "Article 215", explanation: "Feeders, but not the main load-calculation article." },
      { id: "c", text: "Article 220", explanation: "Correct." },
      { id: "d", text: "Article 250", explanation: "Grounding and bonding." },
    ],
  },
  {
    id: "mcalc-5",
    topic: "calculations",
    prompt: "A 480V 3-phase system serves a 100A load for this question. Using the simplified formula VA = 1.732 × V × I, what is the approximate apparent power?",
    correctChoiceId: "b",
    reference: "Three-phase power formula",
    choices: [
      { id: "a", text: "48,000 VA", explanation: "That ignores the 1.732 factor." },
      { id: "b", text: "83,136 VA", explanation: "Correct. 1.732 × 480 × 100 = 83,136 VA." },
      { id: "c", text: "66,240 VA", explanation: "Incorrect." },
      { id: "d", text: "96,000 VA", explanation: "Incorrect." },
    ],
  },
  {
    id: "mcalc-6",
    topic: "calculations",
    prompt: "Why do master-level calculation questions often combine service size, demand factors, and standard overcurrent device ratings?",
    correctChoiceId: "c",
    reference: "Master exam calculation structure",
    choices: [
      { id: "a", text: "Because conductor ampacity rules no longer matter", explanation: "Incorrect." },
      { id: "b", text: "Because only residential loads are tested", explanation: "Incorrect." },
      { id: "c", text: "Because master exams emphasize multi-step code application instead of single-formula answers", explanation: "Correct." },
      { id: "d", text: "Because all service calculations are identical", explanation: "Incorrect." },
    ],
  },
  {
    id: "mcalc-7",
    topic: "calculations",
    prompt: "A continuous load is calculated at 240A. What minimum conductor ampacity is required before other corrections or adjustments?",
    correctChoiceId: "b",
    reference: "Continuous-load sizing concept",
    choices: [
      { id: "a", text: "240A", explanation: "Too low." },
      { id: "b", text: "300A", explanation: "Correct. 240 × 125% = 300A." },
      { id: "c", text: "280A", explanation: "Incorrect." },
      { id: "d", text: "320A", explanation: "Incorrect." },
    ],
  },
  {
    id: "mcalc-8",
    topic: "calculations",
    prompt: "A 112.5 kVA single-phase transformer is rated at 240V on one side. What is the full-load current on that side?",
    correctChoiceId: "d",
    reference: "Transformer current formula",
    choices: [
      { id: "a", text: "375A", explanation: "Too low." },
      { id: "b", text: "421.88A", explanation: "Too low." },
      { id: "c", text: "450A", explanation: "Not the exact calculated value." },
      { id: "d", text: "468.75A", explanation: "Correct. 112,500 ÷ 240 = 468.75A." },
    ],
  },
  {
    id: "mcalc-9",
    topic: "calculations",
    prompt: "A 480V 3-phase load draws 150A. Using VA = 1.732 × V × I, what is the approximate apparent power?",
    correctChoiceId: "a",
    reference: "Three-phase power formula",
    choices: [
      { id: "a", text: "124,704 VA", explanation: "Correct. 1.732 × 480 × 150 = 124,704 VA." },
      { id: "b", text: "108,000 VA", explanation: "That ignores the 1.732 factor." },
      { id: "c", text: "144,000 VA", explanation: "Incorrect." },
      { id: "d", text: "83,136 VA", explanation: "That is the result for 100A, not 150A." },
    ],
  },
  {
    id: "mcalc-10",
    topic: "calculations",
    prompt: "Why do master-level service and feeder problems often feel more difficult than journeyman-level calculation problems?",
    correctChoiceId: "c",
    reference: "Master exam calculation structure",
    choices: [
      { id: "a", text: "Because they never use standard ratings", explanation: "Incorrect." },
      { id: "b", text: "Because they avoid code references", explanation: "Incorrect." },
      { id: "c", text: "Because they often combine demand factors, continuous loads, standard ratings, and multiple NEC article references into one problem", explanation: "Correct." },
      { id: "d", text: "Because they are based only on memorization", explanation: "Incorrect." },
    ],
  },
  {
    id: "mcalc-11",
    topic: "calculations",
    prompt: "A feeder serves a noncontinuous load of 180A and a continuous load of 80A. What minimum ampacity is required before other corrections or adjustments?",
    correctChoiceId: "b",
    reference: "Continuous and noncontinuous load sizing concept",
    choices: [
      { id: "a", text: "260A", explanation: "That adds the loads without applying 125% to the continuous portion." },
      { id: "b", text: "280A", explanation: "Correct. 180A + (80A × 125%) = 180A + 100A = 280A." },
      { id: "c", text: "300A", explanation: "Too high." },
      { id: "d", text: "225A", explanation: "Too low." },
    ],
  },
];

const masterLookupItems = [
  ["definitions", "Which NEC article is the primary starting point for service conductors and service equipment?", "Article 230", "Article 210", "Article 250", "Article 430", "NEC Article 230"],
  ["definitions", "Which NEC article is central to branch-circuit, feeder, and service load calculations?", "Article 220", "Article 215", "Article 240", "Article 300", "NEC Article 220"],
  ["definitions", "Which NEC article covers overcurrent protection requirements?", "Article 240", "Article 210", "Article 250", "Article 680", "NEC Article 240"],
  ["grounding", "Which NEC section is commonly associated with grounding electrode conductor sizing?", "250.66", "250.122", "210.19", "430.52", "NEC 250.66"],
  ["grounding", "Which NEC section is commonly associated with equipment grounding conductor sizing?", "250.122", "250.66", "215.2", "220.42", "NEC 250.122"],
  ["grounding", "Which NEC section covers grounding separately derived systems?", "250.30", "250.24", "300.5", "430.32", "NEC 250.30"],
  ["motors", "Which NEC section is commonly associated with sizing motor branch-circuit conductors?", "430.22", "430.52", "250.122", "240.6(A)", "NEC 430.22"],
  ["motors", "Which NEC section is commonly associated with motor branch-circuit short-circuit and ground-fault protection?", "430.52", "430.22", "310.16", "220.55", "NEC 430.52"],
  ["motors", "Which table is commonly used for three-phase AC motor full-load current?", "Table 430.250", "Table 310.16", "Table 240.6(A)", "Table 250.122", "NEC Table 430.250"],
  ["conduit", "Which NEC chapter contains raceway fill tables?", "Chapter 9", "Chapter 2", "Chapter 5", "Chapter 8", "NEC Chapter 9"],
  ["conduit", "Which NEC table gives the general raceway fill percentages?", "Chapter 9 Table 1", "Table 250.122", "Table 310.16", "Table 430.250", "NEC Chapter 9 Table 1"],
  ["voltage_drop", "Which calculation best describes voltage-drop percentage?", "Voltage drop ÷ system voltage × 100", "System voltage ÷ voltage drop", "Amps × ohms only", "Watts ÷ volts", "Voltage drop design calculation"],
  ["calculations", "Which table lists standard ampere ratings for fuses and inverse time circuit breakers?", "240.6(A)", "310.16", "250.66", "430.250", "NEC 240.6(A)"],
  ["calculations", "Which formula is commonly used for 3-phase apparent power?", "1.732 × volts × amps", "Volts × amps only", "Volts ÷ amps", "Amps ÷ 1.732", "Three-phase VA formula"],
] as const;

const MASTER_LOOKUP_QUESTIONS: Question[] = Array.from({ length: 70 }, (_, index) => {
  const [topic, prompt, correct, wrong1, wrong2, wrong3, reference] = masterLookupItems[index % masterLookupItems.length];

  return {
    id: `m-look-${index + 1}`,
    topic,
    prompt,
    reference,
    correctChoiceId: "d",
    choices: [
      { id: "a", text: wrong1, explanation: "That reference points to a different rule family." },
      { id: "b", text: wrong2, explanation: "That is not the best reference for this prompt." },
      { id: "c", text: wrong3, explanation: "That topic is not the main rule tested here." },
      { id: "d", text: correct, explanation: `Correct. ${reference} is the best match.` },
    ],
  };
});

const masterThreePhasePairs = [
  [208, 100], [208, 125], [208, 150], [208, 175], [208, 200],
  [240, 100], [240, 125], [240, 150], [240, 175], [240, 200],
  [480, 100], [480, 125], [480, 150], [480, 175], [480, 200],
  [480, 225], [480, 250], [600, 100], [600, 150], [600, 200],
] as const;

const MASTER_THREE_PHASE_POWER_QUESTIONS: Question[] = Array.from({ length: 80 }, (_, index) => {
  const [voltage, amps] = masterThreePhasePairs[index % masterThreePhasePairs.length];
  const correct = Math.round(1.732 * voltage * amps);

  return {
    id: `m-3p-va-${index + 1}`,
    topic: "calculations",
    prompt: `A ${voltage}V, 3-phase load draws ${amps}A. Using VA = 1.732 × V × I, what is the approximate apparent power?`,
    reference: "Three-phase apparent power formula",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: `${voltage * amps} VA`, explanation: "That ignores the 1.732 three-phase factor." },
      { id: "b", text: `${correct} VA`, explanation: `Correct. 1.732 × ${voltage} × ${amps} = approximately ${correct} VA.` },
      { id: "c", text: `${Math.round(correct / 1.25)} VA`, explanation: "That is below the calculated three-phase VA." },
      { id: "d", text: `${Math.round(correct * 1.25)} VA`, explanation: "That is above the apparent power asked for here." },
    ],
  };
});

const masterSingleTransformerPairs = [
  [15, 120], [15, 240], [25, 120], [25, 240], [37.5, 240], [37.5, 480],
  [45, 240], [45, 480], [50, 240], [50, 480], [75, 240], [75, 480],
  [100, 240], [100, 480], [112.5, 240], [112.5, 480], [150, 240],
  [150, 480], [225, 480], [300, 480],
] as const;

const MASTER_SINGLE_PHASE_TRANSFORMER_QUESTIONS: Question[] = Array.from({ length: 60 }, (_, index) => {
  const [kva, voltage] = masterSingleTransformerPairs[index % masterSingleTransformerPairs.length];
  const correct = roundTo((kva * 1000) / voltage, 2);

  return {
    id: `m-1p-xfmr-${index + 1}`,
    topic: "calculations",
    prompt: `A single-phase transformer is rated ${kva} kVA at ${voltage}V on one side. What is the full-load current on that side?`,
    reference: "Single-phase transformer current formula",
    correctChoiceId: "a",
    choices: [
      { id: "a", text: `${formatNumber(correct)}A`, explanation: `Correct. ${kva} kVA × 1000 ÷ ${voltage}V = ${formatNumber(correct)}A.` },
      { id: "b", text: `${formatNumber(roundTo(correct / 2, 2))}A`, explanation: "That is half of the calculated current." },
      { id: "c", text: `${formatNumber(roundTo(correct * 1.25, 2))}A`, explanation: "That adds 125%, which was not asked for." },
      { id: "d", text: `${formatNumber(roundTo(correct * 2, 2))}A`, explanation: "That doubles the calculated current." },
    ],
  };
});

const masterThreeTransformerPairs = [
  [30, 208], [45, 208], [75, 208], [112.5, 208], [150, 208],
  [30, 480], [45, 480], [75, 480], [112.5, 480], [150, 480],
  [225, 480], [300, 480], [500, 480], [75, 600], [150, 600],
] as const;

const MASTER_THREE_PHASE_TRANSFORMER_QUESTIONS: Question[] = Array.from({ length: 60 }, (_, index) => {
  const [kva, voltage] = masterThreeTransformerPairs[index % masterThreeTransformerPairs.length];
  const correct = roundTo((kva * 1000) / (1.732 * voltage), 2);

  return {
    id: `m-3p-xfmr-${index + 1}`,
    topic: "calculations",
    prompt: `A 3-phase transformer is rated ${kva} kVA at ${voltage}V. Using I = kVA × 1000 ÷ (1.732 × V), what is the full-load current?`,
    reference: "Three-phase transformer current formula",
    correctChoiceId: "c",
    choices: [
      { id: "a", text: `${formatNumber(roundTo((kva * 1000) / voltage, 2))}A`, explanation: "That ignores the 1.732 factor." },
      { id: "b", text: `${formatNumber(roundTo(correct / 2, 2))}A`, explanation: "That is too low." },
      { id: "c", text: `${formatNumber(correct)}A`, explanation: `Correct. ${kva} × 1000 ÷ (1.732 × ${voltage}) = ${formatNumber(correct)}A.` },
      { id: "d", text: `${formatNumber(roundTo(correct * 1.25, 2))}A`, explanation: "That adds 125%, which was not asked for." },
    ],
  };
});

const masterFeederLoadPairs = [
  [80, 40], [100, 50], [125, 60], [150, 75], [175, 80], [200, 100],
  [225, 100], [250, 125], [275, 150], [300, 150], [350, 175], [400, 200],
  [450, 225], [500, 250],
] as const;

const MASTER_FEEDER_LOAD_QUESTIONS: Question[] = Array.from({ length: 70 }, (_, index) => {
  const [noncontinuous, continuous] = masterFeederLoadPairs[index % masterFeederLoadPairs.length];
  const correct = roundTo(noncontinuous + continuous * 1.25, 2);

  return {
    id: `m-feeder-load-${index + 1}`,
    topic: "calculations",
    prompt: `A feeder supplies ${noncontinuous}A of noncontinuous load and ${continuous}A of continuous load. What minimum ampacity is required before other corrections or adjustments?`,
    reference: "Feeder continuous and noncontinuous load concept",
    correctChoiceId: "d",
    choices: [
      { id: "a", text: `${noncontinuous + continuous}A`, explanation: "That adds both loads at 100% and misses the continuous-load adder." },
      { id: "b", text: `${formatNumber(roundTo(noncontinuous * 1.25 + continuous, 2))}A`, explanation: "That applies 125% to the wrong load portion." },
      { id: "c", text: `${formatNumber(roundTo(correct * 1.1, 2))}A`, explanation: "That is above the calculated minimum." },
      { id: "d", text: `${formatNumber(correct)}A`, explanation: `Correct. ${noncontinuous}A + (${continuous}A × 125%) = ${formatNumber(correct)}A.` },
    ],
  };
});

const masterMotorProtectionPairs = [
  [18, 250], [24, 250], [32, 250], [42, 250], [52, 250], [65, 250],
  [78, 250], [96, 250], [124, 250], [156, 250], [180, 250], [240, 250],
  [302, 250], [361, 250], [414, 250],
] as const;

const MASTER_MOTOR_PROTECTION_QUESTIONS: Question[] = Array.from({ length: 60 }, (_, index) => {
  const [flc, multiplier] = masterMotorProtectionPairs[index % masterMotorProtectionPairs.length];
  const calculated = roundTo(flc * (multiplier / 100), 2);
  const standard = nextStandardRating(calculated);

  return {
    id: `m-motor-ocpd-${index + 1}`,
    topic: "motors",
    prompt: `For this practice problem, an inverse time breaker is sized at ${multiplier}% of a motor FLC of ${flc}A. What is the next standard OCPD rating at or above the calculated value?`,
    reference: "NEC 430.52 and 240.6(A) concept",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: `${formatNumber(calculated)}A`, explanation: "That is the calculated value before selecting a standard rating." },
      { id: "b", text: `${standard}A`, explanation: `Correct. ${flc}A × ${multiplier}% = ${formatNumber(calculated)}A, then use the next standard rating.` },
      { id: "c", text: `${nextStandardRating(flc)}A`, explanation: "That uses motor FLC instead of the percentage calculation." },
      { id: "d", text: `${nextStandardRating(calculated + 100)}A`, explanation: "That is higher than the next standard rating needed here." },
    ],
  };
});

const masterServiceLoads = [
  112, 128, 145, 168, 190, 215, 236, 260, 285, 315, 340, 360, 390, 420, 445,
  480, 520, 575, 625, 690, 760,
] as const;

const MASTER_SERVICE_RATING_QUESTIONS: Question[] = Array.from({ length: 62 }, (_, index) => {
  const load = masterServiceLoads[index % masterServiceLoads.length];
  const standard = nextStandardRating(load);

  return {
    id: `m-service-rating-${index + 1}`,
    topic: "calculations",
    prompt: `A service has a calculated load of ${load}A. Using standard ampere ratings, what is the minimum standard service disconnect rating at or above the load?`,
    reference: "NEC 230.79 and 240.6(A) concept",
    correctChoiceId: "a",
    choices: [
      { id: "a", text: `${standard}A`, explanation: `Correct. ${standard}A is the next standard rating at or above ${load}A.` },
      { id: "b", text: `${Math.max(15, standardOcpdRatings[Math.max(0, standardOcpdRatings.indexOf(standard as typeof standardOcpdRatings[number]) - 1)])}A`, explanation: "That rating is below the selected standard rating." },
      { id: "c", text: `${nextStandardRating(load + 75)}A`, explanation: "That is above the minimum standard rating." },
      { id: "d", text: `${load}A`, explanation: "The question asks for a standard ampere rating." },
    ],
  };
});

const MASTER_EXPANDED_QUESTIONS: Question[] = [
  ...MASTER_LOOKUP_QUESTIONS,
  ...MASTER_THREE_PHASE_POWER_QUESTIONS,
  ...MASTER_SINGLE_PHASE_TRANSFORMER_QUESTIONS,
  ...MASTER_THREE_PHASE_TRANSFORMER_QUESTIONS,
  ...MASTER_FEEDER_LOAD_QUESTIONS,
  ...MASTER_MOTOR_PROTECTION_QUESTIONS,
  ...MASTER_SERVICE_RATING_QUESTIONS,
];

const MASTER_QUESTIONS: Question[] = [
  ...MASTER_DEFINITION_QUESTIONS,
  ...MASTER_GROUNDING_QUESTIONS,
  ...MASTER_MOTOR_QUESTIONS,
  ...MASTER_CONDUIT_QUESTIONS,
  ...MASTER_VOLTAGE_DROP_QUESTIONS,
  ...MASTER_CALCULATION_QUESTIONS,
  ...MASTER_EXPANDED_QUESTIONS,
].slice(0, 500);

function shuffleArray<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function spreadByPrompt(items: Question[]) {
  const groups = new Map<string, Question[]>();

  for (const item of shuffleArray(items)) {
    const group = groups.get(item.prompt);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.prompt, [item]);
    }
  }

  const queues = shuffleArray([...groups.values()].map((group) => shuffleArray(group)));
  const out: Question[] = [];

  while (queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) out.push(next);
    }
  }

  return out;
}

function takeQuestion(queue: Question[], lastPrompt: string | null) {
  const preferredIndex = queue.findIndex((question) => question.prompt !== lastPrompt);
  const index = preferredIndex >= 0 ? preferredIndex : 0;
  const [question] = queue.splice(index, 1);
  return question;
}

function alternatingQuestionOrder(items: Question[]) {
  const topicQueues = TOPICS.map(({ id }) => ({
    topic: id,
    questions: spreadByPrompt(items.filter((question) => question.topic === id)),
  })).filter((queue) => queue.questions.length > 0);

  if (topicQueues.length <= 1) {
    return spreadByPrompt(items);
  }

  const out: Question[] = [];
  let cursor = 0;
  let lastTopic: TopicId | null = null;
  let lastPrompt: string | null = null;

  while (topicQueues.some((queue) => queue.questions.length > 0)) {
    let selectedIndex = -1;

    for (let offset = 0; offset < topicQueues.length; offset += 1) {
      const index = (cursor + offset) % topicQueues.length;
      const queue = topicQueues[index];
      if (queue.questions.length > 0 && queue.topic !== lastTopic) {
        selectedIndex = index;
        break;
      }
    }

    if (selectedIndex < 0) {
      selectedIndex = topicQueues.findIndex((queue) => queue.questions.length > 0);
    }

    const selectedQueue = topicQueues[selectedIndex];
    const next = takeQuestion(selectedQueue.questions, lastPrompt);
    if (!next) break;

    out.push(next);
    lastTopic = next.topic;
    lastPrompt = next.prompt;
    cursor = (selectedIndex + 1) % topicQueues.length;
  }

  return out;
}

function buildMockSet(source: Question[], count: number, suffix: string) {
  const base = alternatingQuestionOrder(source);
  const out: Question[] = [];

  while (out.length < count) {
    const template = base[out.length % base.length];
    out.push({
      ...template,
      id: `${template.id}-${suffix}-${out.length + 1}`,
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

export function Simulator({ initialTrack = "journeyman" }: SimulatorProps) {
  const [topic, setTopic] = useState<TopicId>("mixed");
  const [track, setTrack] = useState<TrackId>(initialTrack);
  const [mode, setMode] = useState<"practice" | "exam" | "mock">("practice");
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const savedResultKeyRef = useRef<string | null>(null);
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
    const questionBank = track === "master" ? MASTER_QUESTIONS : JOURNEYMAN_QUESTIONS;
    return topic === "mixed"
      ? questionBank
      : questionBank.filter((q) => q.topic === topic);
  }, [topic, track]);

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
  const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;

  const submitSession = useCallback(() => {
    if (submitted || !score.total) return;

    const resultKey = `${questions.map((q) => q.id).join("|")}:${score.correct}`;
    if (savedResultKeyRef.current !== resultKey) {
      savedResultKeyRef.current = resultKey;

      setProgress((prev) => {
        const nextProgress = {
          examsTaken: prev.examsTaken + 1,
          bestScore: Math.max(prev.bestScore, percent),
          lastScore: percent,
        };

        try {
          window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextProgress));
        } catch {
          // Progress is nice to have; the simulator should keep working if storage is unavailable.
        }

        return nextProgress;
      });
    }

    setSubmitted(true);
  }, [percent, questions, score.correct, score.total, submitted]);

  useEffect(() => {
    if (!started || submitted || (mode !== "exam" && mode !== "mock")) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          submitSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, submitted, mode, submitSession]);

  function reset(nextMode: typeof mode = mode) {
    setStarted(false);
    setSubmitted(false);
    setIndex(0);
    setAnswers({});
    setSessionQuestions([]);
    savedResultKeyRef.current = null;
    setSecondsLeft(nextMode === "mock" ? MOCK_SECONDS : EXAM_SECONDS);
  }

  function pick(choiceId: string) {
    if (!current || submitted) return;
    setAnswers((prev) => ({ ...prev, [current.id]: choiceId }));
  }

  function setTopicAndReset(nextTopic: TopicId) {
    setTopic(nextTopic);
    reset(mode);
  }

  function setTrackAndReset(nextTrack: TrackId) {
    setTrack(nextTrack);
    reset(mode);
  }

  function setModeAndReset(nextMode: typeof mode) {
    setMode(nextMode);
    reset(nextMode);
  }

  function beginSession() {
    const randomized =
      mode === "mock"
        ? buildMockSet(
            baseQuestions,
            MOCK_QUESTION_COUNT,
            track === "master" ? "mx" : "jx"
          )
        : alternatingQuestionOrder(baseQuestions);

    setSessionQuestions(randomized);
    setAnswers({});
    setSubmitted(false);
    setIndex(0);
    savedResultKeyRef.current = null;
    setSecondsLeft(mode === "mock" ? MOCK_SECONDS : EXAM_SECONDS);
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
            <label className="text-sm font-bold text-black">Track</label>
            <select
              className="mt-2 rounded border border-black px-3 py-2 text-sm text-black"
              value={track}
              onChange={(e) => setTrackAndReset(e.target.value as TrackId)}
            >
              <option value="journeyman">Journeyman</option>
              <option value="master">Master</option>
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
              <option value="mock">Mock Exam</option>
            </select>
          </div>
        </div>

        <h2 className="mt-5 text-lg font-extrabold">Exam Simulator</h2>
        <p className="mt-1 text-sm text-black/70">
          Topic filtering, track selection, timer mode, and NEC-style questions
          are now active.
        </p>

        <div className="mt-4 text-sm text-black/80">
          Questions: <span className="font-bold text-black">{mode === "mock" ? MOCK_QUESTION_COUNT : baseQuestions.length}</span>
          {mode === "exam" || mode === "mock" ? (
            <span className="ml-4">
              Timer: <span className="font-bold text-black">{formatClock(mode === "mock" ? MOCK_SECONDS : EXAM_SECONDS)}</span>
            </span>
          ) : null}
          <span className="ml-4">
            Track: <span className="font-bold text-black">{track === "master" ? "Master" : "Journeyman"}</span>
          </span>
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
          {mode === "mock"
            ? `Start ${track} mock exam`
            : mode === "exam"
              ? `Start ${track} timed exam`
              : `Start ${track} practice`}
        </button>
      </section>
    );
  }

  if (submitted) {
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
            {mode === "mock"
              ? `${track === "master" ? "Master" : "Journeyman"} Mock Exam`
              : mode === "exam"
                ? `${track === "master" ? "Master" : "Journeyman"} Timed Exam`
                : `${track === "master" ? "Master" : "Journeyman"} Practice`}
          </h2>
          <div className="mt-1 text-xs text-black/60">
            Topic: {TOPICS.find((t) => t.id === topic)?.label}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === "exam" || mode === "mock" ? (
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
