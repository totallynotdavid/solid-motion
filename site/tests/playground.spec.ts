import { expect, test, type Page } from "@playwright/test";

import { probes } from "./probes.ts";

const entrance = '[data-demo="entrance"]';
const pane = (side: "solid" | "react") =>
  `${entrance} [data-pane="${side}"] .stage`;

async function openEntrance(page: Page): Promise<void> {
  await page.goto("/animating-elements");
  await page.locator(entrance).scrollIntoViewIfNeeded();
  await expect(page.locator(pane("react"))).toHaveAttribute(
    "data-state",
    "ready",
  );
}

const scaleOf = (page: Page, side: "solid" | "react") =>
  page.locator(`${pane(side)} [data-probe]`).evaluate((element) => {
    const { a, b } = new DOMMatrix(getComputedStyle(element).transform);
    return Math.hypot(a, b);
  });

test("every page lists the demos that have a probe", async ({ page }) => {
  await page.goto("/animating-elements");
  const links = await page
    .locator("nav[aria-label] a[href^='/']")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
  const routes = [...new Set(links)];
  expect(routes.length, "pages in the sidebar").toBeGreaterThanOrEqual(10);

  const found = new Set<string>();
  for (const route of routes) {
    await page.goto(route);
    const ids = await page
      .locator("[data-demo]")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("data-demo") ?? ""),
      );
    for (const id of ids) found.add(id);
  }
  expect([...found].sort()).toEqual(probes.map((probe) => probe.demo).sort());
});

test("Replay starts both panes over", async ({ page }) => {
  await openEntrance(page);
  const runs = async () => [
    await page.locator(pane("solid")).getAttribute("data-run"),
    await page.locator(pane("react")).getAttribute("data-run"),
  ];
  const before = await runs();
  await page.locator(`${entrance} button:has-text("Replay")`).click();
  await expect.poll(runs).not.toEqual(before);
  const after = await runs();
  expect(after[0]).not.toBe(before[0]);
  expect(after[1]).not.toBe(before[1]);
});

test("the code follows the controls and copies", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openEntrance(page);
  const code = page.locator(`${entrance} .code-panel pre`);
  await expect(code).not.toContainText("stiffness: 333");

  await page.locator("#control-entrance-stiffness").fill("330");
  await expect(code).toContainText("stiffness: 330");

  await page.locator("#control-entrance-type").selectOption("tween");
  await expect(code).toContainText('type: "tween"');
  await expect(code).not.toContainText("stiffness");

  await page
    .locator(`${entrance} .tabs button:has-text("motion/react")`)
    .click();
  await expect(code).toContainText('from "motion/react"');

  await page.locator(`${entrance} .code-panel button.copy`).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(await code.innerText());
  expect(copied).toContain('type: "tween"');
});

test("reduced motion turns movement into a jump in both panes", async ({
  page,
}) => {
  await openEntrance(page);
  // A four second tween leaves no doubt about whether the box moved.
  await page.locator("#control-entrance-type").selectOption("tween");
  await page.locator("#control-entrance-duration").fill("4");
  await page.locator("#entrance-reduced").check();

  for (const side of ["solid", "react"] as const) {
    await page.waitForTimeout(150);
    expect(await scaleOf(page, side), `${side} scale`).toBeCloseTo(1, 1);
  }

  await page.locator("#entrance-reduced").uncheck();
  await page.waitForTimeout(60);
  for (const side of ["solid", "react"] as const) {
    expect(await scaleOf(page, side), `${side} scale`).toBeLessThan(0.95);
  }
});

test("a demo solid-motion cannot run yet says so and the React pane still runs", async ({
  page,
}) => {
  await page.goto("/animating-elements");
  const demo = page.locator('[data-demo="path"]');
  await demo.scrollIntoViewIfNeeded();
  await expect(demo.locator('[data-pane="solid"]')).toHaveAttribute(
    "data-state",
    "not-yet",
  );
  await expect(demo.locator('[data-pane="solid"] .badge')).toHaveText(
    "Not yet",
  );
  await expect(demo.locator('[data-pane="react"] .stage')).toHaveAttribute(
    "data-state",
    "ready",
  );
});

test("no page logs an error", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(message.text());
    }
  });
  await page.goto("/");
  const links = await page
    .locator("nav[aria-label='Manual'] a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
  for (const route of ["/", ...links]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
  }
  expect(problems).toEqual([]);
});
