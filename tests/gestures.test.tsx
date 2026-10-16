import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MotionConfig,
  motion,
  type PanInfo,
  type TapHandler,
  type ViewportHandler,
} from "../src";
import { advance, useFakeClock } from "./clock";

useFakeClock();

function pointer(type: string, x = 0, y = 0): PointerEvent {
  return new PointerEvent(type, {
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    bubbles: true,
  });
}

describe("tap", () => {
  afterEach(() => document.body.replaceChildren());

  it("calls onTapStart on press and onTap on release over the element", async () => {
    const calls: string[] = [];
    const { container } = render(() => (
      <motion.div
        onTapStart={() => calls.push("start")}
        onTap={() => calls.push("tap")}
        onTapCancel={() => calls.push("cancel")}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown"));
    await advance(16);
    expect(calls).toEqual(["start"]);

    element.dispatchEvent(pointer("pointerup"));
    await advance(16);
    expect(calls).toEqual(["start", "tap"]);
  });

  it("calls onTapCancel when the press ends elsewhere", async () => {
    const calls: string[] = [];
    const { container } = render(() => (
      <>
        <motion.div
          onTap={() => calls.push("tap")}
          onTapCancel={() => calls.push("cancel")}
        />
        <span class="elsewhere" />
      </>
    ));
    const element = container.querySelector("div") as HTMLElement;
    const elsewhere = container.querySelector(".elsewhere") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown"));
    elsewhere.dispatchEvent(pointer("pointerup"));
    await advance(16);

    expect(calls).toEqual(["cancel"]);
  });

  it("ends a press anywhere in the window with globalTapTarget", async () => {
    const onTap = vi.fn<TapHandler>();
    const { container } = render(() => (
      <>
        <motion.div globalTapTarget onTap={onTap} />
        <span class="elsewhere" />
      </>
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown"));
    window.dispatchEvent(pointer("pointerup"));
    await advance(16);

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("gives the pointer position in page coordinates", async () => {
    const onTap = vi.fn<TapHandler>();
    const { container } = render(() => <motion.div onTap={onTap} />);
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 12, 34));
    element.dispatchEvent(pointer("pointerup", 12, 34));
    await advance(16);

    expect(onTap.mock.calls[0][1].point).toEqual({ x: 12, y: 34 });
  });

  it("applies whileTap while pressed and releases it", async () => {
    const { container } = render(() => (
      <motion.div whileTap={{ scale: 0.5 }} transition={{ duration: 0.05 }} />
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown"));
    await advance(150);
    expect(element.style.transform).toContain("scale(0.5)");

    element.dispatchEvent(pointer("pointerup"));
    await advance(150);
    expect(element.style.transform).not.toContain("scale(0.5)");
  });

  it("presses with the Enter key", async () => {
    const onTap = vi.fn<TapHandler>();
    const { container } = render(() => <motion.div onTap={onTap} />);
    const element = container.querySelector("div") as HTMLElement;

    // Taps make the element focusable, and Enter only presses once it is.
    expect(element.tabIndex).toBe(0);
    element.focus();
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Enter", bubbles: true }),
    );
    await advance(16);

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("ignores a press on a disabled button", async () => {
    const onTapStart = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <motion.button disabled onTapStart={onTapStart} />
    ));
    const element = container.querySelector("button") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown"));
    await advance(16);

    expect(onTapStart).not.toHaveBeenCalled();
  });

  it("taps its ancestors too, unless propagate.tap is false", async () => {
    const outer = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <motion.div class="outer" onTap={outer}>
        <motion.div class="inner" propagate={{ tap: false }} onTap={() => {}} />
      </motion.div>
    ));
    const inner = container.querySelector(".inner") as HTMLElement;

    inner.dispatchEvent(pointer("pointerdown"));
    inner.dispatchEvent(pointer("pointerup"));
    await advance(16);

    expect(outer).not.toHaveBeenCalled();
  });

  it("follows a change to propagate.tap after mount", async () => {
    const [isolated, setIsolated] = createSignal(false);
    const outer = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <motion.div class="outer" onTap={outer}>
        <motion.div
          class="inner"
          propagate={{ tap: !isolated() }}
          onTap={() => {}}
        />
      </motion.div>
    ));
    const inner = container.querySelector(".inner") as HTMLElement;
    const tapInner = async () => {
      inner.dispatchEvent(pointer("pointerdown"));
      inner.dispatchEvent(pointer("pointerup"));
      await advance(16);
    };

    await tapInner();
    expect(outer).toHaveBeenCalledTimes(1);

    setIsolated(true);
    flush();
    await tapInner();
    expect(outer).toHaveBeenCalledTimes(1);

    setIsolated(false);
    flush();
    await tapInner();
    expect(outer).toHaveBeenCalledTimes(2);
  });

  it("calls the latest handler, not the one it was rendered with", async () => {
    const first = vi.fn<(...args: unknown[]) => void>();
    const second = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => {
      let handler = first;
      const view = <motion.div onTap={(...args) => handler(...args)} />;
      handler = second;
      return view;
    });
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown"));
    element.dispatchEvent(pointer("pointerup"));
    await advance(16);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("hover", () => {
  afterEach(() => document.body.replaceChildren());

  it("calls onHoverStart and onHoverEnd", async () => {
    const calls: string[] = [];
    const { container } = render(() => (
      <motion.div
        onHoverStart={() => calls.push("start")}
        onHoverEnd={() => calls.push("end")}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerenter"));
    await advance(16);
    element.dispatchEvent(pointer("pointerleave"));
    await advance(16);

    expect(calls).toEqual(["start", "end"]);
  });

  it("ignores a touch pointer", async () => {
    const onHoverStart = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <motion.div onHoverStart={onHoverStart} />
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(
      new PointerEvent("pointerenter", {
        pointerType: "touch",
        isPrimary: true,
        bubbles: true,
      }),
    );
    await advance(16);

    expect(onHoverStart).not.toHaveBeenCalled();
  });
});

describe("viewport callbacks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  function stubObserver() {
    let callback: IntersectionObserverCallback | undefined;
    class StubObserver {
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", StubObserver);

    return (target: Element, isIntersecting: boolean) =>
      callback?.(
        [{ target, isIntersecting } as IntersectionObserverEntry],
        null as unknown as IntersectionObserver,
      );
  }

  it("calls onViewportEnter and onViewportLeave on changes only", () => {
    const report = stubObserver();
    const calls: string[] = [];
    const { container } = render(() => (
      <motion.div
        onViewportEnter={() => calls.push("enter")}
        onViewportLeave={() => calls.push("leave")}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    // The observer's first report for an element that starts off screen is
    // not the element leaving.
    report(element, false);
    report(element, true);
    report(element, true);
    report(element, false);

    expect(calls).toEqual(["enter", "leave"]);
  });

  it("passes the observer entry to the callback", () => {
    const report = stubObserver();
    const onViewportEnter = vi.fn<ViewportHandler>();
    const { container } = render(() => (
      <motion.div onViewportEnter={onViewportEnter} />
    ));
    const element = container.querySelector("div") as HTMLElement;

    report(element, true);

    expect(onViewportEnter.mock.calls[0][0].target).toBe(element);
  });

  it("does not report leaving under viewport.once", () => {
    const report = stubObserver();
    const onViewportLeave = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <motion.div
        viewport={{ once: true }}
        onViewportEnter={() => {}}
        onViewportLeave={onViewportLeave}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    report(element, true);
    report(element, false);

    expect(onViewportLeave).not.toHaveBeenCalled();
  });
});

describe("pan", () => {
  afterEach(() => document.body.replaceChildren());

  it("reports a pan once the pointer has travelled past the threshold", async () => {
    const calls: string[] = [];
    let last: PanInfo | undefined;
    const { container } = render(() => (
      <motion.div
        onPanSessionStart={() => calls.push("session")}
        onPanStart={() => calls.push("start")}
        onPan={(_event, info) => {
          calls.push("pan");
          last = info;
        }}
        onPanEnd={() => calls.push("end")}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 0, 0));
    await advance(16);
    expect(calls).toEqual(["session"]);

    window.dispatchEvent(pointer("pointermove", 1, 0));
    await advance(16);
    expect(calls).toEqual(["session"]);

    window.dispatchEvent(pointer("pointermove", 30, 10));
    await advance(16);
    window.dispatchEvent(pointer("pointerup", 30, 10));
    await advance(16);

    expect(calls[1]).toBe("start");
    expect(calls).toContain("pan");
    expect(calls.at(-1)).toBe("end");
    expect(last?.offset).toEqual({ x: 30, y: 10 });
  });

  it("measures velocity over the recent movement", async () => {
    let ended: PanInfo | undefined;
    const { container } = render(() => (
      <motion.div onPanEnd={(_event, info) => (ended = info)} />
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 0, 0));
    for (let x = 10; x <= 50; x += 10) {
      window.dispatchEvent(pointer("pointermove", x, 0));
      await advance(16);
    }
    window.dispatchEvent(pointer("pointerup", 50, 0));
    await advance(16);

    // 10px per 16ms.
    expect(ended?.velocity.x).toBeGreaterThan(500);
    expect(ended?.velocity.x).toBeLessThan(700);
    expect(ended?.velocity.y).toBe(0);
  });

  it("does not report a click as a pan", async () => {
    const onPanEnd = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => <motion.div onPanEnd={onPanEnd} />);
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 0, 0));
    window.dispatchEvent(pointer("pointerup", 0, 0));
    await advance(16);

    expect(onPanEnd).not.toHaveBeenCalled();
  });
});

describe("transformPagePoint", () => {
  afterEach(() => document.body.replaceChildren());

  it("maps pointer coordinates before a pan reports them", async () => {
    let last: PanInfo | undefined;
    const { container } = render(() => (
      <MotionConfig transformPagePoint={({ x, y }) => ({ x: x / 2, y: y / 2 })}>
        <motion.div onPan={(_event, info) => (last = info)} />
      </MotionConfig>
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 0, 0));
    window.dispatchEvent(pointer("pointermove", 80, 40));
    await advance(16);
    window.dispatchEvent(pointer("pointerup", 80, 40));
    await advance(16);

    expect(last?.offset).toEqual({ x: 40, y: 20 });
  });

  it("moves a dragged element by the mapped distance", async () => {
    const { container } = render(() => (
      <MotionConfig transformPagePoint={({ x, y }) => ({ x: x / 2, y: y / 2 })}>
        <motion.div drag dragMomentum={false} />
      </MotionConfig>
    ));
    const element = container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 0, 0));
    window.dispatchEvent(pointer("pointermove", 100, 0));
    await advance(32);

    expect(element.style.transform).toContain("translateX(50px)");
  });
});
