"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
let memoryPlan = EMPTY_PLAN;
let persisted = true;

function readPlan() {
  try {
    if (persisted) memoryPlan = restorePlan(localStorage.getItem(PLAN_KEY));
  } catch {
    persisted = false;
  }
  return memoryPlan;
}

export function changePlan(apply: (plan: Plan) => Plan) {
  memoryPlan = apply(readPlan());
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(memoryPlan));
    persisted = true;
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event(PLAN_CHANGE));
}

export function usePlan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  useEffect(() => {
    function sync() {
      setPlan(readPlan());
    }
    function storage(event: StorageEvent) {
      if (event.key === PLAN_KEY || event.key === null) sync();
    }
    sync();
    window.addEventListener(PLAN_CHANGE, sync);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(PLAN_CHANGE, sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  return plan;
}

export function StartPractice() {
  const router = useRouter();
  const plan = usePlan();
  const active =
    plan?.session && plan.session.position < plan.session.items.length;
  return (
    <button
      type="button"
      className="button primary"
      onClick={() => {
        changePlan(startSession);
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
              changePlan((current) =>
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
    ? `interview-practice:run:${session.number}:${id}`
    : `interview-practice:item:${id}`;
}
