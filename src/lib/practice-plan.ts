import { ACTIVITIES, TRACKS, type Activity, type Track } from "./curriculum.ts";

export const PLAN_KEY = "interview-practice:plan:v1";
export const RATINGS = ["I can explain this", "Still practicing"] as const;
export type Rating = (typeof RATINGS)[number];
export type Review = { rating: Rating; order: number };
export type Session = {
  number: number;
  items: string[];
  position: number;
  draftId?: string;
};
export type Plan = {
  reviews: Record<string, Review>;
  session: Session | null;
  completed: number;
};
export const EMPTY_PLAN: Plan = { reviews: {}, session: null, completed: 0 };

function ordered(reviews: Plan["reviews"], track?: Track): Activity[] {
  const priority = (id: string) =>
    reviews[id]?.rating === "Still practicing" ? 0 : reviews[id] ? 2 : 1;
  return ACTIVITIES.filter((item) => !track || item.track === track).sort(
    (a, b) =>
      priority(a.id) - priority(b.id) ||
      (reviews[a.id]?.order ?? 0) - (reviews[b.id]?.order ?? 0),
  );
}

export function nextTopic(plan: Plan): Activity {
  return ordered(plan.reviews)[0];
}

export function startSession(plan: Plan, draftId?: string): Plan {
  if (plan.session && plan.session.position < TRACKS.length) return plan;
  return {
    ...plan,
    session: {
      number: plan.completed + 1,
      items: TRACKS.map((track) => ordered(plan.reviews, track)[0].id),
      position: 0,
      ...(draftId ? { draftId } : {}),
    },
  };
}

export function reviewItem(
  plan: Plan,
  id: string,
  rating: Rating,
  sessionNumber?: number,
): Plan {
  if (!ACTIVITIES.some((item) => item.id === id)) return plan;
  const session = plan.session;
  if (
    sessionNumber !== undefined &&
    (session?.number !== sessionNumber ||
      session.items[session.position] !== id)
  )
    return plan;
  const order =
    Math.max(0, ...Object.values(plan.reviews).map((review) => review.order)) +
    1;
  const reviews = { ...plan.reviews, [id]: { rating, order } };
  if (sessionNumber === undefined || !session) return { ...plan, reviews };
  const position = session.position + 1;
  return {
    reviews,
    session: { ...session, position },
    completed: plan.completed + Number(position === session.items.length),
  };
}

export function restorePlan(raw: string | null): Plan {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (!saved || !Number.isSafeInteger(saved.completed) || saved.completed < 0)
      return EMPTY_PLAN;
    const reviews: Plan["reviews"] = {};
    for (const { id } of ACTIVITIES) {
      const item = saved.reviews?.[id];
      if (
        item &&
        RATINGS.includes(item.rating) &&
        Number.isSafeInteger(item.order) &&
        item.order > 0
      ) {
        reviews[id] = { rating: item.rating, order: item.order };
      }
    }
    const session = saved.session;
    const valid =
      session &&
      Number.isInteger(session.position) &&
      session.position >= 0 &&
      session.position <= TRACKS.length &&
      (session.draftId === undefined ||
        (typeof session.draftId === "string" &&
          /^[a-z0-9-]{1,80}$/.test(session.draftId))) &&
      Array.isArray(session.items) &&
      session.items.length === TRACKS.length &&
      session.items.every((id: string, index: number) =>
        ACTIVITIES.some(
          (item) => item.id === id && item.track === TRACKS[index],
        ),
      ) &&
      session.number ===
        saved.completed + Number(session.position < TRACKS.length);
    return {
      completed: saved.completed,
      reviews,
      session: valid ? session : null,
    };
  } catch {
    return EMPTY_PLAN;
  }
}
