import { QUESTIONS } from "./curriculum.ts";
import { CACHE_ACTIVITY } from "./cache-activity.ts";

export const STAR_REVIEW = [
  "I set the scene briefly and made my responsibility clear.",
  "I named a specific action I took and explained why I took it.",
  "I gave an observable result I can stand behind.",
  "I answered the follow-up with a concrete change I'd make next time.",
];

const custom = [
  {
    id: "api",
    transfer:
      "If another app wanted to use this weather service, what would its developer need to know?",
    followup:
      "Would the developer need the service's internal code? Why or why not?",
    rubric: [
      "Describe how to ask and what comes back, including inputs, output or errors.",
      "Explain why a caller can use the interface without knowing its implementation.",
    ],
    example:
      "Think of Austin's weather. What does the app send, and what can it read back?",
  },
  {
    id: "offline-chat",
    transfer:
      "Explain your design for delivering a chat message while Leo is offline.",
    followup: "What should the server do when Leo reconnects?",
    rubric: [
      "Distinguish accepting a message from retaining it durably.",
      "Explain where it waits, how reconnect triggers delivery, and when to acknowledge delivery. Both a durable queue and a message store can work.",
    ],
    example:
      "Imagine Leo reconnects tomorrow. Where could the server look for his waiting message?",
  },
  {
    id: "star",
    transfer: "Tell me about a time you took responsibility for a challenge.",
    followup: "What would you do differently next time, and why?",
    rubric: STAR_REVIEW,
    example:
      "Start with one moment from a team project. What did you personally do next?",
  },
];
export function coachLesson(id: string) {
  return [...QUESTIONS, CACHE_ACTIVITY, ...custom].find(
    (item) => item.id === id,
  );
}
export type CoachNote = {
  question?: string;
  demonstrated?: string;
  improvement?: string;
  fallback?: boolean;
};
export function validNote(value: unknown): value is CoachNote {
  if (!value || typeof value !== "object") return false;
  const n = value as CoachNote;
  return (
    [n.question, n.demonstrated, n.improvement].every(
      (v) => v === undefined || (typeof v === "string" && v.length <= 500),
    ) &&
    (n.fallback === undefined || typeof n.fallback === "boolean")
  );
}
export function unsure(text: string) {
  return /^(?:i\s+)?(?:don['’]?t know|do not know|am not sure|not sure|unsure|idk)[.!?\s]*$/i.test(
    text.trim(),
  );
}
