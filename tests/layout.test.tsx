import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { AnimatePresence, MotionConfig, motion } from "../src";
import { advance, useFakeClock } from "./clock";
import {
  between,
  projectedBox,
  sample,
  settle,
  stubBox,
} from "./layout-measure";

useFakeClock();

describe("layout", () => {
  afterEach(() => document.body.replaceChildren());

  it("interpolates the box between where the element was and where the render put it", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      // The container's class moves the child without changing the child's DOM.
      <div class={wide() ? "row wide" : "row"}>
        <motion.div class="box" layout transition={{ duration: 0.4 }} />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    // Establish the initial layout baseline.
    await advance(50);

    setWide(true);
    flush();

    const boxes = await sample(element, 250);
    // The element must occupy intermediate position and size during the flight.
    const midpoints = boxes.filter(
      (box) =>
        between(box.left, collapsed.left, expanded.left) &&
        between(box.width, collapsed.width, expanded.width),
    );
    expect(midpoints.length).toBeGreaterThan(3);

    const first = midpoints[0];
    const last = midpoints[midpoints.length - 1];
    expect(last.left).toBeGreaterThan(first.left);
    expect(last.width).toBeGreaterThan(first.width);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("moves without resizing when only the position is asked for", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout="position"
          transition={{ duration: 0.4 }}
        />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await advance(50);

    setWide(true);
    flush();

    const boxes = await sample(element, 250);
    const moving = boxes.filter((box) =>
      between(box.left, collapsed.left, expanded.left),
    );
    expect(moving.length).toBeGreaterThan(3);

    // Position-only projection keeps the destination size throughout the flight.
    for (const box of boxes) expect(box.width).toBe(expanded.width);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("lands the layout change without moving when animations are switched off", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <MotionConfig skipAnimations>
        <div class={wide() ? "row wide" : "row"}>
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </div>
      </MotionConfig>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await advance(50);

    setWide(true);
    flush();

    // Layout projection has its own animation path, so the off switch must reach it.
    const boxes = await sample(element, 200);
    for (const box of boxes) expect(box).toEqual(expanded);
  });

  it("leaves a running layout animation alone when the page changes elsewhere", async () => {
    const [wide, setWide] = createSignal(false);
    const [noise, setNoise] = createSignal(0);

    const { container } = render(() => (
      <div>
        <div class={wide() ? "row wide" : "row"}>
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </div>
        <ul class="elsewhere">{noise() > 0 ? <li>noise</li> : null}</ul>
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await advance(50);

    setWide(true);
    flush();
    await advance(60);

    // An unrelated list must not give this node a fresh destination snapshot.
    setNoise(1);
    flush();

    const boxes = await sample(element, 200);
    const midpoints = boxes.filter((box) =>
      between(box.left, collapsed.left, expanded.left),
    );
    expect(midpoints.length).toBeGreaterThan(3);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("carries a layoutId out of the box its counterpart occupied", async () => {
    const [open, setOpen] = createSignal(false);

    const { container } = render(() => (
      // The counterpart moves when the newcomer mounts.
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
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));

    const thumbBox = { left: 0, top: 0, width: 100, height: 100 };
    const movedThumbBox = { left: 900, top: 0, width: 100, height: 100 };
    const fullBox = { left: 300, top: 200, width: 400, height: 300 };

    const thumb = container.querySelector(".thumb") as HTMLElement;
    stubBox(thumb, () => (open() ? movedThumbBox : thumbBox));
    await advance(50);

    setOpen(true);
    flush();
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(full, () => fullBox);

    const boxes = await sample(full, 250);

    // The newcomer starts at the outgoing member's previous box.
    const [origin] = boxes.filter((box) => box.left !== fullBox.left);
    expect(origin.left).toBeLessThan(thumbBox.left + 40);
    expect(origin.width).toBeLessThan(thumbBox.width + 40);

    const travelling = boxes.filter(
      (box) =>
        between(box.left, thumbBox.left, fullBox.left) &&
        between(box.width, thumbBox.width, fullBox.width),
    );
    expect(travelling.length).toBeGreaterThan(3);

    // Both members follow the shared trajectory while they crossfade.
    const outgoing = projectedBox(thumb);
    expect(between(outgoing.left, thumbBox.left, fullBox.left)).toBe(true);
    expect(between(outgoing.width, thumbBox.width, fullBox.width)).toBe(true);

    await settle();
    expect(projectedBox(full)).toEqual(fullBox);
    expect(Number(thumb.style.opacity)).toBe(0);
  });

  it("aims a running animation at the box a later container change gave it", async () => {
    const [step, setStep] = createSignal(0);

    const { container } = render(() => (
      <div class={`row step-${step()}`}>
        <motion.div class="box" layout transition={{ duration: 0.4 }} />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const positions = [0, 200, -300];
    stubBox(element, () => ({
      left: positions[step()],
      top: 0,
      width: 100,
      height: 100,
    }));

    await advance(50);

    setStep(1);
    flush();
    await advance(120);

    // The container's class moves the child again, mid-flight.
    setStep(2);
    flush();
    await advance(32);

    // An animation still aimed at the second box overshoots the third one,
    // because the element is laid out there while the transform is not.
    const boxes = await sample(element, 200);
    for (const box of boxes) expect(box.left).toBeGreaterThan(positions[2] - 1);

    await settle();
    expect(projectedBox(element).left).toBe(positions[2]);
  });

  it("carries an interrupted animation on from where the element had reached", async () => {
    const [wide, setWide] = createSignal(false);
    const [crowded, setCrowded] = createSignal(false);

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        {crowded() ? <div class="filler" /> : null}
        <motion.div class="box" layout transition={{ duration: 0.4 }} />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const home = { left: 0, top: 0, width: 100, height: 100 };
    const away = { left: 200, top: 0, width: 100, height: 100 };
    const pushed = { left: -300, top: 0, width: 100, height: 100 };
    stubBox(element, () => {
      if (crowded()) return pushed;
      return wide() ? away : home;
    });

    await advance(50);

    setWide(true);
    flush();
    await advance(120);

    const reached = projectedBox(element);
    // A sibling arrives mid-flight and sends the element back the other way.
    setCrowded(true);
    flush();

    // Restarting from the first destination would carry the element forward to
    // a box it never occupied before turning around.
    const boxes = await sample(element, 200);
    for (const box of boxes) expect(box.left).toBeLessThan(reached.left + 20);

    await settle();
    expect(projectedBox(element)).toEqual(pushed);
  });

  it("keeps the pointer events the caller set on a shared element", async () => {
    const { container } = render(() => (
      <motion.div
        class="thumb"
        layoutId="card"
        style={{ "pointer-events": "none" }}
      />
    ));

    const element = container.querySelector(".thumb") as HTMLElement;
    stubBox(element, () => ({ left: 0, top: 0, width: 100, height: 100 }));

    // Projection owns `pointerEvents` on a shared element and clears it on
    // every paint that has no delta to apply.
    await settle();
    expect(element.style.pointerEvents).toBe("none");
  });

  it("keeps a reactive pointer-events value current on a shared element", async () => {
    const [locked, setLocked] = createSignal(true);

    const { container } = render(() => (
      <motion.div
        class="thumb"
        layoutId="lockable"
        style={{ "pointer-events": () => (locked() ? "none" : "auto") }}
      />
    ));

    const element = container.querySelector(".thumb") as HTMLElement;
    stubBox(element, () => ({ left: 0, top: 0, width: 100, height: 100 }));

    await settle();
    expect(element.style.pointerEvents).toBe("none");

    setLocked(false);
    await settle();
    // A frozen-at-mount styleProp would still read the value captured before
    // this change; an accessor-driven entry stripped from styleProp entirely
    // would fall back to the empty string instead.
    expect(element.style.pointerEvents).toBe("auto");
  });

  it("preserves a caller-set transform through a layout transition", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          transition={{ duration: 0.4 }}
          style={{ transform: "rotate(45deg)" }}
        />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await advance(50);

    setWide(true);
    flush();
    await settle();

    // Projection composes its own transform on top; the caller's static one
    // survives only if it is composed in rather than replaced outright.
    expect(element.style.transform).toContain("rotate(45deg)");
  });

  // A caller transform of "none" composed onto the generated transform is
  // invalid CSS, which the browser drops whole.
  it.each(["none", "  NONE  "])(
    "still animates a layout change when the caller's style has transform: %j",
    async (callerTransform) => {
      const [wide, setWide] = createSignal(false);

      const { container } = render(() => (
        <div class={wide() ? "row wide" : "row"}>
          <motion.div
            class="box"
            layout
            transition={{ duration: 0.4 }}
            style={{ transform: callerTransform }}
          />
        </div>
      ));

      const element = container.querySelector(".box") as HTMLElement;
      const collapsed = { left: 0, top: 0, width: 100, height: 100 };
      const expanded = { left: 200, top: 0, width: 300, height: 100 };
      stubBox(element, () => (wide() ? expanded : collapsed));

      await advance(50);

      setWide(true);
      flush();

      const boxes = await sample(element, 250);
      const midpoints = boxes.filter(
        (box) =>
          between(box.left, collapsed.left, expanded.left) &&
          between(box.width, collapsed.width, expanded.width),
      );
      expect(midpoints.length).toBeGreaterThan(3);

      await settle();
      expect(projectedBox(element)).toEqual(expanded);
    },
  );

  it.each([
    {
      name: "a motion ancestor's reactive style",
      ancestor: (wide: () => boolean) => (
        <motion.div
          class="row"
          style={{ "padding-left": wide() ? "200px" : "0px" }}
        >
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </motion.div>
      ),
    },
    {
      name: "a motion ancestor's accessor-wrapped style value",
      ancestor: (wide: () => boolean) => (
        <motion.div
          class="row"
          style={{ "padding-left": () => (wide() ? "200px" : "0px") }}
        >
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </motion.div>
      ),
    },
    {
      name: "an ancestor's inline style",
      ancestor: (wide: () => boolean) => (
        <div class="row" style={{ "padding-left": wide() ? "200px" : "0px" }}>
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </div>
      ),
    },
    {
      name: "an ancestor's data attribute",
      ancestor: (wide: () => boolean) => (
        <div class="row" data-size={wide() ? "wide" : "narrow"}>
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </div>
      ),
    },
  ])("animates a layout change driven by $name", async ({ ancestor }) => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => ancestor(wide));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 100, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await advance(50);

    setWide(true);
    flush();

    const boxes = await sample(element, 250);
    const midpoints = boxes.filter((box) =>
      between(box.left, collapsed.left, expanded.left),
    );
    expect(midpoints.length).toBeGreaterThan(3);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("takes layout timing from the transition the target carries", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          animate={{ opacity: 1, transition: { layout: { duration: 0.05 } } }}
          transition={{ duration: 5 }}
        />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () =>
      wide() ? expanded : { left: 0, top: 0, width: 100, height: 100 },
    );

    await advance(50);

    setWide(true);
    flush();

    // The element's own five second transition would still be moving here.
    await advance(250);
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("hands the transition back to the surviving member when the other unmounts", async () => {
    const [open, setOpen] = createSignal(true);

    const { container } = render(() => (
      <div>
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
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));

    const thumbBox = { left: 0, top: 0, width: 100, height: 100 };
    const fullBox = { left: 300, top: 200, width: 400, height: 300 };

    const thumb = container.querySelector(".thumb") as HTMLElement;
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(thumb, () => thumbBox);
    stubBox(full, () => fullBox);

    await settle();

    setOpen(false);
    flush();

    const boxes = await sample(thumb, 250);

    // The survivor starts at the removed member's box and walks home.
    expect(boxes[0].left).toBeGreaterThan(fullBox.left - 40);
    const travelling = boxes.filter(
      (box) =>
        between(box.left, thumbBox.left, fullBox.left) &&
        between(box.width, thumbBox.width, fullBox.width),
    );
    expect(travelling.length).toBeGreaterThan(3);

    await settle();
    expect(projectedBox(thumb)).toEqual(thumbBox);
    expect(container.querySelector(".full")).toBeNull();
  });
});
