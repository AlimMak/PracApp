export const STORAGE_KEY = "interview-practice:api:v1";
export const MAX_ANSWER = 6000;
export const STEPS = [
  "quick",
  "example",
  "transfer",
  "followup",
  "review",
  "finished",
] as const;
export type Step = (typeof STEPS)[number];
export type Checks = [boolean, boolean];
export type Attempt = { answer: string; followup: string; checks: Checks };
export type LessonState = {
  version: 1;
  step: Step;
  quickAnswer: string;
  answer: string;
  followup: string;
  checks: Checks;
  attempts: Attempt[];
  trace: number;
};

export const FRESH_STATE: LessonState = {
  version: 1,
  step: "quick",
  quickAnswer: "",
  answer: "",
  followup: "",
  checks: [false, false],
  attempts: [],
  trace: 0,
};

export const SAMPLE_WEATHER = {
  city: "Austin",
  temperature: 78,
  unit: "F",
  condition: "Sunny",
} as const;

export const TRACE_STEPS = [
  {
    title: "Start with the app",
    caption:
      "You want Austin’s weather. Tap Check weather to see how the app asks for it.",
  },
  {
    title: "1. The app makes a request",
    caption:
      "The app sends GET /weather with city=Austin and units=F. The API defines how to ask.",
  },
  {
    title: "2. The service does the work",
    caption:
      "The weather service receives the request and prepares Austin’s weather. The app doesn’t need to know how the service gets it.",
  },
  {
    title: "3. The service sends a response",
    caption:
      "The service returns a 200 OK response with structured data: Austin, 78 °F, Sunny.",
  },
  {
    title: "4. The app uses the data",
    caption:
      "The app reads the response and shows 78 °F and Sunny. The service sends data; the app decides how to display it.",
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_ANSWER;
}
function isChecks(value: unknown): value is Checks {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "boolean")
  );
}
function isAttempt(value: unknown): value is Attempt {
  return (
    isRecord(value) &&
    isText(value.answer) &&
    value.answer.trim().length > 0 &&
    isText(value.followup) &&
    value.followup.trim().length > 0 &&
    isChecks(value.checks)
  );
}

/** Reject corrupt, incompatible, or impossible progress rather than render a broken step. */
export function restoreLesson(raw: string | null): LessonState {
  if (!raw) return structuredClone(FRESH_STATE);
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      !STEPS.includes(value.step as Step) ||
      !isText(value.quickAnswer) ||
      !isText(value.answer) ||
      !isText(value.followup) ||
      !isChecks(value.checks) ||
      !Array.isArray(value.attempts) ||
      value.attempts.length > 2 ||
      !value.attempts.every(isAttempt) ||
      !Number.isInteger(value.trace) ||
      (value.trace as number) < 0 ||
      (value.trace as number) >= TRACE_STEPS.length
    ) {
      return structuredClone(FRESH_STATE);
    }
    const state = value as LessonState;
    if (state.step === "followup" && !state.answer.trim())
      return structuredClone(FRESH_STATE);
    if (
      (state.step === "review" || state.step === "finished") &&
      state.attempts.length === 0
    ) {
      return structuredClone(FRESH_STATE);
    }
    return state;
  } catch {
    return structuredClone(FRESH_STATE);
  }
}

export function saveAttempt(state: LessonState): LessonState {
  if (
    !state.answer.trim() ||
    !state.followup.trim() ||
    state.attempts.length >= 2
  )
    return state;
  return {
    ...state,
    step: "review",
    checks: [false, false],
    attempts: [
      ...state.attempts,
      {
        answer: state.answer.trim(),
        followup: state.followup.trim(),
        checks: [false, false],
      },
    ],
  };
}

export function retryLesson(state: LessonState): LessonState {
  if (state.attempts.length !== 1) return state;
  return {
    ...state,
    step: "transfer",
    answer: "",
    followup: "",
    checks: [false, false],
  };
}

export function setCheck(
  state: LessonState,
  index: 0 | 1,
  checked: boolean,
): LessonState {
  const checks: Checks = [...state.checks];
  checks[index] = checked;
  return {
    ...state,
    checks,
    attempts: state.attempts.map((attempt, i) =>
      i === state.attempts.length - 1 ? { ...attempt, checks } : attempt,
    ),
  };
}
