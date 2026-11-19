import { test, expect, type Page } from "@playwright/test";

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function writeAttempt(page: Page, answer: string, followup: string) {
  await page.getByLabel("Your explanation", { exact: true }).fill(answer);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "internal code",
  );
  await page.getByLabel("Your follow-up answer").fill(followup);
  await page.getByRole("button", { name: "Open self-review" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A little clearer?",
  );
}

test("try first, refresh drafts, self-review, retry, compare, and finish", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "How would you explain an API to another engineer?",
  );
  await expect(
    page.getByRole("button", { name: "Try my answer" }),
  ).toBeDisabled();
  await page
    .getByLabel("Your first explanation")
    .fill(
      "Software can ask other software for something through an interface.",
    );
  await page.reload();
  await expect(page.getByLabel("Your first explanation")).toHaveValue(
    "Software can ask other software for something through an interface.",
  );
  await page.getByRole("button", { name: "Try my answer" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A request. A response.",
  );
  await expect(
    page.getByText("Your starting explanation is saved for later."),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "I’m ready to explain" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "another app",
  );
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("A partially written draft");
  await page.reload();
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("A partially written draft");
  await writeAttempt(
    page,
    "The developer needs the endpoint and inputs.",
    "No, they just need to know how to call it.",
  );
  const checks = page.getByRole("checkbox");
  await checks.nth(0).check();
  await expect(checks.nth(1)).not.toBeChecked();
  await page.reload();
  await expect(checks.nth(0)).toBeChecked();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toBeEmpty();
  await writeAttempt(
    page,
    "GET /weather, a city and units; expect temperature and condition or an error.",
    "No. The agreed interface hides how the service gets the weather.",
  );
  await checks.nth(0).check();
  await checks.nth(1).check();
  await page.getByText("Compare your two attempts", { exact: false }).click();
  await expect(
    page.getByText("The developer needs the endpoint and inputs.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "GET /weather, a city and units; expect temperature and condition or an error.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Software can ask other software for something through an interface.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One idea, a little clearer.",
  );
  await expect(
    page.getByText("2 of 2 points checked", { exact: false }),
  ).toHaveCount(2);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("show me traces fixed weather with replay, reduced motion, and saved position", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Show me", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeDisabled();
  const weatherRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/weather")
      weatherRequests.push(request.url());
  });
  await page
    .getByRole("button", { name: "Check weather", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "1. The app makes a request",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".packet")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "1. The app makes a request",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "2. The service does the work",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "3. The service sends a response",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.locator(".temperature")).toHaveText("78°F");
  await expect(page.locator(".weather-condition")).toHaveText("Sunny");
  await page
    .getByText("Look at the request and response", { exact: true })
    .click();
  await expect(
    page.getByText("GET /weather?city=Austin&units=F", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "1. The app makes a request",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "1. The app makes a request",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("APIs also connect software components", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I’m ready to explain" }).click();
  await writeAttempt(
    page,
    "Request method, endpoint, parameters, return format and errors.",
    "No, the public interface is enough.",
  );
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One idea, a little clearer.",
  );
  expect(weatherRequests).toEqual([]);
});

test("keyboard can open the example and follow step focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
    });
  });
  await page.goto("/");
  await expect(page.getByLabel("Your first explanation")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start dictation" }),
  ).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to practice" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Your first explanation")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Show me", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Check weather", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "1. The app makes a request",
      exact: true,
    }),
  ).toBeVisible();
});

test("blocked storage keeps the complete lesson usable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked for test");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked for test");
    };
  });
  await page.goto("/");
  await expect(
    page.getByText("Browser saving is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show me", exact: true }).click();
  await page.getByRole("button", { name: "I’m ready to explain" }).click();
  await writeAttempt(
    page,
    "An interface for a request and a response.",
    "No, its documented inputs and outputs are sufficient.",
  );
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One idea, a little clearer.",
  );
});

test("320px layout has no sideways scroll, including long answer text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await noOverflow(page);
  await page.getByRole("button", { name: "Show me", exact: true }).click();
  await page
    .getByRole("button", { name: "Check weather", exact: true })
    .click();
  await page
    .getByText("Look at the request and response", { exact: true })
    .click();
  await noOverflow(page);
  await page.getByRole("button", { name: "I’m ready to explain" }).click();
  await writeAttempt(
    page,
    "AnEndpoint".repeat(90),
    "TheDeveloperDoesNotNeedTheInternalCode".repeat(25),
  );
  await page.getByText("Revisit your answers", { exact: false }).click();
  await noOverflow(page);
});

test("playback can pause, resume, and finish automatically", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Show me", exact: true }).click();
  await page
    .getByRole("button", { name: "Check weather", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(
    await page
      .locator(".request .packet")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await expect(
    page.getByRole("heading", {
      name: "1. The app makes a request",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "4. The app uses the data",
      exact: true,
    }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".temperature")).toHaveText("78°F");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeDisabled();
});
