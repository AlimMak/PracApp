import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  EMPTY_SNAPSHOT,
  LOCATION_KEY,
  type Snapshot,
} from "../../src/lib/account-data";
import {
  EMPTY_STORY,
  FRESH_STAR,
  STAR_STORAGE_KEY,
  restoreStar,
} from "../../src/lib/star";

const origin = "http://127.0.0.1:3011";
const alice = {
  id: "10000000-0000-0000-0000-000000000001",
  email: "alice@example.test",
};
const bob = {
  id: "10000000-0000-0000-0000-000000000002",
  email: "bob@example.test",
};
const password = "test-password-only";
type Row = { revision: number; payload: Snapshot };

function accessToken(id: string) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return (
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }) +
    ".c2ln"
  );
}

function provider() {
  const rows = new Map<string, Row>();
  rows.set(alice.id, {
    revision: 1,
    payload: {
      ...EMPTY_SNAPSHOT,
      records: {
        [LOCATION_KEY]: "/star",
        [STAR_STORAGE_KEY]: JSON.stringify({
          ...FRESH_STAR,
          view: { screen: "library" },
          stories: [
            {
              id: "a".repeat(32),
              fields: {
                ...EMPTY_STORY,
                title: "Account-only story",
                situation: "A workshop",
                task: "Own the demo",
                action: "I led the demo",
                result: "The team finished",
              },
              attempts: [],
            },
          ],
        }),
      },
    },
  });
  let rejectWrites = false;
  async function attach(context: BrowserContext) {
    await context.route("https://supabase.pracapp.test/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const send = (json: unknown, status = 200) =>
        route.fulfill({
          status,
          json,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "GET,POST,OPTIONS",
          },
        });
      if (request.method() === "OPTIONS") return send({});
      if (url.pathname === "/auth/v1/token") {
        const { email, password: supplied } = request.postDataJSON();
        const person = [alice, bob].find((user) => user.email === email);
        if (!person || supplied !== password)
          return send({ message: "Invalid test credentials" }, 400);
        return send({
          access_token: accessToken(person.id),
          refresh_token: "test-refresh-" + person.id,
          expires_in: 3600,
          token_type: "bearer",
          user: {
            ...person,
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          },
        });
      }
      if (url.pathname === "/auth/v1/logout") return send({});
      const bearer = request.headers().authorization?.split(" ")[1];
      const part = bearer?.split(".")[1];
      const owner =
        part && JSON.parse(Buffer.from(part, "base64url").toString()).sub;
      if (owner !== alice.id && owner !== bob.id)
        return send({ message: "Unauthorized" }, 401);
      if (url.pathname === "/rest/v1/practice_accounts") {
        if (url.searchParams.get("user_id") !== "eq." + owner) return send([]);
        const row = rows.get(owner);
        return send(row ? [row] : []);
      }
      if (url.pathname === "/rest/v1/rpc/save_practice_account") {
        if (rejectWrites)
          return send({ message: "Test connection failure" }, 503);
        const { expected_owner, expected_revision, next_payload } =
          request.postDataJSON();
        if (expected_owner !== owner)
          return send({ message: "Wrong owner" }, 403);
        const current = rows.get(owner)?.revision ?? 0;
        if (expected_revision !== current) return send(null);
        rows.set(owner, { revision: current + 1, payload: next_payload });
        return send(current + 1);
      }
      return send({ message: "Unexpected test request" }, 404);
    });
  }
  return {
    rows,
    attach,
    failWrites(value: boolean) {
      rejectWrites = value;
    },
  };
}

async function signIn(page: Page, email: string) {
  await page.goto(origin + "/account");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Resume last activity" }),
  ).toBeVisible();
}

