import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const docs = new URL("../../docs/", import.meta.url);

/** The pages `docs/README.md` numbers, in its order. */
const listed = [
  ...readFileSync(new URL("README.md", docs), "utf8").matchAll(
    /^\d+\. \[([^\]]+)\]\(([a-z-]+)\.md\)/gm,
  ),
].map(([, title = "", slug = ""]) => ({ title, slug }));

test("the sidebar and Next follow the order of the manual's index", async ({
  page,
}) => {
  expect(listed.length, "pages in docs/README.md").toBeGreaterThan(10);
  await page.goto(`/${listed[0]?.slug}`);

  const sidebar = page.locator("nav[aria-label='Manual'] a");
  await expect(sidebar).toHaveText(listed.map((entry) => entry.title));
  expect(
    await sidebar.evaluateAll((a) => a.map((e) => e.getAttribute("href"))),
  ).toEqual(listed.map((entry) => `/${entry.slug}`));

  await page.getByRole("link", { name: /^Next/ }).click();
  await expect(page).toHaveURL(`/${listed[1]?.slug}`);
});

test("every page's heading is the heading of its manual file", async ({
  page,
}) => {
  for (const { slug } of listed) {
    const heading = /^# (.+)$/m
      .exec(readFileSync(new URL(`${slug}.md`, docs), "utf8"))?.[1]
      ?.replaceAll("`", "");
    await page.goto(`/${slug}`);
    await expect(page.locator("main h1")).toHaveText(heading ?? "");
  }
});

test("inline code keeps its type arguments", async ({ page }) => {
  for (const route of ["/variants", "/create-motion"]) {
    await page.goto(route);
    await expect(
      page.locator(".prose code", { hasText: "createMotion<TCustom>" }).first(),
      route,
    ).toBeVisible();
    // The browser reads an unescaped `<TCustom>` as an element.
    await expect(page.locator("tcustom"), route).toHaveCount(0);
  }
});
