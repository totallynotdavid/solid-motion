import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnimatePresenceList,
  createDragControls,
  motion,
  type DragBounds,
  type DragControls,
  type PanInfo,
} from "../src";
import { advance, useFakeClock } from "./clock";
import { stubBox, type Box } from "./layout-measure";

useFakeClock();

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, {
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    bubbles: true,
  });
}

/** Presses on `element` and moves in steps, one frame apart. */
async function dragTo(
  element: Element,
  from: [number, number],
  to: [number, number],
  { release = true, steps = 4 } = {},
): Promise<void> {
  element.dispatchEvent(pointer("pointerdown", from[0], from[1]));
  for (let step = 1; step <= steps; step++) {
    window.dispatchEvent(
      pointer(
        "pointermove",
        from[0] + ((to[0] - from[0]) * step) / steps,
        from[1] + ((to[1] - from[1]) * step) / steps,
      ),
    );
    await advance(16);
  }
  if (release) window.dispatchEvent(pointer("pointerup", to[0], to[1]));
}

function translation(element: HTMLElement): { x: number; y: number } {
  const match = (axis: string) =>
    Number(
      new RegExp(`translate${axis}\\((-?[\\d.e+-]+)px\\)`).exec(
        element.style.transform,
      )?.[1] ?? 0,
    );
  return { x: match("X"), y: match("Y") };
}

/** Lays the element out at `box`, moved by whatever drag has translated it. */
function stubDraggedBox(element: HTMLElement, box: Box): void {
  stubBox(element, () => {
    const { x, y } = translation(element);
    return { ...box, left: box.left + x, top: box.top + y };
  });
}