async function saveGuestStory(page: Page) {
  await page.goto(origin + "/star");
  await page.getByRole("button", { name: "Build my story" }).click();
  for (const [label, answer] of [
    ["Your situation", "A study group needed a demo"],
    ["Your task", "I owned the demo"],
    ["Your action", "I rehearsed and asked for feedback"],
    ["Your result", "Everyone followed the demo"],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(answer);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByLabel("Story title").fill("Guest story");
  await page.getByRole("button", { name: "Save story" }).click();
  await expect(
    page.getByRole("heading", { name: "Guest story" }),
  ).toBeVisible();
}

async function syncVisible(page: Page) {
  await expect(
    page
      .getByRole("complementary", { name: "Account sync" })
      .getByText("Practice synced", { exact: true }),
  ).toBeVisible();
}

test("guest import twice, second-browser resume, deletion and isolation on a shared browser", async ({
  browser,
}) => {
  const mock = provider();
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    await mock.attach(first);
    await mock.attach(second);
    const browserA = await first.newPage();
    const browserB = await second.newPage();
    await saveGuestStory(browserA);
    await signIn(browserA, alice.email);
    await browserA
      .getByRole("button", { name: "Import guest practice" })
      .click();
    await expect(browserA.getByText(/already in your account/)).toBeVisible();
    await syncVisible(browserA);
    const revision = mock.rows.get(alice.id)?.revision;
    await browserA
      .getByRole("button", { name: "Import guest practice" })
      .click();
    await syncVisible(browserA);
    expect(mock.rows.get(alice.id)?.revision).toBe(revision);
    expect(
      JSON.parse(mock.rows.get(alice.id)!.payload.records[STAR_STORAGE_KEY])
        .stories,
    ).toHaveLength(2);

    await browserA.getByRole("link", { name: "Resume last activity" }).click();
    await expect(
      browserA.getByRole("heading", { name: "Account-only story" }),
    ).toBeVisible();
    await expect(
      browserA.getByRole("heading", { name: "Guest story" }),
    ).toHaveCount(1);
    expect(
      await browserA.evaluate(() =>
        localStorage.getItem("interview-practice:star:v1"),
      ),
    ).not.toContain("Account-only story");

    await browserA.goto(origin + "/practice/session");
    await browserA
      .getByLabel("Your quick answer")
      .fill("An unfinished account-only answer");
    await syncVisible(browserA);
    await signIn(browserB, alice.email);
    await browserB.getByRole("link", { name: "Resume last activity" }).click();
    await expect(browserB).toHaveURL(/\/practice\/session$/);
    await expect(browserB.getByLabel("Your quick answer")).toHaveValue(
      "An unfinished account-only answer",
    );

    await browserA.goto(origin + "/account");
    await browserA
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await expect(
      browserA.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await browserA.goto(origin + "/star");
    await expect(
      browserA.getByRole("heading", { name: "Guest story" }),
    ).toBeVisible();
    await expect(
      browserA.getByRole("heading", { name: "Account-only story" }),
    ).toHaveCount(0);

    await signIn(browserA, bob.email);
    await browserA.goto(origin + "/star");
    await browserA
      .getByRole("button", { name: "My stories", exact: true })
      .click();
    await expect(
      browserA.getByText("Your saved stories will appear here."),
    ).toBeVisible();
    await syncVisible(browserA);
    expect(
      mock.rows.get(bob.id)?.payload.records[STAR_STORAGE_KEY],
    ).not.toContain("Guest story");

    await browserB.goto(origin + "/star");
    const imported = browserB
      .getByRole("article")
      .filter({ hasText: "Guest story" });
    await imported
      .getByRole("button", { name: "Delete story", exact: true })
      .click();
    await imported.getByRole("button", { name: "Delete this story" }).click();
    await syncVisible(browserB);
    await browserB.reload();
    await expect(
      browserB.getByRole("heading", { name: "Account-only story" }),
    ).toBeVisible();
    await expect(
      browserB.getByRole("heading", { name: "Guest story" }),
    ).toHaveCount(0);
  } finally {
    await first.close();
    await second.close();
  }
});

test("an unavailable provider leaves signed-in edits visible and retry can finish saving", async ({
  browser,
}) => {
  const mock = provider();
  const context = await browser.newContext();
  try {
    await mock.attach(context);
    const page = await context.newPage();
    await signIn(page, alice.email);
    mock.failWrites(true);
    await page.goto(origin + "/");
    await page.getByLabel("Your first explanation").fill("My pending edit");
    await expect(
      page.getByText("Unsynced changes. Sync failed."),
    ).toBeVisible();
    await expect(page.getByLabel("Your first explanation")).toHaveValue(
      "My pending edit",
    );
    mock.failWrites(false);
    await page.getByRole("button", { name: "Retry sync" }).click();
    await syncVisible(page);
    await page.reload();
    await expect(page.getByLabel("Your first explanation")).toHaveValue(
      "My pending edit",
    );
  } finally {
    await context.close();
  }
});

test("overlapping story edits show both versions before either is replaced", async ({
  browser,
}) => {
  const mock = provider();
  const context = await browser.newContext();
  try {
    await mock.attach(context);
    const page = await context.newPage();
    await signIn(page, alice.email);
    await page.getByRole("link", { name: "Resume last activity" }).click();
    await page.getByRole("button", { name: "Edit story", exact: true }).click();
    for (let step = 0; step < 4; step++) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await page.getByLabel("Story title").fill("My browser edit");
    await syncVisible(page);

    // Advance the server's revision as if another signed-in browser saved first.
    const row = mock.rows.get(alice.id)!;
    const otherEdit = restoreStar(row.payload.records[STAR_STORAGE_KEY]);
    otherEdit.stories[0].fields.title = "Other device edit";
    otherEdit.view = { screen: "library" };
    otherEdit.drafts = {};
    mock.rows.set(alice.id, {
      revision: row.revision + 1,
      payload: {
        ...row.payload,
        records: {
          ...row.payload.records,
          [STAR_STORAGE_KEY]: JSON.stringify(otherEdit),
        },
      },
    });

    await page.getByRole("button", { name: "Save story" }).click();
    await expect(
      page.getByRole("heading", { name: "Review changes from two devices" }),
    ).toBeVisible();
    const save = page.getByRole("button", { name: "Save chosen versions" });
    await expect(save).toBeDisabled();
    await page.getByText("View account version", { exact: true }).click();
    await page
      .getByText("View this browser’s version", { exact: true })
      .click();
    await expect(
      page.locator("pre").filter({ hasText: "Other device edit" }),
    ).toBeVisible();
    await expect(
      page.locator("pre").filter({ hasText: "My browser edit" }),
    ).toBeVisible();
    await page
      .getByRole("radio", { name: "Account version", exact: true })
      .check();
    await save.click();
    await syncVisible(page);
    await expect(
      page.getByRole("heading", { name: "Other device edit" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
