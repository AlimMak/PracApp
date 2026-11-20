import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIVITIES, QUESTIONS, TRACKS } from "../src/lib/curriculum.ts";
import {
  EMPTY_PLAN,
  nextTopic,
  restorePlan,
  reviewItem,
  startSession,
} from "../src/lib/practice-plan.ts";

test("curriculum has unique routes and all six CS topics have the full question flow", () => {
  assert.equal(
    new Set(ACTIVITIES.map((item) => item.href)).size,
    ACTIVITIES.length,
  );
  const cs = QUESTIONS.filter((item) => item.track === "CS fundamentals");
  assert.equal(cs.length, 6);
  for (const item of cs) {
    assert.ok(item.quick && item.example && item.transfer && item.followup);
    assert.equal(new Set([item.quick, item.transfer, item.followup]).size, 3);
    assert.ok(item.rubric.length >= 2);
  }
});

test("the first session has all three tracks and reload keeps its current item", () => {
  const plan = startSession(EMPTY_PLAN);
  assert.deepEqual(
    plan.session?.items.map(
      (id) => ACTIVITIES.find((item) => item.id === id)?.track,
    ),
    TRACKS,
  );
  const current = reviewItem(plan, "semantic-html", "I can explain this", 1);
  const restored = restorePlan(JSON.stringify(current));
  assert.deepEqual(restored, current);
  assert.equal(
    startSession(restored).session?.items[restored.session!.position],
    "cache",
  );
});

test("missed concepts recur while the other activities rotate", () => {
  const first = startSession(EMPTY_PLAN);
  const one = reviewItem(first, "semantic-html", "Still practicing", 1);
  const two = reviewItem(one, "cache", "I can explain this", 1);
  const done = reviewItem(two, "teamwork", "I can explain this", 1);
  assert.equal(done.completed, 1);
  assert.equal(nextTopic(done).id, "semantic-html");
  const repeat = startSession(done);
  assert.deepEqual(repeat.session?.items, [
    "semantic-html",
    "offline-chat",
    "mistakes",
  ]);
  assert.equal(
    reviewItem(repeat, "semantic-html", "I can explain this", 1),
    repeat,
  );
  const improved = reviewItem(repeat, "semantic-html", "I can explain this", 2);
  assert.equal(nextTopic(improved).id, "http");
});

test("direct results guide the next session without advancing it", () => {
  const updated = reviewItem(EMPTY_PLAN, "indexes", "Still practicing");
  assert.equal(nextTopic(updated).id, "indexes");
  assert.equal(startSession(updated).session?.items[0], "indexes");
  const active = startSession(updated);
  const direct = reviewItem(active, "indexes", "I can explain this");
  assert.equal(direct.session?.position, 0);
});

test("invalid session data is discarded without losing valid reviews", () => {
  const plan = reviewItem(
    startSession(EMPTY_PLAN),
    "indexes",
    "Still practicing",
  );
  const invalid = {
    ...plan,
    session: { ...plan.session, items: ["cache", "http", "star"] },
  };
  assert.equal(restorePlan(JSON.stringify(invalid)).session, null);
  assert.equal(
    restorePlan(JSON.stringify(invalid)).reviews.indexes.rating,
    "Still practicing",
  );
  assert.equal(restorePlan("broken"), EMPTY_PLAN);
});