describe("drag", () => {
  afterEach(() => document.body.replaceChildren());

  it("follows the pointer on both axes", async () => {
    const { container } = render(() => <motion.div drag />);
    const element = container.querySelector("div") as HTMLElement;

    await dragTo(element, [10, 10], [60, 40], { release: false });

    expect(translation(element)).toEqual({ x: 50, y: 30 });
  });

  it("moves along one axis only", async () => {
    const { container } = render(() => <motion.div drag="x" />);
    const element = container.querySelector("div") as HTMLElement;

    await dragTo(element, [0, 0], [50, 40], { release: false });

    expect(translation(element)).toEqual({ x: 50, y: 0 });
  });

  it("treats a small movement as a click, not a drag", async () => {
    const onDragStart = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <motion.div drag onDragStart={onDragStart} />
    ));
    const element = container.querySelector("div") as HTMLElement;

    await dragTo(element, [0, 0], [2, 0], { release: false });

    expect(onDragStart).not.toHaveBeenCalled();
    expect(translation(element).x).toBe(0);
  });

  it("does nothing until `drag` is set", async () => {
    const [enabled, setEnabled] = createSignal(false);
    const { container } = render(() => <motion.div drag={enabled()} />);
    const element = container.querySelector("div") as HTMLElement;

    await dragTo(element, [0, 0], [50, 0]);
    expect(translation(element).x).toBe(0);

    setEnabled(true);
    flush();
    await dragTo(element, [0, 0], [50, 0], { release: false });
    expect(translation(element).x).toBe(50);
  });

  it("stops the browser claiming the gesture", () => {
    const { container } = render(() => <motion.div drag="x" />);
    const element = container.querySelector("div") as HTMLElement;

    expect(element.style.touchAction).toBe("pan-y");
    expect(element.style.userSelect).toBe("none");
    expect(element.draggable).toBe(false);
  });

  it("reports the drag through its callbacks", async () => {
    const calls: string[] = [];
    let ended: PanInfo | undefined;
    const { container } = render(() => (
      <motion.div
        drag
        dragMomentum={false}
        onDragStart={() => calls.push("start")}
        onDrag={() => calls.push("drag")}
        onDragEnd={(_event, info) => {
          calls.push("end");
          ended = info;
        }}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    await dragTo(element, [0, 0], [40, 0]);
    await advance(32);

    expect(calls[0]).toBe("start");
    expect(calls.filter((call) => call === "drag").length).toBeGreaterThan(0);
    expect(calls.at(-1)).toBe("end");
    expect(ended?.offset.x).toBe(40);
  });

  it("applies whileDrag only while dragging", async () => {
    const { container } = render(() => (
      <motion.div
        drag
        dragMomentum={false}
        whileDrag={{ scale: 1.5 }}
        transition={{ duration: 0.05 }}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;

    await dragTo(element, [0, 0], [40, 0], { release: false });
    await advance(100);
    expect(element.style.transform).toContain("scale(1.5)");

    window.dispatchEvent(pointer("pointerup", 40, 0));
    await advance(200);
    expect(element.style.transform).not.toContain("scale(1.5)");
  });

  describe("constraints", () => {
    it("stops at fixed limits", async () => {
      const { container } = render(() => (
        <motion.div
          drag="x"
          dragElastic={false}
          dragConstraints={{ left: -20, right: 30 }}
        />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [200, 0], { release: false });
      expect(translation(element).x).toBe(30);

      window.dispatchEvent(pointer("pointerup", 200, 0));
      await dragTo(element, [200, 0], [-400, 0], { release: false });
      expect(translation(element).x).toBe(-20);
    });

    it("lets the element be pulled past a limit by the elastic factor", async () => {
      const { container } = render(() => (
        <motion.div
          drag="x"
          dragElastic={0.5}
          dragConstraints={{ left: 0, right: 100 }}
        />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [200, 0], { release: false });

      expect(translation(element).x).toBe(150);
    });

    it("springs back to the limit on release", async () => {
      const { container } = render(() => (
        <motion.div drag="x" dragConstraints={{ left: 0, right: 100 }} />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [300, 0]);
      expect(translation(element).x).toBeGreaterThan(100);

      await advance(2000);
      expect(translation(element).x).toBeCloseTo(100, 0);
    });

    it("keeps the element inside a container element", async () => {
      const view = render(() => (
        <div class="wrap">
          <motion.div
            class="box"
            drag
            dragElastic={false}
            dragConstraints={() => wrapper()}
          />
        </div>
      ));
      const element = view.container.querySelector(".box") as HTMLElement;
      const wrapper = () =>
        view.container.querySelector(".wrap") as HTMLElement;
      vi.spyOn(wrapper(), "getBoundingClientRect").mockReturnValue(
        DOMRect.fromRect({ x: 100, y: 100, width: 300, height: 200 }),
      );
      stubDraggedBox(element, { left: 150, top: 120, width: 50, height: 50 });

      await dragTo(element, [0, 0], [1000, 1000], { release: false });
      // 100..400 wide minus the element's 150..200 box leaves 200 to the right
      // and 180 below.
      expect(translation(element)).toEqual({ x: 200, y: 130 });
    });

    it("lets the caller adjust measured constraints", async () => {
      const onMeasure = vi.fn<(constraints: DragBounds) => DragBounds>(() => ({
        left: -10,
        right: 10,
      }));
      const view = render(() => (
        <div class="wrap">
          <motion.div
            class="box"
            drag="x"
            dragElastic={false}
            dragConstraints={() => wrapper()}
            onMeasureDragConstraints={onMeasure}
          />
        </div>
      ));
      const element = view.container.querySelector(".box") as HTMLElement;
      const wrapper = () =>
        view.container.querySelector(".wrap") as HTMLElement;
      vi.spyOn(wrapper(), "getBoundingClientRect").mockReturnValue(
        DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 200 }),
      );
      stubDraggedBox(element, { left: 0, top: 0, width: 50, height: 50 });

      await dragTo(element, [0, 0], [500, 0], { release: false });

      expect(onMeasure).toHaveBeenCalledWith(
        expect.objectContaining({ left: 0, right: 250 }),
      );
      expect(translation(element).x).toBe(10);
    });
  });

  describe("release", () => {
    it("carries on with the release velocity", async () => {
      const { container } = render(() => <motion.div drag="x" />);
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [80, 0]);
      const released = translation(element).x;
      await advance(1500);

      expect(translation(element).x).toBeGreaterThan(released + 20);
    });

    it("stays where it was released without momentum", async () => {
      const { container } = render(() => (
        <motion.div drag="x" dragMomentum={false} />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [80, 0]);
      await advance(1500);

      expect(translation(element).x).toBe(80);
    });

    it("returns to the start when asked to snap to origin", async () => {
      const { container } = render(() => (
        <motion.div drag dragSnapToOrigin dragMomentum={false} />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [80, 60]);
      await advance(2000);

      const { x, y } = translation(element);
      expect(Math.abs(x)).toBeLessThan(1);
      expect(Math.abs(y)).toBeLessThan(1);
    });

    it("signals the end of the release animation", async () => {
      const onDragTransitionEnd = vi.fn<(...args: unknown[]) => void>();
      const { container } = render(() => (
        <motion.div
          drag
          dragSnapToOrigin
          dragMomentum={false}
          onDragTransitionEnd={onDragTransitionEnd}
        />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [80, 0]);
      expect(onDragTransitionEnd).not.toHaveBeenCalled();
      await advance(3000);

      expect(onDragTransitionEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("direction lock", () => {
    it("locks to the axis the drag first moves along", async () => {
      const onDirectionLock = vi.fn<(...args: unknown[]) => void>();
      const { container } = render(() => (
        <motion.div
          drag
          dragDirectionLock
          dragMomentum={false}
          onDirectionLock={onDirectionLock}
        />
      ));
      const element = container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [60, 20], { release: false, steps: 6 });

      expect(onDirectionLock).toHaveBeenCalledWith("x");
      expect(translation(element).y).toBe(0);
      expect(translation(element).x).toBeGreaterThan(0);
    });
  });

  describe("controls", () => {
    it("starts a drag from another element", async () => {
      let controls!: DragControls;
      const view = render(() => {
        controls = createDragControls();
        return (
          <>
            <div class="handle" />
            <motion.div drag dragControls={controls} dragListener={false} />
          </>
        );
      });
      const element = view.container.querySelector(
        "div:not(.handle)",
      ) as HTMLElement;
      const handle = view.container.querySelector(".handle") as HTMLElement;

      await dragTo(element, [0, 0], [50, 0], { release: false });
      expect(translation(element).x).toBe(0);
      window.dispatchEvent(pointer("pointerup", 50, 0));

      const press = pointer("pointerdown", 0, 0);
      handle.dispatchEvent(press);
      controls.start(press);
      for (const x of [20, 40, 60]) {
        window.dispatchEvent(pointer("pointermove", x, 0));
        await advance(16);
      }

      expect(translation(element).x).toBe(60);
    });

    it("centres the element on the pointer with snapToCursor", async () => {
      let controls!: DragControls;
      const view = render(() => {
        controls = createDragControls();
        return <motion.div drag dragControls={controls} dragListener={false} />;
      });
      const element = view.container.querySelector("div") as HTMLElement;
      stubDraggedBox(element, { left: 0, top: 0, width: 100, height: 100 });

      controls.start(pointer("pointerdown", 150, 50), { snapToCursor: true });
      await advance(16);

      expect(translation(element)).toEqual({ x: 100, y: 0 });
    });

    it("ends a drag on demand", async () => {
      const onDragEnd = vi.fn<(...args: unknown[]) => void>();
      let controls!: DragControls;
      const view = render(() => {
        controls = createDragControls();
        return (
          <motion.div
            class="box"
            drag
            dragMomentum={false}
            dragControls={controls}
            onDragEnd={onDragEnd}
          />
        );
      });
      const element = view.container.querySelector("div") as HTMLElement;

      await dragTo(element, [0, 0], [40, 0], { release: false });
      controls.stop();
      await advance(32);
      window.dispatchEvent(pointer("pointermove", 90, 0));
      await advance(16);

      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(translation(element).x).toBe(40);
    });
  });

  describe("nesting", () => {
    it("drags only the innermost of two draggables on the same axis", async () => {
      const view = render(() => (
        <motion.div class="outer" drag="x">
          <motion.div class="inner" drag="x" />
        </motion.div>
      ));
      const outer = view.container.querySelector(".outer") as HTMLElement;
      const inner = view.container.querySelector(".inner") as HTMLElement;

      await dragTo(inner, [0, 0], [50, 0], { release: false });

      expect(translation(inner).x).toBe(50);
      expect(translation(outer).x).toBe(0);
    });

    it("drags the ancestors too with dragPropagation", async () => {
      const view = render(() => (
        <motion.div class="outer" drag="x" dragPropagation>
          <motion.div class="inner" drag="x" dragPropagation />
        </motion.div>
      ));
      const outer = view.container.querySelector(".outer") as HTMLElement;
      const inner = view.container.querySelector(".inner") as HTMLElement;

      await dragTo(inner, [0, 0], [50, 0], { release: false });

      expect(translation(inner).x).toBe(50);
      expect(translation(outer).x).toBe(50);
    });
  });

  it("cannot be picked up while it is leaving", async () => {
    const [items, setItems] = createSignal([{ id: "one" }]);
    const view = render(() => (
      <AnimatePresenceList each={items()} getKey={(item) => item.id}>
        {() => (
          <motion.div drag exit={{ opacity: 0 }} transition={{ duration: 5 }} />
        )}
      </AnimatePresenceList>
    ));
    const element = view.container.querySelector("div") as HTMLElement;
    setItems([]);
    flush();
    await advance(16);

    await dragTo(element, [0, 0], [50, 0], { release: false });

    expect(translation(element).x).toBe(0);
  });

  it("releases its listeners when the element is removed", async () => {
    const onDrag = vi.fn<(...args: unknown[]) => void>();
    const [shown, setShown] = createSignal(true);
    const view = render(() => (
      <>{shown() && <motion.div drag onDrag={onDrag} />}</>
    ));
    const element = view.container.querySelector("div") as HTMLElement;

    element.dispatchEvent(pointer("pointerdown", 0, 0));
    setShown(false);
    flush();
    window.dispatchEvent(pointer("pointermove", 40, 0));
    await advance(32);

    expect(onDrag).not.toHaveBeenCalled();
  });
});
