import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("the landing page shows the package in motion within one screen", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page.locator(".tile");
  await expect(tiles).toHaveCount(12);

  // The tiles arrive with a stagger, so the last one is the last to appear.
  const opacities = () =>
    tiles.evaluateAll((elements) =>
      elements.map((element) => Number(getComputedStyle(element).opacity)),
    );
  await expect.poll(async () => Math.min(...(await opacities()))).toBe(1);

  const viewport = page.viewportSize();
  const box = await page.locator("main.landing").boundingBox();
  expect(box?.height, "the hero fits in the viewport").toBeLessThanOrEqual(
    viewport?.height ?? 0,
  );
  await expect(page.locator(".install")).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".landing-demo .code")).toBeInViewport({
    ratio: 1,
  });
});

test("hovering a tile scales it, and Replay plays the entrance again", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.locator(".tile").first();
  await expect
    .poll(() => first.evaluate((e) => getComputedStyle(e).opacity))
    .toBe("1");
  await first.hover();
  await expect
    .poll(() =>
      first.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).a,
      ),
    )
    .toBeCloseTo(1.1, 1);

  await page.mouse.move(2, 2);
  await page.getByRole("button", { name: "Replay" }).click();
  const opacity = await page
    .locator(".tile")
    .last()
    .evaluate((element) => Number(getComputedStyle(element).opacity));
  expect(opacity, "the last tile starts hidden").toBeLessThan(0.5);
});

test("the install command copies", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Copy the install command" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "npm install @totallynotdavid/solid-motion solid-js@next @solidjs/web@next",
  );
});
