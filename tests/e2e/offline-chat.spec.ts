import { expect, test, type Page } from "@playwright/test";

async function startDesign(page: Page) {
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Received", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Make Leo offline" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Design for an offline recipient",
  );
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await expect(page.getByText("Received", { exact: true })).toHaveCount(0);
}

async function completeReflection(page: Page, answer: string) {
  await page.getByRole("button", { name: "Explain what happened" }).click();
  await page.getByLabel("Your explanation", { exact: true }).fill(answer);
  await page.reload();
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue(answer);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What should the server do when Leo reconnects?",
  );
  await page
    .getByLabel("Your follow-up answer")
    .fill("Look up pending messages for Leo and deliver them.");
  await page.getByRole("button", { name: "See feedback" }).click();
  await expect(
    page.getByText(/Self-review based on the simulation/),
  ).toBeVisible();
}

test("build with keyboard, undo replacements, see a loss, then retry with durable storage", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Practice system design/ }).click();
  await expect(page).toHaveURL(/\/offline-chat$/);
  await startDesign(page);

  const selectStore = page.getByRole("button", { name: /^Message store/ });
  const selectRelay = page.getByRole("button", { name: /^Live relay/ });
  const slot = page.getByRole("button", { name: /^Server attachment point/ });
  await selectStore.focus();
  await page.keyboard.press("Enter");
  await expect(selectStore).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(slot).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(slot).toContainText("Message store");

  await selectRelay.click();
  await slot.click();
  await expect(slot).toContainText("Live relay");
  await page.getByRole("button", { name: "Undo placement" }).press("Enter");
  await expect(slot).toContainText("Message store");
  await selectRelay.click();
  await slot.click();

  await page.getByRole("button", { name: "Run example" }).click();
  await expect(
    page.getByText(/Delivery stops at the live relay/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reconnect Leo" }).click();
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  await expect(page.getByText(/Nothing is delivered/)).toBeVisible();
  await expect(page.getByText("Received", { exact: true })).toHaveCount(0);
  await completeReflection(page, "The relay can only reach an online client.");
  await expect(page.getByText(/had no saved copy/)).toBeVisible();
  await page.getByRole("button", { name: "Retry design" }).click();

  await page.getByRole("button", { name: /^Durable queue/ }).click();
  await slot.click();
  await page.getByRole("button", { name: "Run example" }).click();
  await expect(page.getByText("Message saved here")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Message saved here")).toBeVisible();
  await page.getByRole("button", { name: "Reconnect Leo" }).click();
  await expect(page.getByText("Received", { exact: true })).toBeVisible();
  await completeReflection(
    page,
    "The queue keeps the message until Leo returns.",
  );
  await expect(
    page.getByText(/Durable queue retained the message/),
  ).toBeVisible();
  await page.getByText("Your answers and previous attempt").click();
  await expect(
    page.getByText("The relay can only reach an online client."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Offline chat complete",
  );
  await page.getByRole("link", { name: "API lesson", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "How would you explain an API to another engineer?",
  );
});

test("watch path works at 320px with reduced motion and no component placement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/offline-chat");
  await startDesign(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Watch and explain instead" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Watch a message wait for Leo",
  );
  await expect(page.getByText("Message saved here")).toBeVisible();
  await expect(page.getByText("Message store", { exact: true })).toBeVisible();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Reconnect Leo" }).click();
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Meet me in the lobby.", { exact: true }),
  ).toBeVisible();
  await completeReflection(
    page,
    "The database holds the message while the recipient is offline.",
  );
  await expect(
    page.getByText(/Message store retained the message/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Offline chat complete",
  );
});
