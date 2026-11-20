"use client";

import Link from "next/link";
import AnswerInput from "./answer-input";
import {
  activityKey,
  PracticeLinks,
  RatingActions,
  SessionHeader,
  type SessionContext,
} from "./practice-progress";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  FRESH_STATE,
  MAX_ANSWER,
  SAMPLE_WEATHER,
  STORAGE_KEY,
  TRACE_STEPS,
  restoreLesson,
  retryLesson,
  saveAttempt,
  setCheck,
  type LessonState,
  type Step,
} from "@/lib/lesson";

function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "check"
    | "layers"
    | "lock"
    | "replay"
    | "pause"
    | "play"
    | "server"
    | "spark";
  size?: number;
}) {
  const paths: Record<typeof name, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    replay: (
      <>
        <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    play: <path d="m8 4 12 8-12 8V4Z" />,
    server: (
      <>
        <rect x="3" y="3" width="18" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
        <path d="M7 6.5h.01M7 17.5h.01m5-11h5m-5 11h5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Sunshine({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "sunshine small" : "sunshine"}
      viewBox="0 0 100 80"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="#e2a334" strokeWidth="3" strokeLinecap="round">
        <path d="M43 6v6M43 55v6M16 33h6m43 0h6M24 14l4 4m30 30 4 4m0-38-4 4M28 48l-4 4" />
      </g>
      <circle cx="43" cy="33" r="16" fill="#ffce66" />
      <path
        d="M33 66a12 12 0 0 1-1-24 18 18 0 0 1 34-2 13 13 0 1 1 9 26H33Z"
        fill="#fff"
        stroke="#dde5f0"
        strokeWidth="2"
      />
    </svg>
  );
}

const STEP_INFO: Record<Step, { number: number; label: string }> = {
  quick: { number: 1, label: "Quick check" },
  example: { number: 2, label: "See it work" },
  transfer: { number: 3, label: "Make it yours" },
  followup: { number: 3, label: "One follow-up" },
  review: { number: 4, label: "Self-review" },
  finished: { number: 4, label: "Lesson complete" },
};

export default function ApiLesson({ session }: { session?: SessionContext }) {
  const key = session ? activityKey("api", session) : STORAGE_KEY;
  const [state, setState] = useState<LessonState>(FRESH_STATE);
  const [ready, setReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState<
    "saved" | "unavailable" | "checking"
  >("checking");
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<Step>("quick");

  useEffect(() => {
    try {
      setState(restoreLesson(window.localStorage.getItem(key)));
    } catch {
      setStorageStatus("unavailable");
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
      setStorageStatus("saved");
    } catch {
      setStorageStatus("unavailable");
    }
  }, [ready, state, key]);

  useEffect(() => {
    if (ready && previousStep.current !== state.step) {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    previousStep.current = state.step;
  }, [ready, state.step]);

  const go = (step: Step) => setState((current) => ({ ...current, step }));
  const info = STEP_INFO[state.step];

  function submit(event: FormEvent, step: Step) {
    event.preventDefault();
    go(step);
  }

  return (
    <>
      <a className="skip-link" href="#practice" tabIndex={0}>
        Skip to practice
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="layers" size={22} />
          </span>
          <span>Interview Practice</span>
        </div>
        <span className="header-note">
          <span className="status-dot" /> A little practice, a little clearer.
        </span>
      </header>

      <main id="practice" className="lesson-shell" tabIndex={-1}>
        {session ? <SessionHeader session={session} /> : <PracticeLinks />}
        <div className="lesson-meta">
          <span className="topic-tag">CS FUNDAMENTALS</span>
          <span className="untimed">At your pace · No timer</span>
        </div>
        <div className="lesson-title-row">
          <p className="lesson-name">What is an API?</p>
          <span className="lesson-count">Lesson 01</span>
        </div>
        <ol className="progress" aria-label="Lesson progress">
          {["Quick check", "See it work", "Make it yours", "Self-review"].map(
            (label, index) => (
              <li
                key={label}
                className={
                  info.number > index + 1
                    ? "done"
                    : info.number === index + 1
                      ? "current"
                      : ""
                }
                aria-current={info.number === index + 1 ? "step" : undefined}
              >
                <span className="progress-node">
                  {info.number > index + 1 ? (
                    <Icon name="check" size={12} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>{label}</span>
              </li>
            ),
          )}
        </ol>

        {!ready ? (
          <section className="practice-card loading" aria-busy="true">
            Opening your lesson…
          </section>
        ) : (
          <>
            {state.step === "quick" && (
              <section className="practice-card quick-card">
                <span className="eyebrow">
                  <span className="tiny-line" /> FIRST, A QUICK CHECK
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  How would you explain an API to another engineer?
                </h1>
                <p className="intro">
                  Start with what you know. A sentence or two is plenty.
                </p>
                <div className="mini-concept" aria-hidden="true">
                  <span className="mini-app">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="mini-connection">
                    <i />
                    <span>API</span>
                    <i />
                  </span>
                  <span className="mini-service">
                    <Icon name="server" size={25} />
                  </span>
                </div>
                <form onSubmit={(event) => submit(event, "example")}>
                  <AnswerInput
                    id="quick-answer"
                    maxLength={MAX_ANSWER}
                    label="Your first explanation"
                    value={state.quickAnswer}
                    placeholder="I think an API is…"
                    onChange={(quickAnswer) =>
                      setState((current) => ({ ...current, quickAnswer }))
                    }
                  />
                  <div className="actions">
                    <button
                      className="button primary"
                      type="submit"
                      disabled={!state.quickAnswer.trim()}
                    >
                      Try my answer <Icon name="arrow" size={18} />
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => go("example")}
                    >
                      Show me <Icon name="play" size={15} />
                    </button>
                  </div>
                </form>
                <p className="gentle-note">
                  A starting point, not a test. You’ll get an example and a
                  chance to try again.
                </p>
              </section>
            )}

            {state.step === "example" && (
              <section className="practice-card example-card">
                <span className="eyebrow">
                  <span className="tiny-line" /> SEE IT WORK
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  A request. A response.
                </h1>
                <p className="intro">
                  Your weather app needs information from another piece of
                  software.
                </p>
                {state.quickAnswer.trim() && (
                  <p className="saved-answer-note">
                    <Icon name="check" size={16} /> Your starting explanation is
                    saved for later.
                  </p>
                )}
                <WeatherExample
                  trace={state.trace}
                  setTrace={(trace) =>
                    setState((current) => ({ ...current, trace }))
                  }
                />
                <div className="concept-note">
                  <span className="concept-icon">
                    <Icon name="spark" />
                  </span>
                  <p>
                    <strong>
                      An API is an agreed way for software to interact.
                    </strong>{" "}
                    It defines what you can ask for, how to ask, and what comes
                    back. The app can use the service without knowing its
                    internal code.
                  </p>
                </div>
                <p className="scope-note">
                  This is a <strong>web API</strong>: the app and service
                  communicate over HTTP. APIs also connect software components
                  on the same machine, such as calling a library function.
                </p>
                <div className="actions end">
                  <button
                    className="button primary"
                    onClick={() => go("transfer")}
                  >
                    I’m ready to explain <Icon name="arrow" size={18} />
                  </button>
                </div>
              </section>
            )}

            {state.step === "transfer" && (
              <section className="practice-card answer-card">
                <span className="eyebrow">
                  <span className="tiny-line" />{" "}
                  {state.attempts.length
                    ? "TRY IT IN YOUR OWN WORDS · ATTEMPT 2"
                    : "MAKE IT YOURS"}
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  If another app wanted to use this weather service, what would
                  its developer need to know?
                </h1>
                <p className="intro">
                  Imagine a teammate is building a different weather app. What
                  would you tell them?
                </p>
                <form onSubmit={(event) => submit(event, "followup")}>
                  <AnswerInput
                    id="transfer-answer"
                    maxLength={MAX_ANSWER}
                    label="Your explanation"
                    value={state.answer}
                    placeholder="The developer would need to know…"
                    onChange={(answer) =>
                      setState((current) => ({ ...current, answer }))
                    }
                  />
                  <div className="actions">
                    <button
                      className="button primary"
                      disabled={!state.answer.trim()}
                    >
                      Continue <Icon name="arrow" size={18} />
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => go("example")}
                    >
                      Revisit the example
                    </button>
                  </div>
                </form>
                <p className="gentle-note">
                  Use your own words. It’s okay to name something you’re unsure
                  about.
                </p>
              </section>
            )}

            {state.step === "followup" && (
              <section className="practice-card answer-card">
                <span className="eyebrow">
                  <span className="tiny-line" /> ONE FOLLOW-UP
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  Would the developer need the service’s internal code? Why or
                  why not?
                </h1>
                <p className="intro">
                  Think about what the app needs to use, and what the service
                  can keep private.
                </p>
                <details className="answer-details">
                  <summary>See your explanation</summary>
                  <p className="learner-text">{state.answer}</p>
                </details>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setState((current) => saveAttempt(current));
                  }}
                >
                  <AnswerInput
                    id="followup-answer"
                    maxLength={MAX_ANSWER}
                    label="Your follow-up answer"
                    value={state.followup}
                    placeholder="I’d say…"
                    onChange={(followup) =>
                      setState((current) => ({ ...current, followup }))
                    }
                  />
                  <div className="actions">
                    <button
                      className="button primary"
                      disabled={!state.followup.trim()}
                    >
                      Open self-review <Icon name="arrow" size={18} />
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => go("transfer")}
                    >
                      Edit my explanation
                    </button>
                  </div>
                </form>
              </section>
            )}

            {state.step === "review" && (
              <section className="practice-card review-card">
                <span className="eyebrow">
                  <span className="tiny-line" /> SELF-REVIEW
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  A little clearer?
                </h1>
                <p className="intro">
                  Compare the idea with your answer. You decide what you can
                  explain.
                </p>
                <div className="worked-answer">
                  <span className="block-label">ONE WAY TO EXPLAIN IT</span>
                  <p>
                    “An API is an agreed way for software to interact. For this
                    weather service, a developer needs the endpoint and HTTP
                    method, the inputs it accepts, and the response format and
                    possible errors. For example, send a GET request with a city
                    and units, then read the temperature and condition from the
                    response. They can use that interface without seeing the
                    service’s internal code.”
                  </p>
                </div>
                <fieldset className="self-checks">
                  <legend>Can I explain these in my own words?</legend>
                  <label className={state.checks[0] ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={state.checks[0]}
                      onChange={(event) =>
                        setState((current) =>
                          setCheck(current, 0, event.target.checked),
                        )
                      }
                    />
                    <span>
                      <strong>How to ask, and what comes back.</strong>
                      <span>
                        I can name the request details (GET, endpoint, city,
                        units) and response details (fields like temperature, or
                        an error).
                      </span>
                    </span>
                  </label>
                  <label className={state.checks[1] ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={state.checks[1]}
                      onChange={(event) =>
                        setState((current) =>
                          setCheck(current, 1, event.target.checked),
                        )
                      }
                    />
                    <span>
                      <strong>The interface hides the internal work.</strong>
                      <span>
                        I can explain why another app can use the service
                        without needing its source code.
                      </span>
                    </span>
                  </label>
                </fieldset>
                <p className="self-review-note">
                  This is authored self-review. Your answers haven’t been
                  automatically graded. Checking a box is optional.
                </p>
                <AttemptComparison state={state} />
                <div className="actions">
                  {state.attempts.length < 2 && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        setState((current) => retryLesson(current))
                      }
                    >
                      <Icon name="replay" size={17} /> Retry
                    </button>
                  )}
                  <button
                    className="button primary"
                    onClick={() => go("finished")}
                  >
                    Finish <Icon name="check" size={18} />
                  </button>
                </div>
              </section>
            )}

            {state.step === "finished" && (
              <section className="practice-card finished-card">
                <span className="completion-icon">
                  <Icon name="check" size={30} />
                </span>
                <span className="eyebrow">LESSON COMPLETE</span>
                <h1 ref={heading} tabIndex={-1}>
                  One idea, a little clearer.
                </h1>
                <p className="intro">
                  You practiced explaining how software talks to software.
                  That’s a useful place to start.
                </p>
                <div className="takeaway">
                  <span className="block-label">TAKE IT WITH YOU</span>
                  <p>
                    An API describes how software can interact: what you can ask
                    for, how to ask, and what to expect back.
                  </p>
                </div>
                <p className="finish-summary">
                  Your self-review: {state.checks.filter(Boolean).length} of 2
                  points checked. You can keep practicing either way.
                </p>
                <AttemptComparison state={state} expanded />
                <RatingActions id="api" session={session} />
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() => go("review")}
                  >
                    Back to self-review
                  </button>
                  {state.attempts.length < 2 && (
                    <button
                      className="button primary"
                      onClick={() =>
                        setState((current) => retryLesson(current))
                      }
                    >
                      Try once more <Icon name="replay" size={17} />
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="lesson-footer">
          <p>
            <Icon
              name={storageStatus === "unavailable" ? "lock" : "check"}
              size={14}
            />
            <span role="status">
              {storageStatus === "unavailable"
                ? "Browser saving is unavailable. Keep this tab open to keep your work."
                : storageStatus === "saved"
                  ? "Saved on this browser"
                  : "Opening your practice"}
            </span>
          </p>
          <span>No account needed</span>
        </footer>
        <p className="privacy-note">
          Your drafts stay in this browser. They aren’t sent for feedback or
          synced yet.
        </p>
        {!session && (
          <nav aria-label="More practice" className="actions">
            <Link className="button secondary" href="/offline-chat">
              Practice system design: Offline chat
            </Link>
            <Link className="button secondary" href="/star">
              Practice behavioral interviews: STAR
            </Link>
          </nav>
        )}
      </main>
    </>
  );
}

function WeatherExample({
  trace,
  setTrace,
}: {
  trace: number;
  setTrace: (step: number) => void;
}) {
  const example = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches) setRunning(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!running || trace >= 4 || trace === 0) return;
    const timeout = window.setTimeout(() => {
      setTrace(trace + 1);
      if (trace + 1 === 4) setRunning(false);
    }, 2100);
    return () => window.clearTimeout(timeout);
  }, [running, trace, setTrace]);

  function start() {
    setTrace(1);
    setRunning(!reducedMotion);
    if (window.matchMedia("(max-width: 540px)").matches) {
      example.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  const current = TRACE_STEPS[trace];

  return (
    <div className="weather-example" ref={example}>
      <div className="diagram-topline">
        <span>
          <span className="diagram-dot" /> AUSTIN WEATHER
        </span>
        <span className="sample-tag">Interactive example · Fixed data</span>
      </div>
      <figure
        className={`weather-diagram trace-${trace} ${running ? "is-playing" : ""}`}
        aria-label="Weather app sends a request to a weather service; the service returns a response to the app"
      >
        <div
          className={`weather-app diagram-node ${trace === 1 || trace === 4 ? "active" : ""}`}
        >
          <div className="node-top">
            <span className="app-dots">
              <i />
              <i />
              <i />
            </span>
            <span>YOUR APP</span>
          </div>
          <div className="weather-screen">
            <span className="city-name">Austin, TX</span>
            <Sunshine />
            <div className="temperature">
              {trace === 4 ? (
                <>
                  {SAMPLE_WEATHER.temperature}
                  <span>°F</span>
                </>
              ) : (
                <span className="empty-temp">— °F</span>
              )}
            </div>
            <span className="weather-condition">
              {trace === 4 ? SAMPLE_WEATHER.condition : "Ready when you are"}
            </span>
            <button className="weather-button" onClick={start}>
              Check weather <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
        <div className="connection-lanes" aria-hidden="true">
          <div
            className={`connection request ${trace === 1 || trace === 2 ? "active" : ""}`}
          >
            <span className="connection-label">Request</span>
            <div className="connection-line">
              <span className="packet" />
              <span className="arrowhead">→</span>
            </div>
            <span className="connection-detail">“Weather for Austin?”</span>
          </div>
          <span className="api-pill">WEB API</span>
          <div
            className={`connection response ${trace === 3 || trace === 4 ? "active" : ""}`}
          >
            <span className="connection-label">Response</span>
            <div className="connection-line">
              <span className="packet" />
              <span className="arrowhead">←</span>
            </div>
            <span className="connection-detail">“78 °F and sunny.”</span>
          </div>
        </div>
        <div
          className={`weather-service diagram-node ${trace === 2 || trace === 3 ? "active" : ""}`}
        >
          <span className="service-icon">
            <Icon name="server" size={30} />
          </span>
          <span className="service-title">Weather service</span>
          <span className="service-description">
            Gets the weather.
            <br /> Returns the data.
          </span>
          <div className="service-interface">
            <span className="interface-dot" /> API endpoint{" "}
            <code>/weather</code>
          </div>
        </div>
        <figcaption className="sr-only">
          A web API is the service’s interface. The app sends a GET request for
          Austin. The service returns weather data, which the app displays.
        </figcaption>
      </figure>
      <div className="trace-caption" aria-live="polite" aria-atomic="true">
        <span className="trace-number">
          {trace === 0 ? <Icon name="play" size={17} /> : trace}
        </span>
        <div>
          <h2>{current.title}</h2>
          <p>{current.caption}</p>
        </div>
      </div>
      {trace > 0 && (
        <details className="payload">
          <summary>Look at the request and response</summary>
          <div className="payload-grid">
            <div>
              <span className="block-label">REQUEST · HTTP</span>
              <pre>GET /weather?city=Austin&amp;units=F</pre>
            </div>
            <div>
              <span className="block-label">RESPONSE · 200 OK · JSON</span>
              <pre>{JSON.stringify(SAMPLE_WEATHER, null, 2)}</pre>
            </div>
          </div>
          <p>
            Illustrative endpoint and sample data. No live weather request is
            made. A real service’s documentation would also describe
            authentication, limits, and errors.
          </p>
        </details>
      )}
      <div className="playback-controls" aria-label="Example playback">
        <button
          className="control-button"
          disabled={trace === 0}
          onClick={start}
        >
          <Icon name="replay" size={15} /> Replay
        </button>
        <button
          className="control-button"
          disabled={trace === 0 || trace === 4}
          onClick={() => setRunning(!running)}
        >
          <Icon name={running ? "pause" : "play"} size={15} />
          {running ? "Pause" : "Play"}
        </button>
        <span className="playback-spacer" />
        <button
          className="control-button"
          aria-label="Previous step"
          disabled={trace <= 1}
          onClick={() => {
            setRunning(false);
            setTrace(trace - 1);
          }}
        >
          Back
        </button>
        <button
          className="control-button"
          disabled={trace === 0 || trace === 4}
          onClick={() => {
            setRunning(false);
            setTrace(trace + 1);
          }}
        >
          Next step <Icon name="arrow" size={15} />
        </button>
      </div>
      <p className="example-hint">
        {reducedMotion
          ? "Motion is reduced. Use Next step to explore at your pace."
          : "Pause, replay, or step through whenever you like."}
      </p>
    </div>
  );
}

function AttemptComparison({
  state,
  expanded = false,
}: {
  state: LessonState;
  expanded?: boolean;
}) {
  return (
    <details className="attempt-comparison" open={expanded || undefined}>
      <summary>
        {state.attempts.length === 2
          ? "Compare your two attempts"
          : "Revisit your answers"}
        <span>
          {state.attempts.length}{" "}
          {state.attempts.length === 1 ? "attempt" : "attempts"} saved
        </span>
      </summary>
      {state.quickAnswer.trim() && (
        <div className="starting-answer">
          <span className="block-label">YOUR STARTING API EXPLANATION</span>
          <p className="learner-text">{state.quickAnswer}</p>
        </div>
      )}
      <div className="attempts-grid">
        {state.attempts.map((attempt, index) => (
          <article key={index} className="attempt">
            <span className="attempt-tag">ATTEMPT {index + 1}</span>
            <h2>What would another developer need?</h2>
            <p className="learner-text">{attempt.answer}</p>
            <h2>Would they need the internal code?</h2>
            <p className="learner-text">{attempt.followup}</p>
            <span className="attempt-check-count">
              Self-review: {attempt.checks.filter(Boolean).length} of 2 points
              checked
            </span>
          </article>
        ))}
      </div>
    </details>
  );
}
