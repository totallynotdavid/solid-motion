import { expect, test, type Locator, type Page } from "@playwright/test";

import { pageUrl } from "../base.ts";
import { watch, type Reading } from "./measure.ts";
import { probes, type Probe, type Setting } from "./probes.ts";

type Side = "solid" | "react";
const sides: Side[] = ["solid", "react"];

function expectNear(
  actual: number,
  expected: number,
  tolerance: number,
  what: string,
): void {
  expect(
    Math.abs(actual - expected),
    `${what}: got ${actual}, wanted ${expected} ± ${tolerance}`,
  ).toBeLessThanOrEqual(tolerance);
}

const demoRoot = (probe: Probe) => `[data-demo="${probe.demo}"]`;
const paneOf = (page: Page, probe: Probe, side: Side) =>
  page.locator(`${demoRoot(probe)} [data-pane="${side}"]`);

async function open(page: Page, probe: Probe): Promise<Side[]> {
  await page.goto(pageUrl(probe.page));
  await page.locator(demoRoot(probe)).scrollIntoViewIfNeeded();
  return waitReady(page, probe);
}

/**
 * Waits until the panes that run are ready and returns them. A pane the page
 * marks "not yet" does not run, so only the `motion/react` side is driven.
 */
async function waitReady(page: Page, probe: Probe): Promise<Side[]> {
  const notYet =
    (await paneOf(page, probe, "solid").getAttribute("data-state")) ===
    "not-yet";
  const live = notYet ? sides.filter((side) => side === "react") : sides;
  for (const side of live) {
    await expect(paneOf(page, probe, side).locator(".stage")).toHaveAttribute(
      "data-run",
    );
  }
  await expect(paneOf(page, probe, "react").locator(".stage")).toHaveAttribute(
    "data-state",
    "ready",
  );
  return live;
}

async function setControl(
  page: Page,
  probe: Probe,
  key: string,
  value: string | number | boolean,
): Promise<void> {
  const field = page.locator(`#control-${probe.demo}-${key}`);
  if (typeof value === "boolean") await field.setChecked(value);
  else if (typeof value === "number") await field.fill(String(value));
  else await field.selectOption(value);
}

async function runOf(pane: Locator): Promise<string | null> {
  return pane.locator(".stage").getAttribute("data-run");
}

/**
 * Starts the demo over, plays it, and reports where it ended and when it
 * stopped moving. `start` is what restarts it: a click on Replay, or a change
 * of a control (the frame replays on its own after a pause).
 */
async function play(
  page: Page,
  probe: Probe,
  side: Side,
  start: () => Promise<void>,
): Promise<Reading> {
  const pane = paneOf(page, probe, side);
  const before = await runOf(pane);
  await start();
  await expect.poll(() => runOf(pane), { timeout: 5000 }).not.toBe(before);
  await expect(pane.locator(".stage")).toHaveAttribute("data-state", "ready");

  const watching = watch(page, {
    scope: `${demoRoot(probe)} [data-pane="${side}"]`,
    target: probe.target ?? "[data-probe]",
    metric: probe.metric,
    aggregate: probe.aggregate ?? "first",
    quietMs: 600,
  });
  if (probe.act) {
    // Let the entrance, if any, finish so only the input is measured.
    await page.waitForTimeout(900);
    await probe.act(pane, page);
  }
  await watching.arm();
  return watching.result;
}

const replay = (page: Page, probe: Probe) => () =>
  page.locator(`${demoRoot(probe)} button:has-text("Replay")`).click();

const apply = (page: Page, probe: Probe, set: Setting) => async () => {
  for (const [key, value] of Object.entries(set)) {
    await setControl(page, probe, key, value);
  }
};

test.describe("every demo", () => {
  for (const probe of probes) {
    test.describe(probe.demo, () => {
      test("reaches its end state", async ({ page }) => {
        const live = await open(page, probe);
        const solid = live.includes("solid")
          ? await play(page, probe, "solid", replay(page, probe))
          : undefined;
        const react = await play(page, probe, "react", replay(page, probe));
        expectNear(react.value, probe.end, probe.tolerance, "react end state");
        if (solid) {
          expectNear(
            solid.value,
            probe.end,
            probe.tolerance,
            "solid end state",
          );
          expect(
            Math.abs(solid.value - react.value),
            "solid-motion and motion/react end in the same place",
          ).toBeLessThanOrEqual(Math.max(probe.tolerance, 0.5));
        }
      });

      for (const change of probe.changes) {
        const label = JSON.stringify(change.set);
        test(`a control changes the result: ${label}`, async ({ page }) => {
          const live = await open(page, probe);
          for (const side of live) {
            const base = await play(page, probe, side, replay(page, probe));
            const changed = await play(
              page,
              probe,
              side,
              apply(page, probe, change.set),
            );
            if (change.effect === "end") {
              expectNear(
                changed.value,
                change.end,
                probe.tolerance,
                `${side} end after ${label}`,
              );
              expect(
                Math.abs(changed.value - base.value),
                `${side} end did not move after ${label}`,
              ).toBeGreaterThan(probe.tolerance);
            } else if (change.effect === "slower") {
              expect(
                changed.settleMs - base.settleMs,
                `${side} settle time after ${label}`,
              ).toBeGreaterThan(500);
            } else {
              expect(
                base.settleMs - changed.settleMs,
                `${side} settle time after ${label}`,
              ).toBeGreaterThan(500);
            }
            await page.reload();
            await page.locator(demoRoot(probe)).scrollIntoViewIfNeeded();
            await waitReady(page, probe);
          }
        });
      }
    });
  }
});
