"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { stableId } from "@/lib/account-data";
import type { PracticeStorage } from "@/lib/account-sync";
import { usePracticeStorage } from "./practice-storage";
import {
  EMPTY_PLAN,
  PLAN_KEY,
  RATINGS,
  restorePlan,
  reviewItem,
  startSession,
  type Plan,
  type Rating,
} from "@/lib/practice-plan";

const PLAN_CHANGE = "interview-practice:plan-change";
const fallback = new WeakMap<PracticeStorage, Plan>();

function readPlan(storage: PracticeStorage) {
  try {
    return fallback.get(storage) ?? restorePlan(storage.getItem(PLAN_KEY));
  } catch {
    return fallback.get(storage) ?? EMPTY_PLAN;
  }
}

export function changePlan(
  storage: PracticeStorage,
  apply: (plan: Plan) => Plan,
) {
  const next = apply(readPlan(storage));
  try {
    storage.setItem(PLAN_KEY, JSON.stringify(next));
    fallback.delete(storage);
  } catch {
    fallback.set(storage, next);
  }
  window.dispatchEvent(new Event(PLAN_CHANGE));
}

export function usePlan() {
  const storage = usePracticeStorage();
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    function sync() {
      setPlan(readPlan(storage));
    }
    function browserStorage(event: StorageEvent) {
      if (event.key === PLAN_KEY || event.key === null) sync();
    }
    sync();
    window.addEventListener(PLAN_CHANGE, sync);
    window.addEventListener("storage", browserStorage);
    return () => {
      window.removeEventListener(PLAN_CHANGE, sync);
      window.removeEventListener("storage", browserStorage);
    };
  }, [storage]);
  return plan;
}

export function StartPractice() {
  const router = useRouter();
  const storage = usePracticeStorage();
  const plan = usePlan();
  const active =
    plan?.session && plan.session.position < plan.session.items.length;
  return (
    <button
      type="button"
      className="button primary"
      onClick={() => {
        changePlan(storage, (current) => startSession(current, stableId()));
        router.push("/practice/session");
      }}
    >
      {active ? "Resume practice" : "Start practice"}
    </button>
  );
}

export function PracticeLinks() {
  return (
    <nav aria-label="Practice options" className="actions practice-nav">
      <StartPractice />
      <Link className="button secondary" href="/practice" tabIndex={0}>
        Browse activities and progress
      </Link>
    </nav>
  );
}

export type SessionContext = {
  number: number;
  position: number;
  total: number;
  draftId?: string;
};

export function SessionHeader({ session }: { session: SessionContext }) {
  return (
    <nav className="session-nav" aria-label="Mixed session">
      <strong>
        Mixed practice · Activity {session.position + 1} of {session.total}
      </strong>
      <Link href="/practice">Leave session</Link>
    </nav>
  );
}

export function RatingActions({
  id,
  session,
}: {
  id: string;
  session?: SessionContext;
}) {
  const storage = usePracticeStorage();
  const plan = usePlan();
  const rating = plan?.reviews[id]?.rating;
  return (
    <section className="rating-actions" aria-label="Practice progress">
      <p>
        {session
          ? "Choose how this felt to move to the next activity."
          : "How did this feel? Your choice guides future sessions."}
      </p>
      <div className="actions">
        {RATINGS.map((value) => (
          <button
            key={value}
            type="button"
            className="button secondary"
            aria-pressed={session ? undefined : rating === value}
            onClick={() =>
              changePlan(storage, (current) =>
                reviewItem(current, id, value, session?.number),
              )
            }
          >
            {value}
          </button>
        ))}
      </div>
      {!session && rating && <p role="status">Saved progress: {rating}</p>}
    </section>
  );
}

export function activityKey(id: string, session?: SessionContext) {
  return session
    ? `interview-practice:run:${session.draftId ?? session.number}:${id}`
    : `interview-practice:item:${id}`;
}
