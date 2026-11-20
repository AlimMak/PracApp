"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AnswerInput from "./answer-input";
import type { PromptActivity } from "@/lib/cache-activity";
import {
  CacheLab,
  EMPTY_CACHE,
  HtmlLab,
  restoreCache,
  type CacheState,
} from "./practice-labs";
import {
  activityKey,
  RatingActions,
  SessionHeader,
  type SessionContext,
} from "./practice-progress";

const LIMIT = 6000;
const STEPS = ["quick", "example", "transfer", "followup", "review"] as const;
type Step = (typeof STEPS)[number];
type Answers = { quick: string; transfer: string; followup: string };
type Draft = {
  step: Step;
  answers: Answers;
  past: Answers[];
  cache: CacheState;
};
const EMPTY_ANSWERS = { quick: "", transfer: "", followup: "" };

function initial(id: string): Draft {
  return {
    step: id === "cache" ? "example" : "quick",
    answers: EMPTY_ANSWERS,
    past: [],
    cache: EMPTY_CACHE,
  };
}

function isAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== "object") return false;
  const saved = value as Answers;
  return [saved.quick, saved.transfer, saved.followup].every(
    (text) => typeof text === "string" && text.length <= LIMIT,
  );
}

function restore(raw: string | null, id: string): Draft {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (
      saved &&
      STEPS.includes(saved.step) &&
      isAnswers(saved.answers) &&
      Array.isArray(saved.past) &&
      saved.past.every(isAnswers) &&
      (!["followup", "review"].includes(saved.step) ||
        saved.answers.transfer.trim()) &&
      (saved.step !== "review" || saved.answers.followup.trim())
    ) {
      return {
        step: saved.step,
        answers: saved.answers,
        past: saved.past,
        cache: restoreCache(saved.cache),
      };
    }
  } catch {
    /* fall back to a fresh draft */
  }
  return initial(id);
}

export default function QuestionPractice({
  question,
  session,
}: {
  question: PromptActivity;
  session?: SessionContext;
}) {
  const { id, title, track } = question;
  const key = activityKey(id, session);
  const [draft, setDraft] = useState(() => initial(id));
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const { step, answers, past, cache } = draft;

  useEffect(() => {
    try {
      setDraft(restore(localStorage.getItem(key), id));
    } catch {
      setSaved(false);
    }
    setLoaded(true);
  }, [id, key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft, key, loaded]);

  useEffect(() => {
    if (loaded) heading.current?.focus();
  }, [loaded, step]);

  function go(next: Step) {
    setDraft((current) => ({ ...current, step: next }));
  }

  const prompt =
    step === "example"
      ? id === "cache"
        ? question.quick
        : "See an example"
      : step === "review"
        ? "Self-review"
        : question[step];

  return (
    <main className="lesson-shell curriculum-shell">
      {session ? (
        <SessionHeader session={session} />
      ) : (
        <Link href="/practice">Activities and progress</Link>
      )}
      <p className="curriculum-kicker">
        {track} · {title}
      </p>
      <section className="practice-card">
        {!loaded ? (
          <p role="status">Opening practice…</p>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1}>
              {prompt}
            </h1>
            {step === "example" && (
              <>
                {id === "semantic-html" && <HtmlLab />}
                {id === "cache" && (
                  <CacheLab
                    state={cache}
                    change={(next) =>
                      setDraft((current) => ({ ...current, cache: next }))
                    }
                  />
                )}
                <p>{question.example}</p>
                <div className="actions">
                  <button
                    className="button primary"
                    onClick={() => go("transfer")}
                  >
                    Continue to scenario
                  </button>
                </div>
              </>
            )}
            {(step === "quick" ||
              step === "transfer" ||
              step === "followup") && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (step === "quick" || answers[step].trim())
                    go(
                      step === "followup"
                        ? "review"
                        : step === "transfer"
                          ? "followup"
                          : "transfer",
                    );
                }}
              >
                <p className="intro">
                  {step === "quick"
                    ? "Try a quick answer or go straight to the example."
                    : step === "transfer"
                      ? "Use your own words for this scenario."
                      : "Answer one follow-up before reviewing."}
                </p>
                <AnswerInput
                  key={step}
                  id="curriculum-answer"
                  label={
                    step === "quick"
                      ? "Your quick answer"
                      : step === "transfer"
                        ? "Your scenario answer"
                        : "Your follow-up answer"
                  }
                  value={answers[step]}
                  maxLength={LIMIT}
                  rows={4}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      answers: { ...current.answers, [step]: value },
                    }))
                  }
                />
                <div className="actions">
                  <button
                    className="button primary"
                    disabled={step !== "quick" && !answers[step].trim()}
                  >
                    {step === "quick"
                      ? "Continue to scenario"
                      : step === "transfer"
                        ? "Continue to follow-up"
                        : "See self-review"}
                  </button>
                  {step === "quick" && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => go("example")}
                    >
                      See an example
                    </button>
                  )}
                  {step === "followup" && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => go("transfer")}
                    >
                      Edit scenario answer
                    </button>
                  )}
                </div>
              </form>
            )}
            {step === "review" && (
              <>
                <p>
                  Compare what you said with these points, then choose how the
                  topic felt.
                </p>
                <ul className="curriculum-rubric">
                  {question.rubric.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <details className="practice-answers">
                  <summary>
                    Your answers{past.length ? " and previous attempts" : ""}
                  </summary>
                  {[...past, answers].map((answer, index) => (
                    <div key={index}>
                      <h2>Attempt {index + 1}</h2>
                      {answer.quick && (
                        <p>
                          <strong>Quick check</strong>
                          <br />
                          {answer.quick}
                        </p>
                      )}
                      <p>
                        <strong>Scenario</strong>
                        <br />
                        {answer.transfer}
                      </p>
                      <p>
                        <strong>Follow-up</strong>
                        <br />
                        {answer.followup}
                      </p>
                    </div>
                  ))}
                </details>
                <RatingActions id={id} session={session} />
                {!session && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...initial(id),
                        past: [...current.past, current.answers],
                      }))
                    }
                  >
                    Retry topic
                  </button>
                )}
              </>
            )}
          </>
        )}
      </section>
      {loaded && !saved && (
        <p role="status">
          Browser saving is unavailable. Keep this tab open to keep your draft.
        </p>
      )}
    </main>
  );
}
