import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { base, pageUrl } from "../base.ts";

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
  await page.goto(pageUrl(listed[0]?.slug ?? ""));

  const sidebar = page.locator("nav[aria-label='Manual'] a");
  await expect(sidebar).toHaveText(listed.map((entry) => entry.title));
  expect(
    await sidebar.evaluateAll((a) => a.map((e) => e.getAttribute("href"))),
  ).toEqual(listed.map((entry) => pageUrl(entry.slug)));

  await page.getByRole("link", { name: /^Next/ }).click();
  await expect(page).toHaveURL(pageUrl(listed[1]?.slug ?? ""));
});

test("every page's heading is the heading of its manual file", async ({
  page,
}) => {
  for (const { slug } of listed) {
    const heading = /^# (.+)$/m
      .exec(readFileSync(new URL(`${slug}.md`, docs), "utf8"))?.[1]
      ?.replaceAll("`", "");
    await page.goto(pageUrl(slug));
    await expect(page.locator("main h1")).toHaveText(heading ?? "");
  }
});

test("inline code keeps its type arguments", async ({ page }) => {
  for (const route of ["variants", "create-motion"]) {
    await page.goto(pageUrl(route));
    await expect(
      page.locator(".prose code", { hasText: "createMotion<TCustom>" }).first(),
      route,
    ).toBeVisible();
    // The browser reads an unescaped `<TCustom>` as an element.
    await expect(page.locator("tcustom"), route).toHaveCount(0);
  }
});

test("links on the landing page and between pages stay under the base", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("link", { name: "Read the manual" }).click();
  await expect(page).toHaveURL(pageUrl(listed[0]?.slug ?? ""));
  await expect(page.locator("main h1")).toBeVisible();

  await page.getByRole("link", { name: "solid-motion" }).first().click();
  await expect(page).toHaveURL(base);
  await page.getByRole("link", { name: "Compare with motion/react" }).click();
  await expect(page).toHaveURL(pageUrl("gestures"));
});

test("a page loads from its URL with a trailing slash", async ({ page }) => {
  const response = await page.goto(`${pageUrl("variants")}/`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("main h1")).toHaveText("Variants");
});

test("a link between manual pages keeps the base", async ({ page }) => {
  await page.goto(pageUrl("variants"));
  const hrefs = await page
    .locator(".prose a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
  const internal = hrefs.filter((href) => href.startsWith("/"));
  expect(internal.length).toBeGreaterThan(0);
  expect(internal.filter((href) => !href.startsWith(base))).toEqual([]);
});
