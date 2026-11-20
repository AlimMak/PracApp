import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  EMPTY_SNAPSHOT,
  importReceipt,
  mergeRecords,
  normalizeGuest,
  type Snapshot,
} from "../src/lib/account-data.ts";
import {
  AccountSync,
  type RemoteVersion,
  type SyncState,
} from "../src/lib/account-sync.ts";
import {
  PLAN_KEY,
  EMPTY_PLAN,
  startSession,
  restorePlan,
} from "../src/lib/practice-plan.ts";
import {
  EMPTY_STORY,
  FRESH_STAR,
  STAR_STORAGE_KEY,
  restoreStar,
  type Story,
} from "../src/lib/star.ts";

function story(id: string, title: string): Story {
  return {
    id: id.repeat(32),
    fields: {
      ...EMPTY_STORY,
      title,
      situation: "A test project",
      task: "Own the demo",
      action: "Ran the demo",
      result: "It worked",
    },
    attempts: [],
  };
}
function star(...stories: Story[]) {
  return JSON.stringify({
    ...FRESH_STAR,
    view: { screen: "library" },
    stories,
  });
}

test("three-way merge preserves different stories and surfaces overlapping edit or delete", () => {
  const original = story("a", "Original");
  const extra = story("b", "Another story");
  const updated = story("a", "Browser edit");
  const base = { [STAR_STORAGE_KEY]: star(original) };
  const browser = { [STAR_STORAGE_KEY]: star(updated) };
  const account = { [STAR_STORAGE_KEY]: star(extra) };
  const result = mergeRecords(base, browser, account);
  assert.equal(result.conflicts[0].label, "Browser edit");
  const kept = mergeRecords(base, browser, account, {
    ["story:" + original.id]: "browser",
  });
  assert.deepEqual(
    restoreStar(kept.records[STAR_STORAGE_KEY]).stories.map((item) => item.id),
    [original.id, extra.id],
  );
  const deleted = mergeRecords(base, browser, account, {
    ["story:" + original.id]: "account",
  });
  assert.deepEqual(restoreStar(deleted.records[STAR_STORAGE_KEY]).stories, [
    extra,
  ]);
});

test("guest retry has a stable receipt and legacy session drafts get collision-free keys", async () => {
  const records = {
    [PLAN_KEY]: JSON.stringify(startSession(EMPTY_PLAN)),
    "interview-practice:run:1:semantic-html": "draft",
  };
  const left = normalizeGuest(records, "a".repeat(32));
  const right = normalizeGuest(records, "b".repeat(32));
  const id = restorePlan(left[PLAN_KEY]).session?.draftId;
  assert.equal(left[`interview-practice:run:${id}:semantic-html`], "draft");
  assert.notEqual(await importReceipt(left), await importReceipt(right));
  assert.equal(
    await importReceipt(left),
    await importReceipt(Object.fromEntries(Object.entries(left).reverse())),
  );
});

test("imports are idempotent and stale devices must resolve conflicts before saving", async () => {
  let persisted: RemoteVersion = { revision: 0, payload: EMPTY_SNAPSHOT };
  const remote = {
    async load() {
      return structuredClone(persisted);
    },
    async save(expected: number, payload: Snapshot) {
      if (expected !== persisted.revision) return null;
      persisted = { revision: expected + 1, payload: structuredClone(payload) };
      return persisted.revision;
    },
  };
  let state: SyncState | undefined;
  const first = new AccountSync(remote, await remote.load(), () => {});
  const existing = story("a", "Account story");
  first.setItem(STAR_STORAGE_KEY, star(existing));
  assert.equal(await first.sync(), true);
  const guest = { [STAR_STORAGE_KEY]: star(story("b", "Guest story")) };
  const receipt = await importReceipt(guest);
  await first.importGuest(guest, receipt);
  const revision = persisted.revision;
  await first.importGuest(guest, receipt);
  assert.equal(persisted.revision, revision);
  assert.equal(
    restoreStar(persisted.payload.records[STAR_STORAGE_KEY]).stories.length,
    2,
  );

  const second = new AccountSync(remote, await remote.load(), (next) => {
    state = next;
  });
  const existingGuest = story("b", "Guest story");
  first.setItem(
    STAR_STORAGE_KEY,
    star(story("a", "First browser changed it"), existingGuest),
  );
  await first.sync();
  second.setItem(
    STAR_STORAGE_KEY,
    star(story("a", "Second browser changed it"), existingGuest),
  );
  assert.equal(await second.sync(), false);
  assert.equal(state?.status, "conflict");
  assert.ok(
    second.getItem(STAR_STORAGE_KEY)?.includes("Second browser changed it"),
  );
  await second.resolve({ ["story:" + existing.id]: "account" });
  assert.equal(state?.status, "synced");
  assert.ok(
    persisted.payload.records[STAR_STORAGE_KEY].includes(
      "First browser changed it",
    ),
  );
  first.close();
  second.close();
});

test("PostgreSQL migration enforces authenticated owner isolation and atomic revisions", async () => {
  const db = new PGlite();
  const a = "10000000-0000-0000-0000-000000000001";
  const b = "10000000-0000-0000-0000-000000000002";
  const payload = JSON.stringify({
    records: { [STAR_STORAGE_KEY]: "private" },
    imports: [],
  });
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users values ('${a}'), ('${b}');
    `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261120000100_practice_accounts.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const who = async (id: string) => {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
        id,
      ]);
    };
    const save = (owner: string, revision: number) =>
      db.query<{ value: number | null }>(
        "select public.save_practice_account($1, $2, $3) as value",
        [owner, revision, payload],
      );
    await who(a);
    assert.equal((await save(a, 0)).rows[0].value, 1);
    assert.equal((await save(a, 1)).rows[0].value, 2);
    assert.equal((await save(a, 1)).rows[0].value, null);
    await who(b);
    assert.deepEqual(
      (await db.query("select * from public.practice_accounts")).rows,
      [],
    );
    await assert.rejects(save(a, 2), /insufficient_privilege/);
    await assert.rejects(
      db.query("insert into public.practice_accounts values ($1, 3, $2)", [
        a,
        payload,
      ]),
      /row-level security/,
    );
    assert.equal(
      (
        await db.query(
          "update public.practice_accounts set revision = 99 where user_id = $1 returning user_id",
          [a],
        )
      ).rows.length,
      0,
    );
    assert.equal((await save(b, 0)).rows[0].value, 1);
    await db.exec("set role anon");
    await assert.rejects(save(b, 1), /permission denied/);
    await assert.rejects(
      db.query("select * from public.practice_accounts"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
