import type { Locator, Page } from "@playwright/test";

/** What a probe reads from the element it points at. */
export type Metric =
  | "x"
  | "scale"
  | "scaleX"
  | "rotate"
  | "opacity"
  | "left"
  | "dash"
  | "text";

export type Aggregate = "first" | "sum";

export interface Reading {
  value: number;
  /** Milliseconds from `arm()` to the last change, 0 if it moved only before. */
  settleMs: number;
}

interface Watch {
  scope: string;
  target: string;
  metric: Metric;
  aggregate: Aggregate;
  quietMs: number;
}

declare global {
  interface Window {
    motionWatch: { armed: boolean; armedAt: number };
  }
}

/**
 * Starts watching a pane. The returned promise resolves once the reading has
 * been still for `quietMs` since `arm()` was called, so a caller can do
 * its input first without the watch giving up.
 */
export function watch(page: Page, options: Watch) {
  const pending = page.evaluate(
    ({ scope, target, metric, aggregate, quietMs }) => {
      window.motionWatch = { armed: false, armedAt: 0 };
      const small = ["scale", "scaleX", "opacity", "dash"];
      const epsilon = small.includes(metric) ? 0.004 : 0.5;

      const reading = (element: Element, stage: Element): number => {
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(
          style.transform === "none" ? undefined : style.transform,
        );
        switch (metric) {
          case "x":
            return matrix.e;
          case "scale":
            return Math.hypot(matrix.a, matrix.b);
          case "scaleX":
            return matrix.a;
          case "rotate":
            return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
          case "opacity":
            return Number(style.opacity);
          case "left":
            return (
              element.getBoundingClientRect().left -
              (
                element.closest("[data-origin]") ?? stage
              ).getBoundingClientRect().left
            );
          case "dash":
            return parseFloat(style.strokeDasharray);
          case "text":
            return parseFloat(element.textContent ?? "");
        }
      };

      const read = (): number => {
        const root = document.querySelector(scope);
        if (!root) return Number.NaN;
        const stage = root.querySelector(".stage") ?? root;
        const found = Array.from(root.querySelectorAll(target));
        const values = found.map((element) => reading(element, stage));
        if (aggregate === "sum") return values.reduce((sum, v) => sum + v, 0);
        return values[0] ?? Number.NaN;
      };

      return new Promise<{ value: number; settleMs: number }>((resolve) => {
        let last = read();
        let changed = performance.now();
        const tick = () => {
          const now = performance.now();
          const value = read();
          if (!(Math.abs(value - last) <= epsilon)) {
            last = value;
            changed = now;
          }
          const { armed, armedAt } = window.motionWatch;
          if (armed && now - Math.max(changed, armedAt) > quietMs) {
            resolve({
              value: last,
              settleMs: Math.max(0, changed - window.motionWatch.armedAt),
            });
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
    },
    options,
  );
  return {
    result: pending,
    arm: () =>
      page.evaluate(() => {
        window.motionWatch.armedAt = performance.now();
        window.motionWatch.armed = true;
      }),
  };
}

export async function center(
  locator: Locator,
): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
