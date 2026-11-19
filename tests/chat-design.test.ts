import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chatReducer,
  FRESH_CHAT,
  installed,
  restoreChat,
  type ChatState,
  type Slot,
} from "../src/lib/chat-design.ts";

function design(): ChatState {
  let state = chatReducer(FRESH_CHAT, { type: "send" });
  assert.equal(state.phase, "online-sending");
  state = chatReducer(state, { type: "advance" });
  assert.equal(state.phase, "online-server");
  state = chatReducer(state, { type: "advance" });
  assert.equal(state.phase, "online-delivered");
  return chatReducer(state, { type: "design" });
}

function offline(component: Slot) {
  let state = design();
  if (component) state = chatReducer(state, { type: "place", component });
  state = chatReducer(state, { type: "run" });
  assert.equal(state.phase, "offline-sending");
  state = chatReducer(state, { type: "advance" });
  assert.equal(state.phase, "offline-server");
  assert.equal(chatReducer(state, { type: "reconnect" }), state);
  return chatReducer(state, { type: "advance" });
}

test("both durable components retain the accepted message until reconnect", () => {
  for (const component of ["store", "queue"] as const) {
    const state = offline(component);
    assert.equal(state.phase, "waiting");
    assert.equal(chatReducer(state, { type: "reconnect" }).phase, "delivered");
  }
});

test("a live relay or empty slot accepts but loses the message before reconnect", () => {
  for (const component of ["relay", null] as const) {
    const state = offline(component);
    assert.equal(state.phase, "lost");
    assert.equal(chatReducer(state, { type: "reconnect" }).phase, "missed");
  }
});

test("replacing a component is undoable back to an empty slot", () => {
  let state = chatReducer(design(), { type: "place", component: "store" });
  state = chatReducer(state, { type: "place", component: "relay" });
  assert.equal(installed(state), "relay");
  state = chatReducer(state, { type: "undo" });
  assert.equal(installed(state), "store");
  state = chatReducer(state, { type: "undo" });
  assert.equal(installed(state), null);
  assert.equal(chatReducer(state, { type: "undo" }), state);
});

test("watch uses the same simulation and retry preserves the completed explanation", () => {
  let state = chatReducer(design(), { type: "watch" });
  assert.equal(state.mode, "watch");
  assert.equal(installed(state), "store");
  state = chatReducer(chatReducer(state, { type: "advance" }), {
    type: "advance",
  });
  assert.equal(state.phase, "waiting");
  state = chatReducer(state, { type: "reconnect" });
  state = chatReducer(state, { type: "explain" });
  state = chatReducer(state, {
    type: "draft",
    field: "answer",
    value: "The server saves it.",
  });
  assert.deepEqual(restoreChat(JSON.stringify(state)), state);
  state = chatReducer(state, { type: "followup" });
  state = chatReducer(state, {
    type: "draft",
    field: "followup",
    value: "Read pending messages on reconnect.",
  });
  state = chatReducer(state, { type: "review" });
  state = chatReducer(state, { type: "retry" });
  assert.equal(state.phase, "design");
  assert.equal(state.answer, "");
  assert.equal(state.previous?.answer, "The server saves it.");
});

test("invalid saves fall back to a fresh activity", () => {
  for (const raw of [
    "broken",
    JSON.stringify({ ...FRESH_CHAT, phase: "waiting" }),
    JSON.stringify({ ...FRESH_CHAT, history: ["unknown"] }),
    JSON.stringify({ ...FRESH_CHAT, phase: "review" }),
  ]) {
    assert.equal(restoreChat(raw), FRESH_CHAT);
  }
});
