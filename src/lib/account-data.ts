import { PLAN_KEY, restorePlan, type Plan } from "./practice-plan.ts";
import { STAR_STORAGE_KEY, restoreStar, type StarState } from "./star.ts";

export const LOCATION_KEY = "interview-practice:location:v1";
export type Records = Record<string, string>;
export type Snapshot = { records: Records; imports: string[] };
export type Conflict = {
  id: string;
  label: string;
  browser: unknown;
  account: unknown;
};
export type Choices = Record<string, "browser" | "account">;
export const EMPTY_SNAPSHOT: Snapshot = { records: {}, imports: [] };

const FIXED_KEYS = [
  "interview-practice:api:v1",
  "interview-practice:offline-chat:v1",
  PLAN_KEY,
  STAR_STORAGE_KEY,
  LOCATION_KEY,
];
const RECORD_PATTERN =
  /^interview-practice:(?:item:[a-z][a-z0-9-]*|run:[a-z0-9-]{1,80}:[a-z][a-z0-9-]*)$/;

export function isPracticeKey(key: string) {
  return FIXED_KEYS.includes(key) || RECORD_PATTERN.test(key);
}

export function activityPath(path: string) {
  return (
    path === "/" ||
    path === "/star" ||
    path === "/offline-chat" ||
    /^\/practice\/[a-z][a-z0-9-]*$/.test(path)
  );
}

export function restoreSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== "object") return EMPTY_SNAPSHOT;
  const data = value as Partial<Snapshot>;
  const records = Object.fromEntries(
    Object.entries(data.records ?? {}).filter(
      ([key, content]) =>
        isPracticeKey(key) &&
        typeof content === "string" &&
        (key !== LOCATION_KEY || activityPath(content)),
    ),
  );
  const imports = Array.isArray(data.imports)
    ? data.imports.filter((id) => /^[a-f0-9]{64}$/.test(id))
    : [];
  return { records, imports };
}

export function stableId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function normalizeGuest(records: Records, browserId: string): Records {
  const next: Records = {};
  const legacyId = (number: string | number) =>
    "legacy-" + browserId + "-" + number;
  for (const [key, value] of Object.entries(records)) {
    const normalized = key.replace(
      /^interview-practice:run:(\d+):/,
      (_, number: string) => "interview-practice:run:" + legacyId(number) + ":",
    );
    next[normalized] = value;
  }
  if (next[PLAN_KEY]) {
    const plan = restorePlan(next[PLAN_KEY]);
    if (plan.session && !plan.session.draftId) {
      next[PLAN_KEY] = JSON.stringify({
        ...plan,
        session: { ...plan.session, draftId: legacyId(plan.session.number) },
      });
    }
  }
  return next;
}

export async function importReceipt(records: Records): Promise<string> {
  const canonical = JSON.stringify(
    Object.entries(records).sort(([a], [b]) => a.localeCompare(b)),
  );
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function equal(a: unknown, b: unknown) {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

export function mergeRecords(
  base: Records,
  browser: Records,
  account: Records,
  choices: Choices = {},
) {
  const records: Records = {};
  const conflicts: Conflict[] = [];
  function pick<T>(
    id: string,
    label: string,
    before: T,
    local: T,
    remote: T,
  ): T {
    if (equal(local, remote) || equal(remote, before)) return local;
    if (equal(local, before)) return remote;
    if (choices[id]) return choices[id] === "browser" ? local : remote;
    conflicts.push({ id, label, browser: local, account: remote });
    return remote;
  }

  // The initial merge uses the values common to all devices. For an import
  // there is no common baseline, so unequal existing records require a choice.
  for (const key of new Set([
    ...Object.keys(base),
    ...Object.keys(browser),
    ...Object.keys(account),
  ])) {
    const [before, local, remote] = [base[key], browser[key], account[key]];
    if (key === LOCATION_KEY && local && remote) {
      records[key] = !before || local === before ? remote : local;
      continue;
    }
    if (
      local !== undefined &&
      remote !== undefined &&
      !equal(local, remote) &&
      !equal(before, local) &&
      !equal(before, remote)
    ) {
      if (key === STAR_STORAGE_KEY) {
        const [first, second, third] = [before, local, remote].map((raw) =>
          restoreStar(raw ?? null),
        );
        const ids = new Set(
          [first, second, third].flatMap((state) => [
            ...state.stories.map((story) => story.id),
            ...Object.keys(state.drafts),
          ]),
        );
        const stories: StarState["stories"] = [];
        const drafts: StarState["drafts"] = {};
        for (const id of ids) {
          const versions = [first, second, third].map((state) => ({
            story: state.stories.find((story) => story.id === id),
            draft: state.drafts[id],
          }));
          const title =
            versions[1].story?.fields.title ??
            versions[2].story?.fields.title ??
            "Unfinished STAR story";
          const selection = pick(
            "story:" + id,
            title,
            versions[0],
            versions[1],
            versions[2],
          );
          if (selection.story) stories.push(selection.story);
          if (selection.draft && (id === "new" || selection.story))
            drafts[id] = selection.draft;
        }
        // A view is a pointer, not independent work. Prefer the browser view
        // for ongoing practice, and the established account view on import.
        const view = before
          ? equal(second.view, first.view)
            ? third.view
            : second.view
          : third.view;
        records[key] = JSON.stringify(
          restoreStar(JSON.stringify({ stories, drafts, view })),
        );
        continue;
      }
      if (key === PLAN_KEY) {
        const [first, second, third] = [before, local, remote].map((raw) =>
          restorePlan(raw ?? null),
        );
        const reviews: Plan["reviews"] = {};
        for (const id of new Set(
          [first, second, third].flatMap((plan) => Object.keys(plan.reviews)),
        )) {
          const review = pick(
            "rating:" + id,
            "Progress for " + id,
            first.reviews[id],
            second.reviews[id],
            third.reviews[id],
          );
          if (review) reviews[id] = review;
        }
        const completed = Math.max(second.completed, third.completed);
        const session = pick(
          "session",
          "Mixed session position",
          first.session,
          second.session,
          third.session,
        );
        records[key] = JSON.stringify({
          completed,
          reviews,
          session: session
            ? {
                ...session,
                number:
                  completed + Number(session.position < session.items.length),
              }
            : null,
        });
        continue;
      }
    }
    const label =
      key === LOCATION_KEY
        ? "Last activity"
        : key.replace("interview-practice:", "");
    const value = pick(key, label, before, local, remote);
    if (value !== undefined) records[key] = value;
  }
  return { records, conflicts };
}
