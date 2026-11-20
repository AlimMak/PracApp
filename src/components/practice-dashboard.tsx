"use client";

import Link from "next/link";
import { ACTIVITIES, TRACKS } from "@/lib/curriculum";
import { nextTopic } from "@/lib/practice-plan";
import { StartPractice, usePlan } from "./practice-progress";

export default function PracticeDashboard() {
  const plan = usePlan();
  const next = plan && nextTopic(plan);
  return (
    <main className="lesson-shell curriculum-shell">
      <nav aria-label="Practice navigation" className="account-nav">
        <Link href="/">API lesson</Link>
        <Link href="/account">Practice account</Link>
      </nav>
      <header className="practice-card practice-dashboard">
        <h1>Interview Practice</h1>
        <p>
          Practice a CS topic, a visual design, and a behavioral question in one
          short session.
        </p>
        <StartPractice />
        {next && (
          <p>
            <strong>Next in your guided path</strong>
            <br />
            <Link href={next.href}>{next.title}</Link>
          </p>
        )}
      </header>
      {TRACKS.map((track) => (
        <section key={track} className="practice-card track-card">
          <h2>{track}</h2>
          <ul className="activity-list">
            {ACTIVITIES.filter((item) => item.track === track).map((item) => {
              const rating = plan?.reviews[item.id]?.rating;
              return (
                <li key={item.id}>
                  <Link href={item.href}>{item.title}</Link>
                  <span data-rating={rating}>
                    {rating ?? "Not reviewed yet"}
                  </span>
                </li>
              );
            })}
            {track === "Behavioral" && (
              <li>
                <Link href="/star">Build a STAR story</Link>
                <span>Story workshop</span>
              </li>
            )}
          </ul>
        </section>
      ))}
    </main>
  );
}
