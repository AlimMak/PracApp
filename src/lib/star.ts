export const STAR_STORAGE_KEY = "interview-practice:star:v1";
export const STAR_FIELDS = [
  "situation",
  "task",
  "action",
  "result",
  "title",
  "cues",
] as const;
export const STORY_LIMIT = 3000;
export const TITLE_LIMIT = 96;
export const CUE_LIMIT = 200;
export type StoryFields = Record<(typeof STAR_FIELDS)[number], string>;

export const EMPTY_STORY: StoryFields = {
  situation: "",
  task: "",
  action: "",
  result: "",
  title: "",
  cues: "",
};

export type Draft = { fields: StoryFields; step: number };
export type Rehearsal = {
  step: "answer" | "followup" | "review";
  answer: string;
  followup: string;
  answerAloud: boolean;
  followupAloud: boolean;
  checks: number[];
};
export type Story = { id: string; fields: StoryFields; attempts: Rehearsal[] };
export type View =
  | { screen: "example" | "library" }
  | { screen: "edit" | "practice"; id: string };

export type StarState = {
  view: View;
  stories: Story[];
  drafts: Record<string, Draft>;
};
export const FRESH_STAR: StarState = {
  view: { screen: "example" },
  stories: [],
  drafts: {},
};

export function newRehearsal(): Rehearsal {
  return {
    step: "answer",
    answer: "",
    followup: "",
    answerAloud: false,
    followupAloud: false,
    checks: [],
  };
}

export function advanceRehearsal(
  attempt: Rehearsal,
  aloud: boolean,
): Rehearsal {
  if (attempt.step === "review") return attempt;
  if (attempt.step === "answer") {
    if (!aloud && !attempt.answer.trim()) return attempt;
    return { ...attempt, step: "followup", answerAloud: aloud };
  }
  if (!aloud && !attempt.followup.trim()) return attempt;
  return { ...attempt, step: "review", followupAloud: aloud };
}

export function openEditor(state: StarState, id: string): StarState {
  const story = state.stories.find((item) => item.id === id);
  if (id !== "new" && !story) return state;
  return {
    ...state,
    view: { screen: "edit", id },
    drafts: {
      ...state.drafts,
      [id]: state.drafts[id] ?? {
        fields: story?.fields ?? EMPTY_STORY,
        step: 0,
      },
    },
  };
}

export function discardDraft(state: StarState, id: string): StarState {
  const drafts = { ...state.drafts };
  delete drafts[id];
  return { ...state, drafts, view: { screen: "library" } };
}

export function saveStory(
  state: StarState,
  id: string,
  newId: string,
): StarState {
  const draft = state.drafts[id];
  if (!draft || !completeStory(draft.fields)) return state;
  const stories =
    id === "new"
      ? [...state.stories, { id: newId, fields: draft.fields, attempts: [] }]
      : state.stories.map((story) =>
          story.id === id ? { ...story, fields: draft.fields } : story,
        );
  return { ...discardDraft(state, id), stories };
}

export function deleteStory(state: StarState, id: string): StarState {
  return {
    ...discardDraft(state, id),
    stories: state.stories.filter((story) => story.id !== id),
  };
}

export function completeStory(fields: StoryFields) {
  return STAR_FIELDS.every(
    (key) => key === "cues" || fields[key].trim().length > 0,
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, limit = STORY_LIMIT): value is string {
  return typeof value === "string" && value.length <= limit;
}

function isFields(value: unknown): value is StoryFields {
  return (
    record(value) &&
    STAR_FIELDS.every((key) =>
      text(
        value[key],
        key === "cues"
          ? CUE_LIMIT
          : key === "title"
            ? TITLE_LIMIT
            : STORY_LIMIT,
      ),
    )
  );
}

function isRehearsal(value: unknown): value is Rehearsal {
  return (
    record(value) &&
    (value.step === "answer" ||
      value.step === "followup" ||
      value.step === "review") &&
    text(value.answer) &&
    text(value.followup) &&
    typeof value.answerAloud === "boolean" &&
    typeof value.followupAloud === "boolean" &&
    Array.isArray(value.checks) &&
    value.checks.every(
      (check) => Number.isInteger(check) && check >= 0 && check < 4,
    ) &&
    (value.step === "answer" ||
      value.answerAloud ||
      value.answer.trim().length > 0) &&
    (value.step !== "review" ||
      value.followupAloud ||
      value.followup.trim().length > 0)
  );
}

function isStory(value: unknown): value is Story {
  return (
    record(value) &&
    typeof value.id === "string" &&
    /^[a-f0-9]{32}$/.test(value.id) &&
    isFields(value.fields) &&
    completeStory(value.fields) &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isRehearsal)
  );
}

export function restoreStar(raw: string | null): StarState {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (
      !record(value) ||
      !record(value.view) ||
      !Array.isArray(value.stories) ||
      !value.stories.every(isStory) ||
      !record(value.drafts)
    )
      return FRESH_STAR;

    const stories = value.stories;
    const ids = new Set(stories.map((story) => story.id));
    if (ids.size !== stories.length) return FRESH_STAR;
    const drafts: Record<string, Draft> = {};
    for (const [id, draft] of Object.entries(value.drafts)) {
      if (
        (id === "new" || ids.has(id)) &&
        record(draft) &&
        isFields(draft.fields) &&
        typeof draft.step === "number" &&
        Number.isInteger(draft.step) &&
        draft.step >= 0 &&
        draft.step <= 4
      ) {
        drafts[id] = { fields: draft.fields, step: draft.step };
      }
    }

    const { screen, id } = value.view;
    let view: View = { screen: "library" };
    if (screen === "example") view = { screen };
    if (
      screen === "edit" &&
      typeof id === "string" &&
      Object.hasOwn(drafts, id)
    )
      view = { screen, id };
    if (
      screen === "practice" &&
      typeof id === "string" &&
      stories.some((story) => story.id === id && story.attempts.length)
    ) {
      view = { screen, id };
    }
    return { view, stories, drafts };
  } catch {
    return FRESH_STAR;
  }
}
