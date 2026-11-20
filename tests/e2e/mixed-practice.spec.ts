import { expect, test, type Page } from "@playwright/test";

async function scenario(page: Page, answer: string) {
  await page.getByLabel("Your scenario answer").fill(answer);
  await page.getByRole("button", { name: "Continue to follow-up" }).click();
  await page
    .getByLabel("Your follow-up answer")
    .fill("I would check the behavior with a concrete example.");
  await page.getByRole("button", { name: "See self-review" }).click();
  await expect(
    page.getByRole("heading", { name: "Self-review", exact: true }),
  ).toBeVisible();
}

test("first mixed session varies activities, preserves draft, and brings back a missed topic", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(page).toHaveURL(/\/practice\/session$/);
  await expect(
    page.getByText("Mixed practice · Activity 1 of 3"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /semantic HTML tell/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to scenario" }).click();
  const input = page.getByLabel("Your scenario answer");
  const partial = "Use a native button so people can submit.";
  await input.fill(partial);
  await page.getByRole("link", { name: "Leave session" }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await page.reload();
  await page.getByRole("button", { name: "Resume practice" }).click();
  await expect(
    page.getByRole("heading", { name: /sign-up form/ }),
  ).toBeVisible();
  await expect(input).toHaveValue(partial);
  await scenario(page, partial);
  await page.getByRole("button", { name: "Still practicing" }).click();

  await expect(
    page.getByText("Mixed practice · Activity 2 of 3"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Cache simulator" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use a cache" }).click();
  await page.getByRole("button", { name: "Request menu" }).click();
  await page.reload();
  await expect(
    page.getByText(/Cache miss. The database returned/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to scenario" }).click();
  await scenario(
    page,
    "Cache each schedule and invalidate the corresponding entry on an edit.",
  );
  await page.getByRole("button", { name: "I can explain this" }).click();

  await expect(
    page.getByText("Mixed practice · Activity 3 of 3"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /someone else had to get work done/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to scenario" }).click();
  await scenario(
    page,
    "I split ownership and agreed on a handoff with my teammate.",
  );
  await page.getByRole("button", { name: "I can explain this" }).click();
  await expect(
    page.getByRole("heading", { name: "Mixed session complete" }),
  ).toBeVisible();
  await expect(
    page.getByText("Still practicing", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Activities and progress" }).click();
  const semanticRow = page
    .getByRole("listitem")
    .filter({ hasText: "Semantic HTML" });
  await expect(
    semanticRow.getByText("Still practicing", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Next in your guided path")).toBeVisible();
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(
    page.getByRole("heading", { name: /semantic HTML tell/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Your quick answer")).toHaveValue("");
  await page.getByRole("button", { name: "Continue to scenario" }).click();
  await scenario(
    page,
    "A named submit button provides meaning plus built-in keyboard behavior.",
  );
  await page.getByRole("button", { name: "I can explain this" }).click();
  await expect(
    page.getByRole("heading", { name: "Send a message while Leo is online" }),
  ).toBeVisible();
});

test("semantic HTML lab compares keyboard and pointer behavior", async ({
  page,
}) => {
  await page.goto("/practice/semantic-html");
  await page.getByRole("button", { name: "See an example" }).click();
  const native = page.getByRole("button", {
    name: "Native button",
    exact: true,
  });
  await native.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(page.getByText("Native button activations: 2")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continue to scenario" }),
  ).toBeFocused();
  await expect(page.getByText("Plain div activations: 0")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Plain clickable div" }),
  ).toHaveCount(0);
  await page.getByText("Plain clickable div", { exact: true }).click();
  await expect(page.getByText("Plain div activations: 1")).toBeVisible();
});

test("cache direct entry shows bypass, hit, stale data, and refresh at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/practice/cache");
  const request = page.getByRole("button", { name: "Request menu" });
  await request.click();
  await expect(page.getByText(/directly from the database/)).toBeVisible();
  await expect(page.getByText("Reads: 1")).toBeVisible();
  await page.getByRole("button", { name: "Use a cache" }).click();
  await request.click();
  await expect(page.getByText(/Cache miss/)).toBeVisible();
  await expect(page.getByText("Reads: 2")).toBeVisible();
  await request.click();
  await expect(page.getByText(/Cache hit/)).toBeVisible();
  await expect(page.getByText("Reads: 2")).toBeVisible();
  await page.getByRole("button", { name: "Update price to $6" }).click();
  await request.click();
  await expect(page.getByText(/saved price is stale/)).toBeVisible();
  await page.getByRole("button", { name: "Invalidate cached menu" }).click();
  await request.click();
  await expect(
    page.getByText(
      "Cache miss. The database returned $6 and filled the cache.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Reads: 3")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("direct topics share the full question flow and feed progress back to the catalog", async ({
  page,
}) => {
  await page.goto("/practice");
  const indexLink = page
    .getByRole("link", { name: "Database indexes", exact: true })
    .last();
  await indexLink.click();
  await expect(
    page.getByRole("heading", { name: /matching rows without reading/ }),
  ).toBeVisible();
  await page
    .getByLabel("Your quick answer")
    .fill("An index points to matching rows.");
  await page.getByRole("button", { name: "See an example" }).click();
  await expect(page.getByText(/book’s index/)).toBeVisible();
  await page.getByRole("button", { name: "Continue to scenario" }).click();
  await scenario(page, "Try an index on customer_id and compare plans.");
  await page.getByRole("button", { name: "I can explain this" }).click();
  await expect(
    page.getByText("Saved progress: I can explain this"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Activities and progress" }).click();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Database indexes" })
      .getByText("I can explain this"),
  ).toBeVisible();
});
