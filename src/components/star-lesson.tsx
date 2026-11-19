"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AnswerInput from "./answer-input";
import {
  CUE_LIMIT,
  FRESH_STAR,
  STAR_STORAGE_KEY,
  STORY_LIMIT,
  TITLE_LIMIT,
  advanceRehearsal,
  completeStory,
  deleteStory,
  discardDraft,
  newRehearsal,
  openEditor,
  restoreStar,
  saveStory,
  type Draft,
  type Rehearsal,
  type StarState,
  type Story,
} from "@/lib/star";
import styles from "./star-lesson.module.css";

const PARTS = [
  {
    key: "situation",
    label: "Situation",
    definition: "Set the scene.",
    prompt: "What experience will you tell?",
    hint: "Pick one real moment from class, work, volunteering, or a personal project. Give just enough context to make the challenge clear.",
    example:
      "Three days before a class demo, our student team’s campus events app showed an empty schedule.",
  },
  {
    key: "task",
    label: "Task",
    definition: "Name your responsibility.",
    prompt: "What were you responsible for?",
    hint: "Name the piece you owned or agreed to take on. What needed to be true when you were done?",
    example:
      "I was responsible for getting the event list to load so the team could demo it.",
  },
  {
    key: "action",
    label: "Action",
    definition: "Explain what you did.",
    prompt: "What did you personally do?",
    hint: "Use “I” to describe a concrete step you took. If the team helped, say what you contributed.",
    example:
      "I traced a failing request, found that our filter used the wrong date format, and paired with a teammate to fix it and add a test.",
  },
  {
    key: "result",
    label: "Result",
    definition: "Say what changed.",
    prompt: "What changed because of your actions?",
    hint: "Name something you observed, such as a demo that worked or a teammate who could continue. Use a number only if you know it.",
    example:
      "The schedule loaded during the demo, and the test caught the same date-format bug when we changed the filter later.",
  },
] as const;

const REVIEW = [
  "I set the scene briefly and made my responsibility clear.",
  "I named a specific action I took and explained why I took it.",
  "I gave an observable result I can stand behind.",
  "I answered the follow-up with a concrete change I’d make next time.",
];

type Update = (apply: (current: StarState) => StarState) => void;

