export const CHAT_STORAGE_KEY = "interview-practice:offline-chat:v1";
export const CHAT_ANSWER_LIMIT = 6000;

export const COMPONENTS = {
  store: {
    label: "Message store",
    description:
      "A database keeps messages on disk so the server can read them later.",
    durable: true,
  },
  queue: {
    label: "Durable queue",
    description:
      "A persistent queue holds messages across restarts until the server confirms delivery.",
    durable: true,
  },
  relay: {
    label: "Live relay",
    description:
      "A relay forwards messages to connected clients and keeps no copy.",
    durable: false,
  },
} as const;

export type Component = keyof typeof COMPONENTS;
export type Slot = Component | null;
export const PHASES = [
  "online-ready",
  "online-sending",
  "online-server",
  "online-delivered",
  "design",
  "offline-sending",
  "offline-server",
  "waiting",
  "lost",
  "delivered",
  "missed",
  "explain",
  "followup",
  "review",
  "finished",
] as const;
export type Phase = (typeof PHASES)[number];

type Attempt = { answer: string; followup: string; component: Slot };
export type ChatState = {
  phase: Phase;
  mode: "build" | "watch";
  history: Slot[];
  answer: string;
  followup: string;
  previous: Attempt | null;
};

export const FRESH_CHAT: ChatState = {
  phase: "online-ready",
  mode: "build",
  history: [null],
  answer: "",
  followup: "",
  previous: null,
};

type Action =
  | { type: "restore"; state: ChatState }
  | {
      type:
        | "send"
        | "advance"
        | "design"
        | "undo"
        | "watch"
        | "run"
        | "reconnect"
        | "explain"
        | "followup"
        | "review"
        | "retry"
        | "finish";
    }
  | { type: "place"; component: Component }
  | { type: "draft"; field: "answer" | "followup"; value: string };

export function installed(state: ChatState): Slot {
  return state.history.at(-1) ?? null;
}

export function retainsMessage(state: ChatState): boolean {
  const component = installed(state);
  return component !== null && COMPONENTS[component].durable;
}

export function chatReducer(state: ChatState, action: Action): ChatState {
  const { phase } = state;
  switch (action.type) {
    case "restore":
      return action.state;
    case "send":
      return phase === "online-ready"
        ? { ...state, phase: "online-sending" }
        : state;
    case "advance":
      if (phase === "online-sending")
        return { ...state, phase: "online-server" };
      if (phase === "online-server")
        return { ...state, phase: "online-delivered" };
      if (phase === "offline-sending")
        return { ...state, phase: "offline-server" };
      if (phase === "offline-server")
        return { ...state, phase: retainsMessage(state) ? "waiting" : "lost" };
      return state;
    case "design":
      return phase === "online-delivered"
        ? { ...state, phase: "design" }
        : state;
    case "place":
      return phase === "design" && action.component !== installed(state)
        ? { ...state, history: [...state.history.slice(-63), action.component] }
        : state;
    case "undo":
      return phase === "design" && state.history.length > 1
        ? { ...state, history: state.history.slice(0, -1) }
        : state;
    case "watch":
      return phase === "design"
        ? {
            ...state,
            mode: "watch",
            history: ["store"],
            phase: "offline-sending",
          }
        : state;
    case "run":
      return phase === "design"
        ? { ...state, phase: "offline-sending" }
        : state;
    case "reconnect":
      if (phase === "waiting") return { ...state, phase: "delivered" };
      if (phase === "lost") return { ...state, phase: "missed" };
      return state;
    case "explain":
      return phase === "delivered" || phase === "missed"
        ? { ...state, phase: "explain" }
        : state;
    case "draft":
      return {
        ...state,
        [action.field]: action.value.slice(0, CHAT_ANSWER_LIMIT),
      };
    case "followup":
      return phase === "explain" && state.answer.trim()
        ? { ...state, phase: "followup" }
        : state;
    case "review":
      return phase === "followup" && state.followup.trim()
        ? { ...state, phase: "review" }
        : state;
    case "finish":
      return phase === "review" ? { ...state, phase: "finished" } : state;
    case "retry":
      return phase === "review" || phase === "finished"
        ? {
            ...state,
            phase: "design",
            mode: "build",
            answer: "",
            followup: "",
            previous: {
              answer: state.answer,
              followup: state.followup,
              component: installed(state),
            },
          }
        : state;
  }
}

function isSlot(value: unknown): value is Slot {
  return (
    value === null ||
    value === "store" ||
    value === "queue" ||
    value === "relay"
  );
}

function isAnswer(value: unknown): value is string {
  return typeof value === "string" && value.length <= CHAT_ANSWER_LIMIT;
}

export function restoreChat(raw: string | null): ChatState {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (
      !saved ||
      !PHASES.includes(saved.phase) ||
      (saved.mode !== "build" && saved.mode !== "watch") ||
      !Array.isArray(saved.history) ||
      saved.history.length === 0 ||
      saved.history.length > 64 ||
      !saved.history.every(isSlot) ||
      !isAnswer(saved.answer) ||
      !isAnswer(saved.followup)
    )
      return FRESH_CHAT;

    const { previous } = saved;
    if (
      previous !== null &&
      (!previous ||
        !isSlot(previous.component) ||
        !isAnswer(previous.answer) ||
        !isAnswer(previous.followup))
    )
      return FRESH_CHAT;
    if (
      ["followup", "review", "finished"].includes(saved.phase) &&
      !saved.answer.trim()
    )
      return FRESH_CHAT;
    if (["review", "finished"].includes(saved.phase) && !saved.followup.trim())
      return FRESH_CHAT;
    if (
      ["waiting", "delivered"].includes(saved.phase) &&
      !retainsMessage(saved)
    )
      return FRESH_CHAT;
    if (["lost", "missed"].includes(saved.phase) && retainsMessage(saved))
      return FRESH_CHAT;
    if (
      saved.mode === "watch" &&
      (installed(saved) !== "store" ||
        saved.phase.startsWith("online-") ||
        saved.phase === "design")
    )
      return FRESH_CHAT;
    return saved;
  } catch {
    return FRESH_CHAT;
  }
}
