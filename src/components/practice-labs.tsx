"use client";

import { useState } from "react";

export function HtmlLab() {
  const [buttonCount, setButton] = useState(0);
  const [divCount, setDiv] = useState(0);
  return (
    <section className="practice-lab" aria-label="Keyboard control comparison">
      <h2>Try both controls</h2>
      <p>
        Use Tab to move between controls. Try Enter and Space, then click each
        control to compare.
      </p>
      <div className="lab-grid two">
        <div>
          <button
            type="button"
            className="button secondary"
            onClick={() => setButton((count) => count + 1)}
          >
            Native button
          </button>
          <p role="status">Native button activations: {buttonCount}</p>
        </div>
        <div>
          {/* Intentionally pointer-only to demonstrate the behavior of a plain div. */}
          <div
            className="button secondary demo-div"
            onClick={() => setDiv((count) => count + 1)}
          >
            Plain clickable div
          </div>
          <p role="status">Plain div activations: {divCount}</p>
        </div>
      </div>
    </section>
  );
}

type Price = 5 | 6;
type CacheResult = { path: "direct" | "miss" | "hit"; price: Price };
export type CacheState = {
  enabled: boolean;
  origin: Price;
  cached: Price | null;
  reads: number;
  result: CacheResult | null;
};
export const EMPTY_CACHE: CacheState = {
  enabled: false,
  origin: 5,
  cached: null,
  reads: 0,
  result: null,
};

export function restoreCache(value: unknown): CacheState {
  const price = (n: unknown): n is Price => n === 5 || n === 6;
  if (!value || typeof value !== "object") return EMPTY_CACHE;
  const state = value as CacheState;
  if (
    typeof state.enabled !== "boolean" ||
    !price(state.origin) ||
    !(state.cached === null || price(state.cached)) ||
    !Number.isSafeInteger(state.reads) ||
    state.reads < 0 ||
    (state.result !== null &&
      (!state.result ||
        !["direct", "miss", "hit"].includes(state.result.path) ||
        !price(state.result.price)))
  )
    return EMPTY_CACHE;
  return state;
}

export function CacheLab({
  state,
  change,
}: {
  state: CacheState;
  change: (next: CacheState) => void;
}) {
  const { enabled, origin, cached, reads, result } = state;
  function request() {
    if (enabled && cached !== null) {
      change({ ...state, result: { path: "hit", price: cached } });
      return;
    }
    change({
      ...state,
      reads: reads + 1,
      cached: enabled ? origin : null,
      result: { path: enabled ? "miss" : "direct", price: origin },
    });
  }

  return (
    <section className="practice-lab" aria-label="Cache simulator">
      <h2>Serve a café menu</h2>
      <p>
        Request the menu twice. Try with and without a cache. Then change the
        price at the database and request it again.
      </p>
      <figure
        className="cache-diagram"
        aria-label="App, optional cache, menu database"
      >
        <div data-used={Boolean(result)}>
          <strong>App</strong>
          <span>
            {result ? `Last reply: $${result.price}` : "Requests menu"}
          </span>
        </div>
        <span aria-hidden="true">→</span>
        <div data-used={result?.path === "hit" || result?.path === "miss"}>
          <strong>Cache</strong>
          <span>
            {enabled
              ? cached === null
                ? "Empty"
                : `$${cached} saved`
              : "Bypassed"}
          </span>
        </div>
        <span aria-hidden="true">→</span>
        <div data-used={Boolean(result && result.path !== "hit")}>
          <strong>Database</strong>
          <span>{`Menu: $${origin}`}</span>
          <span>Reads: {reads}</span>
        </div>
      </figure>
      <div className="actions">
        <button
          className="button secondary"
          type="button"
          aria-pressed={enabled}
          onClick={() =>
            change({ ...state, enabled: !enabled, cached: null, result: null })
          }
        >
          Use a cache
        </button>
        <button className="button primary" type="button" onClick={request}>
          Request menu
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={origin === 6}
          onClick={() => change({ ...state, origin: 6 })}
        >
          Update price to $6
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={cached === null}
          onClick={() => change({ ...state, cached: null, result: null })}
        >
          Invalidate cached menu
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => change(EMPTY_CACHE)}
        >
          Reset simulation
        </button>
      </div>
      <p role="status" className="lab-result">
        {result?.path === "hit"
          ? `Cache hit. The app received $${result.price} without reading the database.${result.price !== origin ? " The saved price is stale." : ""}`
          : result?.path === "miss"
            ? `Cache miss. The database returned $${result.price} and filled the cache.`
            : result?.path === "direct"
              ? `The app read $${result.price} directly from the database.`
              : "Make a request to see which components are used."}
      </p>
    </section>
  );
}
