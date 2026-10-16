import type { Locator, Page } from "@playwright/test";

import { center, type Aggregate, type Metric } from "./measure.ts";

/** A control value the test sets, by the control's `key`. */
export type Setting = Record<string, string | number | boolean>;

type Change =
  /** The demo ends somewhere else. */
  | { set: Setting; effect: "end"; end: number }
  /** The demo takes at least 500ms longer to settle. */
  | { set: Setting; effect: "slower" }
  /** The demo takes at least 500ms less to settle. */
  | { set: Setting; effect: "faster" };

/**
 * What a test observes about one demo. The same probe runs against both panes,
 * so the two libraries are held to one expectation.
 */
export interface Probe {
  demo: string;
  page: string;
  metric: Metric;
  aggregate?: Aggregate;
  /** Elements to read, inside a pane. */
  target?: string;
  /** The input that moves the demo to its end state. Absent when it plays on mount. */
  act?: (pane: Locator, page: Page) => Promise<void>;
  end: number;
  tolerance: number;
  changes: Change[];
}

const hover: Probe["act"] = async (pane, page) => {
  await page.mouse.move(2, 2);
  await pane.locator("[data-probe]").hover();
};

const click =
  (selector: string): Probe["act"] =>
  async (pane) => {
    await pane.locator(selector).first().click();
  };

const dragBy =
  (dx: number, dy: number): Probe["act"] =>
  async (pane, page) => {
    const start = await center(pane.locator("[data-probe]"));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx / 2, start.y + dy / 2, { steps: 6 });
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 6 });
    await page.mouse.up();
  };

const scrollTo =
  (top: number): Probe["act"] =>
  async (pane) => {
    await pane.locator(".scroller").evaluate((element, y) => {
      element.scrollTop = y;
    }, top);
  };

const slowTween: Setting = { type: "tween", duration: 2.5 };

export const probes: Probe[] = [
  {
    demo: "entrance",
    page: "animating-elements",
    metric: "scale",
    end: 1,
    tolerance: 0.02,
    changes: [{ set: slowTween, effect: "slower" }],
  },
  {
    demo: "keyframes",
    page: "animating-elements",
    metric: "rotate",
    end: 90,
    tolerance: 1,
    changes: [{ set: { duration: 3 }, effect: "slower" }],
  },
  {
    demo: "stagger",
    page: "variants",
    metric: "opacity",
    aggregate: "sum",
    end: 5,
    tolerance: 0.05,
    changes: [
      { set: { stagger: 0.4 }, effect: "slower" },
      { set: { variant: "hidden" }, effect: "end", end: 0 },
    ],
  },
  {
    demo: "hover-tap",
    page: "gestures",
    metric: "scale",
    act: hover,
    end: 1.3,
    tolerance: 0.03,
    changes: [{ set: { hover: 1.6 }, effect: "end", end: 1.6 }],
  },
  {
    demo: "drag",
    page: "drag",
    metric: "x",
    act: dragBy(60, 0),
    end: 60,
    tolerance: 4,
    changes: [
      { set: { snapBack: true }, effect: "end", end: 0 },
      { set: { constraint: 30 }, effect: "end", end: 30 },
      { set: { axis: "y" }, effect: "end", end: 0 },
    ],
  },
  {
    demo: "switch",
    page: "layout",
    metric: "left",
    act: click(".track"),
    end: 40,
    tolerance: 2,
    changes: [{ set: slowTween, effect: "slower" }],
  },
  {
    demo: "tabs",
    page: "layout",
    metric: "left",
    act: click(".tab >> nth=2"),
    end: 145.6,
    tolerance: 2,
    changes: [{ set: slowTween, effect: "slower" }],
  },
  {
    demo: "presence",
    page: "presence",
    metric: "opacity",
    aggregate: "sum",
    act: click("button"),
    end: 0,
    tolerance: 0.02,
    changes: [{ set: { duration: 2.5 }, effect: "slower" }],
  },
  {
    demo: "rows",
    page: "presence",
    metric: "opacity",
    aggregate: "sum",
    act: click('button[aria-label="Remove Inbox"]'),
    end: 3,
    tolerance: 0.02,
    changes: [{ set: { duration: 1.5 }, effect: "slower" }],
  },
  {
    demo: "scroll-progress",
    page: "scroll",
    metric: "scaleX",
    act: scrollTo(190),
    end: 0.586,
    tolerance: 0.03,
    changes: [{ set: { offset: "enter" }, effect: "end", end: 1 }],
  },
  {
    demo: "follow",
    page: "motion-values",
    metric: "x",
    act: click("button"),
    end: 140,
    tolerance: 1,
    changes: [{ set: { stiffness: 600, damping: 50 }, effect: "faster" }],
  },
  {
    demo: "draw",
    page: "svg",
    metric: "dash",
    end: 1,
    tolerance: 0.02,
    changes: [{ set: { duration: 3 }, effect: "slower" }],
  },
  {
    demo: "sequence",
    page: "create-animate",
    metric: "x",
    aggregate: "sum",
    end: 360,
    tolerance: 2,
    changes: [{ set: { duration: 1.2 }, effect: "slower" }],
  },
  {
    demo: "config",
    page: "configuration",
    metric: "x",
    end: 110,
    tolerance: 1,
    changes: [{ set: { skip: true }, effect: "faster" }],
  },
  {
    demo: "path",
    page: "animating-elements",
    metric: "x",
    end: 180,
    tolerance: 1,
    changes: [{ set: { distance: 100 }, effect: "end", end: 100 }],
  },
  {
    demo: "animate-value",
    page: "create-animate",
    metric: "text",
    end: 100,
    tolerance: 1,
    changes: [{ set: { to: 250 }, effect: "end", end: 250 }],
  },
  {
    demo: "sequence-at",
    page: "create-animate",
    metric: "x",
    aggregate: "sum",
    end: 360,
    tolerance: 2,
    changes: [{ set: { duration: 1.2 }, effect: "slower" }],
  },
];
