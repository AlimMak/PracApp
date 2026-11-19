import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_STORY,
  FRESH_STAR,
  advanceRehearsal,
  deleteStory,
  discardDraft,
  newRehearsal,
  openEditor,
  restoreStar,
  saveStory,
  type StarState,
} from "../src/lib/star.ts";

const id = "a".repeat(32);
const storyFields = {
  ...EMPTY_STORY,
  title: "Project handoff",
  situation: "A teammate was blocked on a dependency.",
  task: "I owned the handoff.",
  action: "I wrote down the missing steps and paired on setup.",
  result: "My teammate ran the project without help.",
};

function savedStory(): StarState {
  const state = openEditor(FRESH_STAR, "new");
  state.drafts.new = { fields: storyFields, step: 4 };
  return saveStory(state, "new", id);
}

test("save keeps learner-provided fields and accepts an observable result without a number", () => {
  const state = savedStory();
  assert.deepEqual(state.stories[0].fields, storyFields);
  assert.deepEqual(state.stories[0].attempts, []);
  assert.equal(state.drafts.new, undefined);
  assert.deepEqual(restoreStar(JSON.stringify(state)), state);
});

test("canceling edits keeps the saved story and deleting removes its draft and attempts", () => {
  const state = openEditor(savedStory(), id);
  state.drafts[id] = {
    fields: { ...storyFields, title: "Unsaved edits" },
    step: 4,
  };
  state.stories[0].attempts = [newRehearsal()];
  assert.equal(
    discardDraft(state, id).stories[0].fields.title,
    "Project handoff",
  );
  assert.deepEqual(restoreStar(JSON.stringify(state)), state);
  const deleted = deleteStory(state, id);
  assert.deepEqual(deleted.stories, []);
  assert.equal(deleted.drafts[id], undefined);
  assert.deepEqual(deleted.view, { screen: "library" });
});

test("aloud rehearsal can reach review without creating answer text", () => {
  const first = newRehearsal();
  assert.equal(advanceRehearsal(first, false), first);
  const followup = advanceRehearsal(first, true);
  const review = advanceRehearsal(followup, true);
  assert.equal(review.step, "review");
  assert.equal(review.answer, "");
  assert.equal(review.followup, "");
  assert.equal(review.answerAloud, true);
  assert.equal(review.followupAloud, true);
});

test("invalid saved data is rejected and orphaned draft views leave other stories intact", () => {
  assert.equal(restoreStar("broken JSON"), FRESH_STAR);
  const state = savedStory();
  const orphaned = restoreStar(
    JSON.stringify({ ...state, view: { screen: "edit", id: "bad-id" } }),
  );
  assert.deepEqual(orphaned, state);
  const invalid = {
    ...state,
    stories: [
      {
        ...state.stories[0],
        attempts: [{ ...newRehearsal(), step: "review" }],
      },
    ],
  };
  assert.equal(restoreStar(JSON.stringify(invalid)), FRESH_STAR);
});
