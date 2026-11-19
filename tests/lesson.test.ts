import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FRESH_STATE,
  MAX_ANSWER,
  restoreLesson,
  retryLesson,
  saveAttempt,
  setCheck,
} from "../src/lib/lesson.ts";

const answer = {
  ...structuredClone(FRESH_STATE),
  step: "followup" as const,
  answer: "GET /weather with a city; read temperature or an error.",
  followup: "No, the interface tells the app how to use it.",
};

test("refresh preserves the current question, draft, and trace position", () => {
  const state = {
    ...structuredClone(FRESH_STATE),
    step: "transfer" as const,
    quickAnswer: "Software can ask other software to do something.",
    answer: "A draft that is still being written",
    trace: 3,
  };
  assert.deepEqual(restoreLesson(JSON.stringify(state)), state);
});

test("two attempts remain distinct and checks belong to their own attempt", () => {
  const first = setCheck(saveAttempt(answer), 0, true);
  const retry = retryLesson(first);
  assert.equal(retry.step, "transfer");
  assert.equal(retry.answer, "");
  assert.deepEqual(retry.checks, [false, false]);
  const second = setCheck(
    saveAttempt({
      ...retry,
      answer: "Endpoint, method, inputs and response fields.",
      followup:
        "The service can change its internal code without changing the agreed interface.",
    }),
    1,
    true,
  );
  assert.equal(second.attempts.length, 2);
  assert.deepEqual(second.attempts[0].checks, [true, false]);
  assert.deepEqual(second.attempts[1].checks, [false, true]);
  assert.equal(second.attempts[0].answer, answer.answer);
  assert.notEqual(second.attempts[0].answer, second.attempts[1].answer);
  assert.deepEqual(restoreLesson(JSON.stringify(second)), second);
  assert.equal(retryLesson(second), second);
  assert.equal(saveAttempt(second), second);
});

test("an empty or whitespace-only answer cannot become a completed attempt", () => {
  assert.equal(saveAttempt({ ...answer, answer: "  " }).attempts.length, 0);
  assert.equal(saveAttempt({ ...answer, followup: "\n" }).attempts.length, 0);
});

test("corrupt, incompatible, oversize, and impossible saved states recover safely", () => {
  for (const raw of [
    null,
    "broken json",
    "null",
    "[]",
    "{}",
    JSON.stringify({ ...answer, version: 9 }),
    JSON.stringify({ ...answer, step: "unknown" }),
    JSON.stringify({ ...answer, trace: -1 }),
    JSON.stringify({ ...answer, trace: 5 }),
    JSON.stringify({ ...answer, checks: ["true", false] }),
    JSON.stringify({ ...answer, answer: "x".repeat(MAX_ANSWER + 1) }),
    JSON.stringify({ ...answer, step: "review", attempts: [] }),
    JSON.stringify({ ...answer, answer: "" }),
  ]) {
    assert.deepEqual(restoreLesson(raw), FRESH_STATE);
  }
});

test("malformed saved attempts are not rendered as learner content", () => {
  const invalid = {
    ...saveAttempt(answer),
    attempts: [{ answer: {}, followup: [], checks: [false, false] }],
  };
  assert.deepEqual(restoreLesson(JSON.stringify(invalid)), FRESH_STATE);
});
