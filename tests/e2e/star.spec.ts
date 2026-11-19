import { expect, test, type Page } from "@playwright/test";

const prompts = [
  ["Your situation", "A classmate could not run our demo after setup."],
  ["Your task", "I was responsible for getting the demo working."],
  ["Your action", "I reproduced the setup failure and wrote a clearer guide."],
  ["Your result", "My classmate ran the demo independently."],
] as const;

async function fillStory(page: Page) {
  for (const [label, value] of prompts) {
    await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
}

test("explore STAR, resume a real draft, rename, rehearse aloud, retry, and delete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  await page
    .getByRole("link", { name: /Practice behavioral interviews/ })
    .click();
  const sample = page.getByRole("region", { name: "Fictional example" });
  await expect(
    sample.getByText("Fictional student team project"),
  ).toBeVisible();
  for (const part of ["Situation", "Task", "Action", "Result"]) {
    await sample.getByRole("button", { name: part, exact: true }).click();
    await expect(
      sample.getByRole("button", { name: part, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      sample.getByRole("heading", { name: new RegExp("^" + part) }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Build my story" }).click();
  await expect(page.getByLabel("Your situation")).toHaveValue("");
  await page.getByLabel("Your situation").fill("Partial draft");
  await page.reload();
  await expect(page.getByLabel("Your situation")).toHaveValue("Partial draft");
  await fillStory(page);
  await page.getByLabel("Story title").fill("Demo recovery");
  await page.getByLabel("Cue words").fill("setup, guide, demo");
  await page.getByRole("button", { name: "Save story" }).click();

  await page.getByRole("button", { name: "Edit story" }).click();
  for (const [label, value] of prompts) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByLabel("Story title").fill("Class demo recovery");
  await page.getByRole("button", { name: "Save story" }).click();
  await page.reload();
  const saved = page
    .getByRole("article")
    .filter({ hasText: "Class demo recovery" });
  await saved.getByText("View story", { exact: true }).click();
  await expect(saved.getByText(prompts[3][1], { exact: true })).toBeVisible();
  await saved.getByRole("button", { name: "Practice this story" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tell me about a time you took responsibility for a challenge.",
  );
  await expect(page.getByText(prompts[2][1], { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("setup, guide, demo", { exact: true }),
  ).not.toBeVisible();
  await page.getByText("Show cue words", { exact: true }).click();
  await expect(
    page.getByText("setup, guide, demo", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "I rehearsed aloud" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What would you do differently next time, and why?",
  );
  await page.getByRole("button", { name: "I rehearsed aloud" }).click();
  await expect(
    page.getByRole("heading", { name: "Self-review", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/didn’t hear or evaluate/)).toBeVisible();
  const result = page.getByRole("checkbox", { name: /observable result/ });
  await result.check();
  await page.reload();
  await expect(result).toBeChecked();
  await expect(page.getByText("View written rehearsal answers")).toHaveCount(0);

  await page.getByRole("button", { name: "Retry rehearsal" }).click();
  await page
    .getByLabel("Your interview answer")
    .fill("I owned the demo fix and wrote down the setup steps.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Your follow-up answer")
    .fill("I would test setup on another machine sooner.");
  await page.getByRole("button", { name: "See self-review" }).click();
  await expect(result).not.toBeChecked();
  await page.getByText("View written rehearsal answers").click();
  await expect(
    page.getByText(/I would test setup on another machine sooner/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await saved
    .getByRole("button", { name: "Delete story", exact: true })
    .click();
  await saved.getByRole("button", { name: "Delete this story" }).click();
  await page.reload();
  await expect(
    page.getByText("Class demo recovery", { exact: true }),
  ).toHaveCount(0);
});

test("STAR keeps guided writing and rehearsal usable when storage and dictation are unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const key of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, key, { value: undefined });
    }
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/star");
  await expect(page.getByText(/Browser saving is unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Build my story" }).click();
  await expect(
    page.getByRole("button", { name: "Start dictation" }),
  ).toHaveCount(0);
  await fillStory(page);
  await page.getByLabel("Story title").fill("Setup guide");
  await page.getByRole("button", { name: "Save story" }).click();
  await page.getByRole("button", { name: "Practice this story" }).click();
  await page.getByText("Show cue words", { exact: true }).click();
  await expect(page.getByText(/Context · My responsibility/)).toBeVisible();
  await page
    .getByLabel("Your interview answer")
    .fill("I helped a teammate get past a setup issue.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Your follow-up answer")
    .fill("I would test the instructions before handing them off.");
  await page.getByRole("button", { name: "See self-review" }).click();
  await expect(
    page.getByRole("heading", { name: "Self-review", exact: true }),
  ).toBeVisible();
});
