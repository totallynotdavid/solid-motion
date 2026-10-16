import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { createAnimationControls, motion } from "../src";
import { advance, outcomeWithin, settled, useFakeClock } from "./clock";

useFakeClock();

const opacityOf = (element: Element) =>
  Number((element as HTMLElement).style.opacity);

describe("animation controls", () => {
  afterEach(() => document.body.replaceChildren());

  it("animates to a target when started, and resolves on arrival", async () => {
    const controls = createAnimationControls();
    const { container } = render(() => (
      <motion.div
        animate={controls}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "linear" }}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;
    flush();
    await advance(100);
    expect(opacityOf(element)).toBe(0);

    const done = controls.start({ opacity: 1 });
    flush();
    await advance(100);
    expect(opacityOf(element)).toBeGreaterThan(0);
    expect(opacityOf(element)).toBeLessThan(1);

    await settled(done);
    expect(opacityOf(element)).toBe(1);
  });

  it("starts a variant label, on the element and on its children", async () => {
    const controls = createAnimationControls();
    const variants = {
      hidden: { opacity: 0 },
      shown: { opacity: 1 },
    };
    const { container } = render(() => (
      <motion.div
        animate={controls}
        initial="hidden"
        variants={variants}
        transition={{ duration: 0.1 }}
      >
        <motion.span variants={variants} transition={{ duration: 0.1 }} />
      </motion.div>
    ));
    const parent = container.querySelector("div") as HTMLElement;
    const child = container.querySelector("span") as HTMLElement;
    flush();
    await advance(50);
    expect(opacityOf(parent)).toBe(0);
    expect(opacityOf(child)).toBe(0);

    await settled(controls.start("shown"));

    expect(opacityOf(parent)).toBe(1);
    expect(opacityOf(child)).toBe(1);
  });

  it("drives every element it is given to", async () => {
    const controls = createAnimationControls();
    const { container } = render(() => (
      <>
        <motion.i animate={controls} initial={{ opacity: 0 }} />
        <motion.b animate={controls} initial={{ opacity: 0 }} />
      </>
    ));
    flush();

    await settled(controls.start({ opacity: 1 }, { duration: 0.1 }));

    expect(opacityOf(container.querySelector("i")!)).toBe(1);
    expect(opacityOf(container.querySelector("b")!)).toBe(1);
  });

  it("uses the transition it is started with instead of the element's", async () => {
    const controls = createAnimationControls();
    const { container } = render(() => (
      <motion.div
        animate={controls}
        initial={{ opacity: 0 }}
        transition={{ duration: 10 }}
      />
    ));
    flush();

    const done = controls.start({ opacity: 1 }, { duration: 0.1 });
    await settled(done, 1000);

    expect(opacityOf(container.querySelector("div")!)).toBe(1);
  });

  it("resolves a call that a later call interrupts", async () => {
    const controls = createAnimationControls();
    render(() => (
      <motion.div
        animate={controls}
        initial={{ opacity: 0 }}
        transition={{ duration: 5 }}
      />
    ));
    flush();

    const first = controls.start({ opacity: 1 });
    flush();
    await advance(100);
    controls.start({ opacity: 0.5 });
    flush();

    const outcome = await outcomeWithin(first, 200);
    expect(outcome).toBe("settled");
  });

  it("jumps with set, without animating", async () => {
    const controls = createAnimationControls();
    const { container } = render(() => (
      <motion.div
        animate={controls}
        initial={{ opacity: 0 }}
        transition={{ duration: 10 }}
      />
    ));
    flush();

    controls.set({ opacity: 0.7 });
    flush();
    await advance(16);

    expect(opacityOf(container.querySelector("div")!)).toBeCloseTo(0.7);
  });

  it("halts a running animation with stop", async () => {
    const controls = createAnimationControls();
    const { container } = render(() => (
      <motion.div
        animate={controls}
        initial={{ opacity: 0 }}
        transition={{ duration: 1, ease: "linear" }}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;
    flush();

    controls.start({ opacity: 1 });
    flush();
    await advance(400);
    controls.stop();
    const stoppedAt = opacityOf(element);
    await advance(600);

    expect(stoppedAt).toBeGreaterThan(0.2);
    expect(stoppedAt).toBeLessThan(0.7);
    expect(opacityOf(element)).toBe(stoppedAt);
  });

  it("goes back to an earlier target after a stop", async () => {
    const controls = createAnimationControls();
    const { container } = render(() => (
      <motion.div
        animate={controls}
        initial={{ opacity: 0 }}
        transition={{ duration: 1, ease: "linear" }}
      />
    ));
    flush();

    controls.start({ opacity: 1 });
    flush();
    await advance(500);
    controls.stop();
    await settled(controls.start({ opacity: 1 }, { duration: 0.1 }));

    expect(opacityOf(container.querySelector("div")!)).toBe(1);
  });

  it("lets go of an element that is removed", async () => {
    const controls = createAnimationControls();
    const [shown, setShown] = createSignal(true);
    render(() => (
      <>
        {shown() && <motion.div animate={controls} initial={{ opacity: 0 }} />}
      </>
    ));
    flush();
    const pending = controls.start({ opacity: 1 }, { duration: 5 });
    flush();

    setShown(false);
    flush();

    expect(await outcomeWithin(pending, 100)).toBe("settled");
    await expect(controls.start({ opacity: 0 })).resolves.toBeUndefined();
  });
});
