import type { Question, Track } from "./curriculum.ts";

export type PromptActivity = Omit<Question, "track"> & { track: Track };

export const CACHE_ACTIVITY: PromptActivity = {
  id: "cache",
  title: "Design a cache",
  track: "Visual design",
  quick: "Where would you put a cache to reduce repeated reads of a café menu?",
  example:
    "Place a cache between the app and the menu database. A miss reads the database and fills the cache. A hit returns the saved copy without reading the database. A price edit can leave the copy stale until you invalidate or refresh it.",
  transfer:
    "A campus events app gets many reads for the same schedule. How would you cache the schedule and keep an organizer’s edits visible?",
  followup:
    "What would you do if an edit must become visible immediately after it succeeds?",
  rubric: [
    "Explain where the cache sits and what happens on both a hit and a miss.",
    "Choose a key that identifies the schedule and explain when the entry is refreshed or removed.",
    "Recognize that a time limit alone allows stale reads and propose invalidation or bypass for edits that need immediate visibility.",
  ],
};
