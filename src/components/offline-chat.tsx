"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  CHAT_ANSWER_LIMIT,
  CHAT_STORAGE_KEY,
  COMPONENTS,
  FRESH_CHAT,
  chatReducer,
  installed,
  restoreChat,
  retainsMessage,
  type ChatState,
  type Component,
  type Phase,
} from "@/lib/chat-design";
import styles from "./offline-chat.module.css";

const CAPTIONS: Partial<Record<Phase, string>> = {
  "online-ready":
    "Both people are online. Send a message to see where it goes.",
  "online-sending": "Maya sends “See you at 5!” to the chat server.",
  "online-server":
    "The chat server accepts the message and forwards it to Leo.",
  "online-delivered": "Leo is online and receives “See you at 5!”",
  design: "Leo is offline. What should the server do with Maya’s next message?",
  "offline-sending": "Maya sends a new message: “Meet me in the lobby.”",
  "offline-server":
    "The server accepts the message, but Leo can’t receive it while offline.",
  waiting:
    "The server puts the message in durable storage. It can wait there while Leo is offline.",
  delivered:
    "Leo reconnects. The server reads the saved message and delivers it to Leo.",
  missed:
    "Leo reconnects, but the server has no saved message to retrieve. Nothing is delivered.",
};

function screen(phase: Phase) {
  if (phase.startsWith("online-")) return "online";
  if (phase === "design") return "design";
  if (phase in CAPTIONS || phase === "lost") return "simulation";
  return phase;
}

function ChatDiagram({
  state,
  selected,
  onPlace,
}: {
  state: ChatState;
  selected: Component | null;
  onPlace: (component: Component) => void;
}) {
  const { phase } = state;
  const component = installed(state);
  const onlineExample = phase.startsWith("online-");
  const connected =
    onlineExample || phase === "delivered" || phase === "missed";
  const fromSender = phase === "online-sending" || phase === "offline-sending";
  const fromServer = phase === "online-server" || phase === "delivered";
  const received = phase === "online-delivered" || phase === "delivered";
  const blocked = ["offline-server", "waiting", "lost", "missed"].includes(
    phase,
  );
  const serverActive = [
    "online-server",
    "offline-server",
    "waiting",
    "lost",
  ].includes(phase);
  const caption =
    phase === "lost"
      ? component === "relay"
        ? "Delivery stops at the live relay. Leo is offline, and the relay keeps no copy."
        : "Delivery stops at the server. There’s nowhere to save the message while Leo is offline."
      : CAPTIONS[phase];

  return (
    <section className={styles.visual} aria-label="Chat message diagram">
      <div className={styles.topology}>
        <div className={styles.node} data-active={fromSender}>
          <span>Sender</span>
          <strong>Maya</strong>
        </div>
        <div className={styles.hop} data-travel={fromSender} aria-hidden="true">
          →{fromSender && <i />}
        </div>
        <div className={styles.node} data-active={serverActive}>
          <span>Routes messages</span>
          <strong>Chat server</strong>
        </div>
        <div
          className={styles.hop}
          data-travel={fromServer}
          data-blocked={blocked}
          aria-hidden="true"
        >
          {blocked ? "⊣" : "→"}
          {fromServer && <i />}
        </div>
        <div className={styles.node} data-active={received}>
          <span>Recipient</span>
          <strong>Leo</strong>
          <span className={styles.presence} data-online={connected}>
            {connected ? "Online" : "Offline"}
          </span>
          {received && <span className={styles.received}>Received</span>}
        </div>
      </div>
      {!onlineExample && (
        <div className={styles.slotBranch}>
          {phase === "design" ? (
            <button
              type="button"
              className={styles.slot}
              aria-disabled={!selected}
              onClick={() => {
                if (selected) onPlace(selected);
              }}
            >
              <span>Server attachment point</span>
              <strong>
                {component ? COMPONENTS[component].label : "Empty slot"}
              </strong>
              <small>
                {selected
                  ? `Place ${COMPONENTS[selected].label} here`
                  : "Select a component to place here"}
              </small>
            </button>
          ) : (
            <div className={styles.slot} data-held={phase === "waiting"}>
              <span>Server attachment point</span>
              <strong>
                {component ? COMPONENTS[component].label : "Empty slot"}
              </strong>
              {phase === "waiting" && <small>Message saved here</small>}
            </div>
          )}
        </div>
      )}
      <div className={styles.caption} role="status" aria-atomic="true">
        {caption}
        {received && (
          <span className={styles.message}>
            {onlineExample ? "See you at 5!" : "Meet me in the lobby."}
          </span>
        )}
      </div>
    </section>
  );
}

