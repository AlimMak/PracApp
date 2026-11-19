import { expect, test, type Page } from "@playwright/test";

async function mockSpeech(page: Page, outcome: "denied" | "transcript") {
  await page.addInitScript((mode) => {
    const stats = { started: 0, aborted: 0 };
    Object.defineProperty(window, "speechTestStats", { value: stats });
    class Recognition {
      onstart?: () => void;
      onend?: () => void;
      onerror?: (event: { error: string }) => void;
      onresult?: (event: { results: unknown[] }) => void;

      start() {
        stats.started++;
        queueMicrotask(() => {
          if (mode === "denied") {
            this.onerror?.({ error: "not-allowed" });
            this.onend?.();
          } else this.onstart?.();
        });
      }
      stop() {
        queueMicrotask(() => {
          this.onresult?.({
            results: [
              { isFinal: true, 0: { transcript: "a rough speech transcript" } },
            ],
          });
          this.onend?.();
        });
      }
      abort() {
        stats.aborted++;
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
  }, outcome);
}

test("microphone denial leaves the draft intact and typing usable", async ({
  page,
}) => {
  await mockSpeech(page, "denied");
  await page.goto("/");
  const draft = page.getByLabel("Your first explanation");
  await draft.fill("An interface");
  expect(
    await page.evaluate(() => Reflect.get(window, "speechTestStats").started),
  ).toBe(0);
  await page.getByRole("button", { name: "Start dictation" }).click();
  await expect(
    page.getByText(/Microphone or speech access was denied/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "speechTestStats").started),
  ).toBe(1);
  await expect(draft).toHaveValue("An interface");
  await draft.fill("An interface apps use to communicate.");
  await page.getByRole("button", { name: "Try my answer" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
    "How would you explain an API to another engineer?",
  );
});

test("dictation stays in preview until added and the answer remains editable", async ({
  page,
}) => {
  await mockSpeech(page, "transcript");
  await page.goto("/");
  const draft = page.getByLabel("Your first explanation");
  await draft.fill("My words");
  await page.getByRole("button", { name: "Start dictation" }).press("Enter");
  await expect(page.getByText(/Listening. Tap Stop/)).toBeVisible();
  await page.getByRole("button", { name: "Stop dictation" }).click();
  await expect(
    page.getByText("a rough speech transcript", { exact: true }),
  ).toBeVisible();
  await expect(draft).toHaveValue("My words");
  await page.getByRole("button", { name: "Add to answer" }).click();
  await expect(draft).toHaveValue("My words a rough speech transcript");
  await draft.fill("My corrected answer");
  await page.reload();
  await expect(draft).toHaveValue("My corrected answer");
  await page.getByRole("button", { name: "Start dictation" }).click();
  await page.getByRole("button", { name: "Show me" }).click();
  expect(
    await page.evaluate(() => Reflect.get(window, "speechTestStats").aborted),
  ).toBe(1);
});
