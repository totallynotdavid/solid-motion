import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import {
  AnimatePresence,
  instantLayoutTransition,
  motion,
  resetLayout,
} from "../src";
import { advance, useFakeClock } from "./clock";
import {
  between,
  projectedBox,
  sample,
  settle,
  stubBox,
} from "./layout-measure";

useFakeClock();

const collapsed = { left: 0, top: 0, width: 100, height: 100 };
const expanded = { left: 200, top: 0, width: 300, height: 100 };

describe("layout callbacks", () => {
  afterEach(() => document.body.replaceChildren());

  it("reports each measurement with the one before it", async () => {
    const [wide, setWide] = createSignal(false);
    const measured: Array<{ width: number; before: number | undefined }> = [];

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          transition={{ duration: 0.2 }}
          onLayoutMeasure={(box, previous) =>
            measured.push({
              width: box.x.max - box.x.min,
              before: previous && previous.x.max - previous.x.min,
            })
          }
        />
      </div>
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () => (wide() ? expanded : collapsed));
    await advance(50);
    measured.length = 0;

    setWide(true);
    flush();
    await settle();

    expect(measured).toContainEqual({ width: 300, before: 100 });
  });

  it("calls onBeforeLayoutMeasure ahead of the measurement it precedes", async () => {
    const [wide, setWide] = createSignal(false);
    const order: string[] = [];

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          onBeforeLayoutMeasure={() => order.push("before")}
          onLayoutMeasure={() => order.push("measure")}
        />
      </div>
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () => (wide() ? expanded : collapsed));
    await advance(50);
    order.length = 0;

    setWide(true);
    flush();
    await settle();

    expect(order.indexOf("before")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("before")).toBeLessThan(order.indexOf("measure"));
  });

  it("calls onLayoutAnimationStart when the move begins and onLayoutAnimationComplete when it lands", async () => {
    const [wide, setWide] = createSignal(false);
    const events: string[] = [];

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          transition={{ duration: 0.4 }}
          onLayoutAnimationStart={() => events.push("start")}
          onLayoutAnimationComplete={() => events.push("complete")}
        />
      </div>
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () => (wide() ? expanded : collapsed));
    await advance(50);
    expect(events).toEqual([]);

    setWide(true);
    flush();
    await advance(100);
    expect(events).toEqual(["start"]);

    await settle();
    expect(events).toEqual(["start", "complete"]);
  });
});

describe("layoutDependency", () => {
  afterEach(() => document.body.replaceChildren());

  it("re-measures for a change no DOM mutation announces", async () => {
    const [moved, setMoved] = createSignal(false);

    const { container } = render(() => (
      <motion.div
        class="box"
        layout
        layoutDependency={moved()}
        transition={{ duration: 0.4 }}
      />
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () => (moved() ? expanded : collapsed));
    await advance(50);

    setMoved(true);
    flush();

    const boxes = await sample(element, 250);
    expect(
      boxes.filter((box) => between(box.left, collapsed.left, expanded.left))
        .length,
    ).toBeGreaterThan(3);
    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("leaves an element alone when the dependency has not changed", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          layoutDependency="stable"
          transition={{ duration: 0.4 }}
        />
      </div>
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () => (wide() ? expanded : collapsed));
    await advance(50);

    setWide(true);
    flush();

    const boxes = await sample(element, 250);
    expect(
      boxes.filter((box) => between(box.left, collapsed.left, expanded.left)),
    ).toEqual([]);
    expect(projectedBox(element)).toEqual(expanded);
  });
});

describe("layoutScroll", () => {
  afterEach(() => document.body.replaceChildren());

  /** Scrolls a container and moves its child by the same amount. */
  async function scrollContainer(layoutScroll: boolean) {
    const [offset, setOffset] = createSignal(0);

    const { container } = render(() => (
      <motion.div class="scroller" layoutScroll={layoutScroll}>
        <div class={offset() ? "list scrolled" : "list"}>
          <motion.div class="item" layout transition={{ duration: 0.4 }} />
        </div>
      </motion.div>
    ));
    const scroller = container.querySelector(".scroller") as HTMLElement;
    const item = container.querySelector(".item") as HTMLElement;
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      get: offset,
    });
    stubBox(scroller, () => ({ left: 0, top: 0, width: 400, height: 200 }));
    stubBox(item, () => ({
      left: 0,
      top: 300 - offset(),
      width: 100,
      height: 100,
    }));
    await advance(50);

    setOffset(120);
    flush();
    return { item, boxes: await sample(item, 250) };
  }

  it("treats a scrolled container's content as unmoved", async () => {
    const { item, boxes } = await scrollContainer(true);

    expect(boxes.every((box) => box.top === 180)).toBe(true);
    expect(projectedBox(item).top).toBe(180);
  });

  it("animates the scroll as a move without it", async () => {
    const { boxes } = await scrollContainer(false);

    expect(boxes.some((box) => between(box.top, 180, 300))).toBe(true);
  });
});

describe("layoutCrossfade", () => {
  afterEach(() => document.body.replaceChildren());

  /** Swaps a shared element in and returns its opacity early in the move. */
  async function opacityMidway(crossfade: boolean | undefined) {
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => (
      <div class={open() ? "row open" : "row"}>
        <motion.div
          class="thumb"
          layoutId="card"
          transition={{ duration: 0.4 }}
        />
        <AnimatePresence when={open()}>
          {() => (
            <motion.div
              class="full"
              layoutId="card"
              layoutCrossfade={crossfade}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));
    const thumb = container.querySelector(".thumb") as HTMLElement;
    stubBox(thumb, () => collapsed);
    await advance(50);

    setOpen(true);
    flush();
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(full, () => expanded);
    await advance(48);
    return full.style.opacity;
  }

  it("fades a shared element in by default", async () => {
    const opacity = await opacityMidway(undefined);
    expect(Number(opacity)).toBeLessThan(1);
  });

  it("leaves a shared element at full opacity when turned off", async () => {
    const opacity = await opacityMidway(false);
    expect(opacity === "" || Number(opacity) === 1).toBe(true);
  });
});

describe("layout transitions", () => {
  afterEach(() => document.body.replaceChildren());

  function wideBox() {
    const [wide, setWide] = createSignal(false);
    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div class="box" layout transition={{ duration: 0.4 }} />
      </div>
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () => (wide() ? expanded : collapsed));
    return { element, setWide };
  }

  const inFlight = (boxes: Array<{ left: number }>) =>
    boxes.filter((box) => between(box.left, collapsed.left, expanded.left));

  it("applies the layout change made inside instantLayoutTransition at once", async () => {
    const { element, setWide } = wideBox();
    await advance(50);

    instantLayoutTransition(() => setWide(true));
    flush();

    expect(inFlight(await sample(element, 250))).toEqual([]);
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("animates the next change after an instant one", async () => {
    const { element, setWide } = wideBox();
    await advance(50);
    instantLayoutTransition(() => setWide(true));
    flush();
    await settle();

    setWide(false);
    flush();

    expect(inFlight(await sample(element, 250)).length).toBeGreaterThan(3);
  });

  it("takes a fresh baseline instead of animating after resetLayout", async () => {
    const { element, setWide } = wideBox();
    await advance(50);

    setWide(true);
    flush();
    resetLayout();

    expect(inFlight(await sample(element, 250))).toEqual([]);
    expect(projectedBox(element)).toEqual(expanded);
  });
});