export default function OfflineChat() {
  const [state, dispatch] = useReducer(chatReducer, FRESH_CHAT);
  const [selected, setSelected] = useState<Component | null>(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextAction = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef<Phase>("online-ready");
  const { phase } = state;
  const current = screen(phase);
  const online = current === "online";
  const designing = current === "design";
  const running = current === "simulation";
  const canReconnect = phase === "waiting" || phase === "lost";
  const outcome = phase === "delivered" || phase === "missed";
  const writing = phase === "explain" || phase === "followup";
  const field = phase === "followup" ? "followup" : "answer";
  const durable = retainsMessage(state);
  const attachment = installed(state);

  useEffect(() => {
    try {
      const restored = restoreChat(localStorage.getItem(CHAT_STORAGE_KEY));
      dispatch({ type: "restore", state: restored });
    } catch {
      setSaved(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      setSaved(false);
    }
  }, [ready, state]);

  useEffect(() => {
    if (
      ![
        "online-sending",
        "online-server",
        "offline-sending",
        "offline-server",
      ].includes(phase)
    )
      return;
    const timer = window.setTimeout(() => dispatch({ type: "advance" }), 1100);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!ready || previousPhase.current === phase) return;
    const newScreen = screen(previousPhase.current) !== current;
    previousPhase.current = phase;
    if (newScreen) heading.current?.focus();
    else nextAction.current?.focus();
  }, [ready, phase, current]);

  const title = online
    ? "Send a message while Leo is online"
    : designing
      ? "Design for an offline recipient"
      : running
        ? state.mode === "watch"
          ? "Watch a message wait for Leo"
          : "See what your design does"
        : phase === "explain"
          ? state.mode === "watch"
            ? "Why did the message store help?"
            : "Why did you choose this design?"
          : phase === "followup"
            ? "What should the server do when Leo reconnects?"
            : phase === "review"
              ? "Compare your reasoning"
              : "Offline chat complete";

  function retry() {
    setSelected(null);
    dispatch({ type: "retry" });
  }

  return (
    <>
      <a className="skip-link" href="#chat-practice" tabIndex={0}>
        Skip to practice
      </a>
      <header className={`site-header ${styles.header}`}>
        <Link className="brand" href="/">
          Interview Practice
        </Link>
        <Link href="/">API lesson</Link>
      </header>
      <main
        className={`lesson-shell ${styles.shell}`}
        id="chat-practice"
        tabIndex={-1}
      >
        <p className={styles.topic}>
          System design <span aria-hidden="true">/</span> Offline chat
        </p>
        {!ready ? (
          <p role="status">Opening your practice…</p>
        ) : (
          <section className={`practice-card ${styles.card}`}>
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>

            {(online || designing || running) && (
              <>
                {designing && (
                  <p className="intro">
                    Choose a component, then place it at the server attachment
                    point.
                  </p>
                )}
                {designing && (
                  <div
                    className={styles.options}
                    role="group"
                    aria-label="Choose a component"
                  >
                    {(Object.keys(COMPONENTS) as Component[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected === id}
                        onClick={() => setSelected(id)}
                      >
                        <strong>{COMPONENTS[id].label}</strong>
                        <span>{COMPONENTS[id].description}</span>
                      </button>
                    ))}
                  </div>
                )}
                <ChatDiagram
                  state={state}
                  selected={selected}
                  onPlace={(component) => {
                    dispatch({ type: "place", component });
                    setSelected(null);
                  }}
                />
              </>
            )}

            {online && (
              <div className="actions">
                {phase === "online-delivered" ? (
                  <button
                    ref={nextAction}
                    className="button primary"
                    onClick={() => dispatch({ type: "design" })}
                  >
                    Make Leo offline
                  </button>
                ) : (
                  <button
                    className="button primary"
                    aria-disabled={phase !== "online-ready"}
                    onClick={() => dispatch({ type: "send" })}
                  >
                    Send
                  </button>
                )}
              </div>
            )}

            {designing && (
              <div className="actions">
                <button
                  className="button primary"
                  onClick={() => dispatch({ type: "run" })}
                >
                  Run example
                </button>
                <button
                  className="button secondary"
                  disabled={state.history.length <= 1}
                  onClick={() => {
                    dispatch({ type: "undo" });
                    setSelected(null);
                  }}
                >
                  Undo placement
                </button>
                <button
                  className={`text-button ${styles.watch}`}
                  onClick={() => dispatch({ type: "watch" })}
                >
                  Watch and explain instead
                </button>
              </div>
            )}

            {running && (
              <div className="actions">
                {canReconnect && (
                  <button
                    ref={nextAction}
                    className="button primary"
                    onClick={() => dispatch({ type: "reconnect" })}
                  >
                    Reconnect Leo
                  </button>
                )}
                {outcome && (
                  <button
                    key="explain"
                    ref={nextAction}
                    className="button primary"
                    onClick={() => dispatch({ type: "explain" })}
                  >
                    Explain what happened
                  </button>
                )}
              </div>
            )}

            {writing && (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  dispatch({
                    type: phase === "explain" ? "followup" : "review",
                  });
                }}
              >
                <p className="intro">
                  {phase === "explain"
                    ? "Describe what happens to an accepted message while Leo is offline."
                    : "Explain how the server finds any waiting messages and gets them to Leo."}
                </p>
                <label htmlFor="chat-answer">
                  {phase === "explain"
                    ? "Your explanation"
                    : "Your follow-up answer"}
                </label>
                <textarea
                  key={field}
                  id="chat-answer"
                  rows={4}
                  maxLength={CHAT_ANSWER_LIMIT}
                  value={state[field]}
                  onChange={(event) =>
                    dispatch({
                      type: "draft",
                      field,
                      value: event.target.value,
                    })
                  }
                />
                <div className="actions">
                  <button
                    className="button primary"
                    disabled={!state[field].trim()}
                  >
                    {phase === "explain" ? "Continue" : "See feedback"}
                  </button>
                </div>
              </form>
            )}

            {phase === "review" && (
              <>
                <div className={styles.feedback}>
                  <h2>What your run showed</h2>
                  <p>
                    {durable && attachment
                      ? `${COMPONENTS[attachment].label} retained the message. After Leo reconnected, the server could retrieve and deliver it.`
                      : "The server accepted the message, but it had no saved copy to deliver when Leo reconnected. A message store or durable queue would make that possible."}
                  </p>
                  <h2>Check your explanation</h2>
                  <p>
                    Did you name where the message waits and what triggers the
                    server to deliver it? The server can look up Leo’s pending
                    messages when he reconnects and mark each delivered after
                    his app acknowledges it.
                  </p>
                  <p className={styles.selfReview}>
                    Self-review based on the simulation. Compare the points
                    above with your own explanation.
                  </p>
                </div>
                <details className={styles.answers}>
                  <summary>
                    Your answers{state.previous ? " and previous attempt" : ""}
                  </summary>
                  <p>{state.answer}</p>
                  <p>{state.followup}</p>
                  {state.previous && (
                    <>
                      <h2>
                        Previous attempt ·{" "}
                        {state.previous.component
                          ? COMPONENTS[state.previous.component].label
                          : "Empty slot"}
                      </h2>
                      <p>{state.previous.answer}</p>
                      <p>{state.previous.followup}</p>
                    </>
                  )}
                </details>
                <div className="actions">
                  <button
                    className="button primary"
                    onClick={() => dispatch({ type: "finish" })}
                  >
                    Finish
                  </button>
                  <button className="button secondary" onClick={retry}>
                    Retry design
                  </button>
                </div>
              </>
            )}

            {phase === "finished" && (
              <>
                <p className="intro">
                  Save the message while the recipient is offline, then retrieve
                  and deliver it after they reconnect.
                </p>
                <div className="actions">
                  <button className="button secondary" onClick={retry}>
                    Retry design
                  </button>
                  <Link className="button primary" href="/">
                    Practice explaining APIs
                  </Link>
                </div>
              </>
            )}
          </section>
        )}
        {ready && (
          <p className={styles.save} role="status">
            {saved
              ? "Progress and answers stay in this browser."
              : "Browser saving is unavailable. Keep this tab open to keep your work."}
          </p>
        )}
      </main>
    </>
  );
}
