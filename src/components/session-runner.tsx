"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ACTIVITIES, QUESTIONS } from "@/lib/curriculum";
import { nextTopic, startSession } from "@/lib/practice-plan";
import ApiLesson from "./api-lesson";
import OfflineChat from "./offline-chat";
import QuestionPractice from "./question-practice";
import { CACHE_ACTIVITY } from "@/lib/cache-activity";
import { changePlan, StartPractice, usePlan } from "./practice-progress";

export default function SessionRunner() {
  const plan = usePlan();
  useEffect(() => {
    if (plan && !plan.session) changePlan(startSession);
  }, [plan]);

  if (!plan?.session)
    return (
      <main className="lesson-shell">
        <p role="status">Opening mixed practice…</p>
      </main>
    );
  const { number, position, items } = plan.session;
  const id = items[position];
  if (!id) {
    const next = nextTopic(plan);
    return (
      <main className="lesson-shell curriculum-shell">
        <section className="practice-card">
          <h1>Mixed session complete</h1>
          <ul className="activity-list">
            {items.map((itemId) => (
              <li key={itemId}>
                <span>
                  {ACTIVITIES.find((item) => item.id === itemId)?.title}
                </span>
                <span data-rating={plan.reviews[itemId]?.rating}>
                  {plan.reviews[itemId]?.rating}
                </span>
              </li>
            ))}
          </ul>
          <p>
            <strong>Next in your guided path</strong>
            <br />
            <Link href={next.href}>{next.title}</Link>
          </p>
          <div className="actions">
            <StartPractice />
            <Link className="button secondary" href="/practice">
              Activities and progress
            </Link>
          </div>
        </section>
      </main>
    );
  }
  const session = { number, position, total: items.length };
  const key = number + ":" + id;
  if (id === "api") return <ApiLesson key={key} session={session} />;
  if (id === "offline-chat") return <OfflineChat key={key} session={session} />;
  const question =
    id === "cache" ? CACHE_ACTIVITY : QUESTIONS.find((item) => item.id === id);
  return question ? (
    <QuestionPractice key={key} question={question} session={session} />
  ) : null;
}