function Example({
  onBuild,
  onStories,
}: {
  onBuild: () => void;
  onStories: () => void;
}) {
  const [index, setIndex] = useState(0);
  const part = PARTS[index];
  return (
    <>
      <h1 tabIndex={-1}>Tell a story with STAR</h1>
      <p className="intro">
        Tap each part to see how a student might answer a question about
        handling a team project setback.
      </p>
      <section className={styles.sample} aria-label="Fictional example">
        <p className={styles.pill}>Fictional student team project</p>
        <div
          className={styles.parts}
          role="group"
          aria-label="STAR story parts"
        >
          {PARTS.map((item, i) => (
            <button
              key={item.key}
              className={`button ${index === i ? "primary" : "secondary"}`}
              type="button"
              aria-pressed={index === i}
              onClick={() => setIndex(i)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className={styles.exampleText}
          aria-live="polite"
          aria-atomic="true"
        >
          <h2>
            {part.label} <span>{part.definition}</span>
          </h2>
          <p>{part.example}</p>
        </div>
      </section>
      <div className="actions">
        <button className="button primary" onClick={onBuild}>
          Build my story
        </button>
        <button className="button secondary" onClick={onStories}>
          My stories
        </button>
      </div>
    </>
  );
}

function Library({
  state,
  update,
  onPractice,
}: {
  state: StarState;
  update: Update;
  onPractice: (id: string, retry?: boolean) => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <>
      <h1 tabIndex={-1}>My stories</h1>
      {state.stories.length === 0 && (
        <p className="intro">Your saved stories will appear here.</p>
      )}
      <div className="actions">
        <button
          className="button primary"
          onClick={() => update((current) => openEditor(current, "new"))}
        >
          {state.drafts.new ? "Resume story draft" : "Build a story"}
        </button>
        {state.drafts.new && (
          <button className="text-button" onClick={() => setDeleting("new")}>
            Discard draft
          </button>
        )}
        <button
          className="text-button"
          onClick={() =>
            update((current) => ({ ...current, view: { screen: "example" } }))
          }
        >
          See STAR example
        </button>
      </div>
      {deleting === "new" && (
        <div
          className={styles.confirm}
          role="group"
          aria-label="Confirm discard draft"
        >
          <span>Discard your unfinished story draft?</span>
          <button
            className="button secondary"
            onClick={() => {
              update((current) => discardDraft(current, "new"));
              setDeleting(null);
            }}
          >
            Discard this draft
          </button>
          <button className="text-button" onClick={() => setDeleting(null)}>
            Cancel
          </button>
        </div>
      )}
      <div className={styles.stories}>
        {state.stories.map((story) => (
          <article key={story.id} className={styles.story}>
            <h2>{story.fields.title}</h2>
            <div className="actions">
              <button
                className="button primary"
                onClick={() => onPractice(story.id)}
              >
                {story.attempts.length
                  ? "Resume practice"
                  : "Practice this story"}
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  update((current) => openEditor(current, story.id))
                }
              >
                {state.drafts[story.id] ? "Resume edits" : "Edit story"}
              </button>
              <button
                className="text-button"
                onClick={() => setDeleting(story.id)}
              >
                Delete story
              </button>
            </div>
            {deleting === story.id && (
              <div
                className={styles.confirm}
                role="group"
                aria-label="Confirm delete story"
              >
                <span>
                  Delete this story, its draft edits, and its rehearsals?
                </span>
                <button
                  className="button secondary"
                  onClick={() => {
                    update((current) => deleteStory(current, story.id));
                    setDeleting(null);
                  }}
                >
                  Delete this story
                </button>
                <button
                  className="text-button"
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </button>
              </div>
            )}
            <details>
              <summary>View story</summary>
              <dl className={styles.storyText}>
                {PARTS.map(({ key, label }) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{story.fields[key]}</dd>
                  </div>
                ))}
                {story.fields.cues.trim() && (
                  <div>
                    <dt>Cue words</dt>
                    <dd>{story.fields.cues}</dd>
                  </div>
                )}
              </dl>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}

function Editor({
  id,
  draft,
  update,
}: {
  id: string;
  draft: Draft;
  update: Update;
}) {
  const { step, fields } = draft;
  const part = PARTS[step];
  function change(next: Partial<Draft>) {
    update((current) => ({
      ...current,
      drafts: { ...current.drafts, [id]: { ...current.drafts[id], ...next } },
    }));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (part) {
          if (fields[part.key].trim()) change({ step: step + 1 });
        } else if (completeStory(fields)) {
          const newId = Array.from(
            crypto.getRandomValues(new Uint8Array(16)),
            (byte) => byte.toString(16).padStart(2, "0"),
          ).join("");
          update((current) => saveStory(current, id, newId));
        }
      }}
    >
      <p className={styles.progress}>
        {part ? `Step ${step + 1} of 5 · ${part.label}` : "Step 5 of 5"}
      </p>
      <h1 tabIndex={-1}>{part?.prompt ?? "Name your story"}</h1>
      {part ? (
        <>
          <p className="intro">{part.hint}</p>
          <AnswerInput
            key={part.key}
            id="story-part"
            label={`Your ${part.label.toLowerCase()}`}
            rows={4}
            maxLength={STORY_LIMIT}
            value={fields[part.key]}
            onChange={(value) =>
              change({ fields: { ...fields, [part.key]: value } })
            }
          />
        </>
      ) : (
        <>
          <p className="intro">
            Choose a title that will help you find it again. Add a few cue words
            if you want reminders during practice.
          </p>
          <div className={styles.nameFields}>
            <label htmlFor="story-title">Story title</label>
            <input
              id="story-title"
              value={fields.title}
              maxLength={TITLE_LIMIT}
              onChange={(event) =>
                change({ fields: { ...fields, title: event.target.value } })
              }
            />
            <label htmlFor="story-cues">
              Cue words <span>(optional)</span>
            </label>
            <input
              id="story-cues"
              value={fields.cues}
              maxLength={CUE_LIMIT}
              onChange={(event) =>
                change({ fields: { ...fields, cues: event.target.value } })
              }
            />
          </div>
        </>
      )}
      <div className="actions">
        <button
          className="button primary"
          disabled={part ? !fields[part.key].trim() : !completeStory(fields)}
        >
          {part ? "Next" : "Save story"}
        </button>
        {step > 0 && (
          <button
            className="button secondary"
            type="button"
            onClick={() => change({ step: step - 1 })}
          >
            Back
          </button>
        )}
        <button
          className="text-button"
          type="button"
          onClick={() =>
            update((current) => ({ ...current, view: { screen: "library" } }))
          }
        >
          My stories
        </button>
      </div>
    </form>
  );
}

function Cues({ cues }: { cues: string }) {
  return (
    <details className={styles.cues}>
      <summary>Show cue words</summary>
      <p>
        {cues.trim() ||
          "Context · My responsibility · What I did · What changed"}
      </p>
    </details>
  );
}

function Practice({
  story,
  attempt,
  onChange,
  onRetry,
  onExit,
}: {
  story: Story;
  attempt: Rehearsal;
  onChange: (next: Rehearsal) => void;
  onRetry: () => void;
  onExit: () => void;
}) {
  const { step } = attempt;
  const field = step === "followup" ? "followup" : "answer";
  if (step === "review") {
    return (
      <>
        <h1 tabIndex={-1}>Self-review</h1>
        <p className="intro">
          Think back to your answers and compare them with your cues. Check the
          points you can hear or find in your answer.
        </p>
        {(attempt.answerAloud || attempt.followupAloud) && (
          <p className={styles.aloud}>
            Your unrecorded rehearsal stayed with you. The app didn’t hear or
            evaluate it.
          </p>
        )}
        <Cues cues={story.fields.cues} />
        <fieldset className={styles.review}>
          <legend>What did you cover?</legend>
          {REVIEW.map((item, index) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={attempt.checks.includes(index)}
                onChange={(event) =>
                  onChange({
                    ...attempt,
                    checks: event.target.checked
                      ? [...attempt.checks, index]
                      : attempt.checks.filter((check) => check !== index),
                  })
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </fieldset>
        {story.attempts.some((item) => item.answer || item.followup) && (
          <details className={styles.history}>
            <summary>View written rehearsal answers</summary>
            {story.attempts.map(
              (item, index) =>
                (item.answer || item.followup) && (
                  <div key={index} className={styles.written}>
                    <h2>Rehearsal {index + 1}</h2>
                    {item.answer && (
                      <p>
                        <strong>Interview answer</strong>
                        <br />
                        {item.answer}
                      </p>
                    )}
                    {item.followup && (
                      <p>
                        <strong>Follow-up answer</strong>
                        <br />
                        {item.followup}
                      </p>
                    )}
                  </div>
                ),
            )}
          </details>
        )}
        <div className="actions">
          <button className="button primary" onClick={onRetry}>
            Retry rehearsal
          </button>
          <button className="button secondary" onClick={onExit}>
            Done
          </button>
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onChange(advanceRehearsal(attempt, false));
      }}
    >
      {step === "followup" && <p className={styles.progress}>Follow-up</p>}
      <h1 tabIndex={-1}>
        {step === "answer"
          ? "Tell me about a time you took responsibility for a challenge."
          : "What would you do differently next time, and why?"}
      </h1>
      <p className="intro">
        {step === "answer"
          ? "Tell the story as you would in an interview. Use the cues if you get stuck."
          : "Pick one change you’d make and connect it to what you learned."}
      </p>
      <Cues key={step} cues={story.fields.cues} />
      <AnswerInput
        key={field}
        id="rehearsal-answer"
        label={
          step === "answer" ? "Your interview answer" : "Your follow-up answer"
        }
        rows={4}
        maxLength={STORY_LIMIT}
        value={attempt[field]}
        onChange={(value) => onChange({ ...attempt, [field]: value })}
      />
      <div className="actions">
        <button className="button primary" disabled={!attempt[field].trim()}>
          {step === "answer" ? "Continue" : "See self-review"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => onChange(advanceRehearsal(attempt, true))}
        >
          I rehearsed aloud
        </button>
        <button className="text-button" type="button" onClick={onExit}>
          My stories
        </button>
      </div>
      <p className={styles.aloud}>
        To rehearse without recording, say your answer aloud, then select “I
        rehearsed aloud.”
      </p>
    </form>
  );
}

export default function StarLesson() {
  const [state, update] = useState(FRESH_STAR);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const main = useRef<HTMLElement>(null);
  const lastScreen = useRef("");
  const { view } = state;
  const story =
    view.screen === "practice"
      ? state.stories.find((item) => item.id === view.id)
      : undefined;
  const attempt = story?.attempts.at(-1);
  const draft = view.screen === "edit" ? state.drafts[view.id] : undefined;
  const focusKey = `${view.screen}:${draft?.step ?? attempt?.step ?? ""}`;

  useEffect(() => {
    try {
      update(restoreStar(localStorage.getItem(STAR_STORAGE_KEY)));
    } catch {
      setSaved(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(state));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [ready, state]);

  useEffect(() => {
    if (!ready) return;
    if (lastScreen.current && lastScreen.current !== focusKey)
      main.current?.querySelector("h1")?.focus();
    lastScreen.current = focusKey;
  }, [ready, focusKey]);

  function goLibrary() {
    update((current) => ({ ...current, view: { screen: "library" } }));
  }

  function practice(id: string, retry = false) {
    update((current) => ({
      ...current,
      view: { screen: "practice", id },
      stories: current.stories.map((item) =>
        item.id === id && (retry || !item.attempts.length)
          ? { ...item, attempts: [...item.attempts, newRehearsal()] }
          : item,
      ),
    }));
  }

  return (
    <>
      <a className="skip-link" href="#star-practice" tabIndex={0}>
        Skip to practice
      </a>
      <header className={`site-header ${styles.header}`}>
        <Link className="brand" href="/">
          Interview Practice
        </Link>
        <Link href="/offline-chat">Offline chat</Link>
      </header>
      <main
        ref={main}
        className="lesson-shell"
        id="star-practice"
        tabIndex={-1}
      >
        <p className={styles.topic}>Behavioral interviews</p>
        <section className={`practice-card ${styles.card}`}>
          {!ready && <p role="status">Opening your practice…</p>}
          {ready && view.screen === "example" && (
            <Example
              onBuild={() => update((current) => openEditor(current, "new"))}
              onStories={goLibrary}
            />
          )}
          {ready && view.screen === "library" && (
            <Library state={state} update={update} onPractice={practice} />
          )}
          {ready && view.screen === "edit" && draft && (
            <Editor id={view.id} draft={draft} update={update} />
          )}
          {ready && story && attempt && (
            <Practice
              story={story}
              attempt={attempt}
              onChange={(next) =>
                update((current) => ({
                  ...current,
                  stories: current.stories.map((item) =>
                    item.id === story.id
                      ? {
                          ...item,
                          attempts: [...item.attempts.slice(0, -1), next],
                        }
                      : item,
                  ),
                }))
              }
              onRetry={() => practice(story.id, true)}
              onExit={goLibrary}
            />
          )}
        </section>
        {ready && (
          <p className={styles.save} role="status">
            {saved
              ? "Stories and written answers stay in this browser."
              : "Browser saving is unavailable. Keep this tab open to keep your work."}
          </p>
        )}
      </main>
    </>
  );
}
