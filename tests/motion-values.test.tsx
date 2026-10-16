import { render } from "@solidjs/testing-library";
import { createRoot, createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MotionConfig,
  createAnimationFrame,
  createMotionTemplate,
  createMotionValue,
  createMotionValueEvent,
  createPageInView,
  createTransform,
  isMotionValue,
  motion,
  useReducedMotionConfig,
} from "../src";
import { advance, useFakeClock } from "./clock";

useFakeClock();

describe("createTransform", () => {
  afterEach(() => document.body.replaceChildren());

  it("maps a value from one range to another", async () => {
    await createRoot(async (dispose) => {
      const progress = createMotionValue(0);
      const opacity = createTransform(progress, [0, 1], [1, 0.2]);
      expect(opacity.get()).toBe(1);

      progress.set(0.5);
      await advance(16);
      expect(opacity.get()).toBeCloseTo(0.6);

      progress.set(2);
      await advance(16);
      expect(opacity.get()).toBeCloseTo(0.2);
      dispose();
    });
  });

  it("maps to non-numeric outputs", async () => {
    await createRoot(async (dispose) => {
      const x = createMotionValue(0);
      const colour = createTransform(x, [0, 100], ["#000000", "#ffffff"]);

      x.set(100);
      await advance(16);
      expect(colour.get()).toBe("rgba(255, 255, 255, 1)");
      dispose();
    });
  });

  it("recomputes a function of several values when any changes", async () => {
    await createRoot(async (dispose) => {
      const width = createMotionValue(2);
      const height = createMotionValue(3);
      const area = createTransform(() => width.get() * height.get());
      expect(area.get()).toBe(6);

      height.set(10);
      await advance(16);
      expect(area.get()).toBe(20);

      width.set(5);
      await advance(16);
      expect(area.get()).toBe(50);
      dispose();
    });
  });

  it("drives an element's style without a re-render", async () => {
    const x = createMotionValue(0);
    const { container } = render(() => {
      const opacity = createTransform(x, [0, 100], [0, 1]);
      return <motion.div style={{ opacity }} />;
    });
    const element = container.querySelector("div") as HTMLElement;

    x.set(50);
    await advance(32);

    expect(element.style.opacity).toBe("0.5");
  });

  it("stops following when its owner is cleaned up", async () => {
    const source = createMotionValue(0);
    let derived!: ReturnType<typeof createTransform<number>>;
    const dispose = createRoot((stop) => {
      derived = createTransform(source, [0, 1], [0, 10]);
      return stop;
    });

    dispose();
    source.set(1);
    await advance(16);

    expect(derived.get()).toBe(0);
  });
});

describe("createMotionTemplate", () => {
  it("builds a string from motion values, plain strings and numbers", async () => {
    await createRoot(async (dispose) => {
      const radius = createMotionValue(4);
      const filter = createMotionTemplate`blur(${radius}px) hue-rotate(${90}deg) ${"opacity(0.5)"}`;
      expect(filter.get()).toBe("blur(4px) hue-rotate(90deg) opacity(0.5)");

      radius.set(12);
      await advance(16);
      expect(filter.get()).toBe("blur(12px) hue-rotate(90deg) opacity(0.5)");
      dispose();
    });
  });
});

describe("createMotionValueEvent", () => {
  it("calls back on every change until the owner is cleaned up", () => {
    const value = createMotionValue(0);
    const seen: number[] = [];
    const dispose = createRoot((stop) => {
      createMotionValueEvent(value, "change", (latest) => seen.push(latest));
      return stop;
    });

    value.set(1);
    value.set(2);
    dispose();
    value.set(3);

    expect(seen).toEqual([1, 2]);
  });
});

describe("createAnimationFrame", () => {
  it("runs every frame with elapsed time and delta, and stops on cleanup", async () => {
    const frames: Array<[number, number]> = [];
    const dispose = createRoot((stop) => {
      createAnimationFrame((time, delta) => frames.push([time, delta]));
      return stop;
    });

    await advance(100);
    const count = frames.length;
    expect(count).toBeGreaterThan(3);
    expect(frames[0][0]).toBe(0);
    expect(frames.at(-1)![0]).toBeGreaterThan(50);
    expect(frames.at(-1)![1]).toBeGreaterThan(0);

    dispose();
    await advance(100);
    expect(frames.length).toBe(count);
  });
});

describe("createPageInView", () => {
  it("follows the tab's visibility", () => {
    const pageInView = createPageInView();
    expect(pageInView()).toBe(true);

    const state = vi.spyOn(document, "visibilityState", "get");
    state.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    flush();
    expect(pageInView()).toBe(false);

    state.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    flush();
    expect(pageInView()).toBe(true);
    state.mockRestore();
  });
});

describe("useReducedMotionConfig", () => {
  afterEach(() => document.body.replaceChildren());

  it("resolves the nearest MotionConfig", () => {
    const seen: Record<string, boolean> = {};
    function Probe(props: { name: string }) {
      const reduced = useReducedMotionConfig();
      seen[props.name] = reduced();
      return null;
    }

    render(() => (
      <>
        <Probe name="default" />
        <MotionConfig reducedMotion="always">
          <Probe name="always" />
          <MotionConfig reducedMotion="never">
            <Probe name="never" />
          </MotionConfig>
        </MotionConfig>
      </>
    ));

    expect(seen).toEqual({ default: false, always: true, never: false });
  });

  it("follows a changing config", () => {
    const [mode, setMode] = createSignal<"always" | "never">("never");
    let reduced!: () => boolean;
    function Probe() {
      reduced = useReducedMotionConfig();
      return null;
    }
    render(() => (
      <MotionConfig reducedMotion={mode()}>
        <Probe />
      </MotionConfig>
    ));
    expect(reduced()).toBe(false);

    setMode("always");
    flush();
    expect(reduced()).toBe(true);
  });
});

describe("isMotionValue", () => {
  it("tells a motion value from anything else", () => {
    const value = createRoot(() => createMotionValue(1));
    expect(isMotionValue(value)).toBe(true);
    expect(isMotionValue(() => 1)).toBe(false);
    expect(isMotionValue(1)).toBe(false);
  });
});
