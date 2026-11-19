"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./answer-input.module.css";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

function recognitionConstructor() {
  const browser = window as SpeechWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function speechError(error: string) {
  if (
    error === "not-allowed" ||
    error === "service-not-allowed" ||
    error === "NotAllowedError"
  ) {
    return "Microphone or speech access was denied. You can still type your answer.";
  }
  if (error === "no-speech")
    return "No speech was detected. Try again or type your answer.";
  return "Transcription is unavailable right now. You can still type your answer.";
}

export default function AnswerInput({
  id,
  label,
  value,
  placeholder,
  onChange,
  maxLength,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
}) {
  const instance = useRef<Recognition | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const result = useRef("");
  const [available, setAvailable] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "starting" | "listening" | "stopping"
  >("idle");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    setAvailable(Boolean(recognitionConstructor()));
    return () => {
      const active = instance.current;
      instance.current = null;
      active?.abort();
    };
  }, []);

  function start() {
    if (instance.current) return;
    const SpeechRecognition = recognitionConstructor();
    if (!SpeechRecognition) return;
    result.current = "";
    setTranscript("");
    setMessage("Waiting for microphone access…");
    setPhase("starting");

    try {
      const recognition = new SpeechRecognition();
      instance.current = recognition;
      const active = () => instance.current === recognition;
      let failed = false;
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onstart = () => {
        if (!active()) return;
        setPhase((current) => (current === "starting" ? "listening" : current));
        setMessage(
          "Listening. Tap Stop when you’re ready to review the transcript.",
        );
      };
      recognition.onresult = (event) => {
        if (!active()) return;
        result.current = Array.from(event.results)
          .filter((item) => item.isFinal)
          .map((item) => item[0].transcript.trim())
          .join(" ")
          .slice(0, maxLength);
      };
      recognition.onerror = (event) => {
        if (!active()) return;
        failed = true;
        setMessage(speechError(event.error));
      };
      recognition.onend = () => {
        if (!active()) return;
        instance.current = null;
        setPhase("idle");
        setTranscript(result.current);
        if (result.current && !failed)
          setMessage(
            "Transcript ready. Add it to your draft, then edit it before submitting.",
          );
        else if (!failed)
          setMessage(
            "No transcript was returned. Try again or type your answer.",
          );
      };
      recognition.start();
    } catch (error) {
      instance.current = null;
      setPhase("idle");
      setMessage(speechError(error instanceof Error ? error.name : ""));
    }
  }

  function stop() {
    const active = instance.current;
    if (!active) return;
    setPhase("stopping");
    setMessage("Finishing transcription…");
    try {
      active.stop();
    } catch {
      instance.current = null;
      setPhase("idle");
      setMessage("Transcription stopped. You can still type your answer.");
    }
  }

  function addTranscript() {
    const separator = value && !/\s$/.test(value) ? " " : "";
    onChange((value + separator + transcript).slice(0, maxLength));
    setTranscript("");
    setMessage("Transcript added to your draft. Edit it before submitting.");
    input.current?.focus();
  }

  return (
    <div className="answer-input">
      <div className="input-label-row">
        <label htmlFor={id}>{label}</label>
      </div>
      <textarea
        ref={input}
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
      />
      {value.length > maxLength - 500 && (
        <span className="input-help">
          {maxLength - value.length} characters left
        </span>
      )}
      {available && (
        <div className={styles.voice}>
          {phase === "idle" ? (
            <button
              type="button"
              className="button secondary"
              onClick={start}
              disabled={Boolean(transcript)}
            >
              Start dictation
            </button>
          ) : (
            <button
              type="button"
              className="button secondary"
              onClick={stop}
              disabled={phase === "stopping"}
            >
              Stop dictation
            </button>
          )}
          <p id={id + "-voice-note"}>
            Your browser may send audio to its speech provider for
            transcription.
          </p>
        </div>
      )}
      <div className={styles.status} role="status">
        {message}
      </div>
      {transcript && (
        <div className={styles.transcript} aria-label="Dictation preview">
          <strong>Transcript preview</strong>
          <p>{transcript}</p>
          <div className={styles.voice}>
            <button
              type="button"
              className="button secondary"
              onClick={addTranscript}
              disabled={value.length >= maxLength}
            >
              Add to answer
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTranscript("");
                setMessage("Transcript discarded.");
              }}
            >
              Discard transcript
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
