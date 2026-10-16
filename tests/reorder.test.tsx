import { render } from "@solidjs/testing-library";
import { For, createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Reorder } from "../src";
import { advance, useFakeClock } from "./clock";

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
  { release = true, steps = 6 } = {},
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

type Slot = (index: number) => { left: number; top: number };

const column: Slot = (index) => ({ left: 0, top: index * 100 });
const row: Slot = (index) => ({ left: index * 100, top: 0 });
const grid: Slot = (index) => ({
  left: (index % 2) * 100,
  top: Math.floor(index / 2) * 100,
});

/**
 * Lays list items out the way a browser would: by their place among their
 * siblings, shifted by whatever transform they currently carry.
 */
function layOut(slot: Slot, size = 80): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.tagName !== "LI") return DOMRect.fromRect();
      const index = Array.from(this.parentElement!.children).indexOf(this);
      const { left, top } = slot(index);
      const { x, y } = translation(this);
      return DOMRect.fromRect({
        x: left + x,
        y: top + y,
        width: size,
        height: size,
      });
    },
  );
}

function List(props: {
  initial: string[];
  onReorder?: (values: string[]) => void;
  groupProps?: Record<string, unknown>;
  itemProps?: Record<string, unknown>;
}) {
  const [values, setValues] = createSignal(props.initial);
  return (
    <Reorder.Group
      values={values()}
      onReorder={(next) => {
        props.onReorder?.(next);
        setValues(next);
      }}
      {...props.groupProps}
    >
      <For each={values()}>
        {(value) => (
          <Reorder.Item value={value} data-value={value} {...props.itemProps}>
            {value}
          </Reorder.Item>
        )}
      </For>
    </Reorder.Group>
  );
}

const order = (container: Element) =>
  Array.from(container.querySelectorAll("li")).map(
    (item) => item.dataset.value,
  );

const item = (container: Element, value: string) =>
  container.querySelector(`[data-value="${value}"]`) as HTMLElement;

describe("Reorder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("reports the new order when an item is dragged past the next one", async () => {
    layOut(column);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b", "c"]} onReorder={onReorder} />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 90], { release: false });

    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(order(container)).toEqual(["b", "a", "c"]);
  });

  it("reorders upwards", async () => {
    layOut(column);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b", "c"]} onReorder={onReorder} />
    ));
    await advance(50);

    await dragTo(item(container, "c"), [10, 210], [10, 130], {
      release: false,
    });

    expect(onReorder).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  it("waits until the item is past the middle of its neighbour", async () => {
    layOut(column);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b", "c"]} onReorder={onReorder} />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 50], { release: false });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps moving an item across several neighbours in one drag", async () => {
    layOut(column);
    const { container } = render(() => <List initial={["a", "b", "c"]} />);
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 230], {
      release: false,
      steps: 20,
    });

    expect(order(container)).toEqual(["b", "c", "a"]);
  });

  it("returns the dragged item to its slot on release", async () => {
    layOut(column);
    const { container } = render(() => <List initial={["a", "b", "c"]} />);
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 90]);
    await advance(1000);

    expect(translation(item(container, "a")).y).toBeCloseTo(0, 0);
    expect(order(container)).toEqual(["b", "a", "c"]);
  });

  it("lifts the item above its siblings while it is away from its slot", async () => {
    layOut(column);
    const { container } = render(() => <List initial={["a", "b"]} />);
    await advance(50);

    expect(item(container, "a").style.zIndex).toBe("unset");

    await dragTo(item(container, "a"), [10, 10], [10, 40], { release: false });
    expect(item(container, "a").style.zIndex).toBe("1");
    expect(item(container, "b").style.zIndex).toBe("unset");
  });

  it("drags sideways when the items sit side by side", async () => {
    layOut(row);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b", "c"]} onReorder={onReorder} />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [90, 40], { release: false });

    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(translation(item(container, "a")).y).toBe(0);
  });

  it("follows an explicit axis over the measured one", async () => {
    layOut(column);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List
        initial={["a", "b", "c"]}
        onReorder={onReorder}
        groupProps={{ axis: "x" }}
      />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 150], { release: false });

    expect(onReorder).not.toHaveBeenCalled();
    expect(translation(item(container, "a")).y).toBe(0);
  });

  it("moves between rows of a wrapping list", async () => {
    layOut(grid);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b", "c", "d"]} onReorder={onReorder} />
    ));
    await advance(50);

    await dragTo(item(container, "b"), [110, 10], [20, 110], {
      release: false,
    });

    expect(onReorder).toHaveBeenCalledWith(["a", "c", "b", "d"]);
  });

  it("swaps within a row of a wrapping list", async () => {
    layOut(grid);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b", "c", "d"]} onReorder={onReorder} />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [110, 10], { release: false });

    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c", "d"]);
  });

  it("does not report again until the new order has rendered", async () => {
    layOut(column);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const stuck = ["a", "b", "c"];
    const { container } = render(() => (
      // The parent ignores the new order, so the old measurements stay.
      <Reorder.Group values={stuck} onReorder={onReorder}>
        <For each={stuck}>
          {(value) => (
            <Reorder.Item value={value} data-value={value}>
              {value}
            </Reorder.Item>
          )}
        </For>
      </Reorder.Group>
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 90], {
      release: false,
      steps: 12,
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it("calls the item's own drag handlers as well", async () => {
    layOut(column);
    const onDrag = vi.fn<(...args: unknown[]) => void>();
    const onDragEnd = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List initial={["a", "b"]} itemProps={{ onDrag, onDragEnd }} />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [10, 60]);
    await advance(500);

    expect(onDrag).toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("renders the elements `as` asks for", async () => {
    const { container } = render(() => (
      <Reorder.Group as="ol" values={["a"]} onReorder={() => {}}>
        <Reorder.Item as="div" value="a">
          a
        </Reorder.Item>
      </Reorder.Group>
    ));

    expect(container.querySelector("ol > div")).not.toBeNull();
  });

  it("swallows the click that ends a reordering drag", async () => {
    layOut(column);
    const onClick = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => <List initial={["a", "b", "c"]} />);
    container.addEventListener("click", onClick);
    await advance(50);
    const dragged = item(container, "a");

    await dragTo(dragged, [10, 10], [10, 90]);
    dragged.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
    );

    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets an ordinary click through", async () => {
    layOut(column);
    const onClick = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => <List initial={["a", "b", "c"]} />);
    container.addEventListener("click", onClick);
    await advance(50);

    item(container, "a").dispatchEvent(
      new MouseEvent("click", { bubbles: true, detail: 1 }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("scrolls the container when an item is dragged to its edge", async () => {
    layOut(column);
    const { container } = render(() => (
      <div class="scroller" style={{ "overflow-y": "auto" }}>
        <List initial={["a", "b", "c", "d", "e"]} />
      </div>
    ));
    const scroller = container.querySelector(".scroller") as HTMLElement;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 300 }),
    );
    Object.defineProperty(scroller, "scrollHeight", { value: 600 });
    Object.defineProperty(scroller, "clientHeight", { value: 300 });
    await advance(50);

    // The pointer ends 10px from the bottom edge, moving towards it.
    await dragTo(item(container, "a"), [10, 100], [10, 290], {
      release: false,
    });

    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it("does not scroll while the pointer is away from the edges", async () => {
    layOut(column);
    const { container } = render(() => (
      <div class="scroller" style={{ "overflow-y": "auto" }}>
        <List initial={["a", "b", "c", "d", "e"]} />
      </div>
    ));
    const scroller = container.querySelector(".scroller") as HTMLElement;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 300 }),
    );
    Object.defineProperty(scroller, "scrollHeight", { value: 600 });
    Object.defineProperty(scroller, "clientHeight", { value: 300 });
    await advance(50);

    await dragTo(item(container, "a"), [10, 100], [10, 160], {
      release: false,
    });

    expect(scroller.scrollTop).toBe(0);
  });

  it("does not scroll when the pointer is at an edge but moving away from it", async () => {
    layOut(column);
    const { container } = render(() => (
      <div class="scroller" style={{ "overflow-y": "auto" }}>
        <List initial={["a", "b", "c", "d", "e"]} />
      </div>
    ));
    const scroller = container.querySelector(".scroller") as HTMLElement;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 300 }),
    );
    Object.defineProperty(scroller, "scrollHeight", { value: 600 });
    Object.defineProperty(scroller, "clientHeight", { value: 300 });
    await advance(50);

    await dragTo(item(container, "a"), [10, 290], [10, 270], {
      release: false,
    });

    expect(scroller.scrollTop).toBe(0);
  });

  it("places an item in a new row from the right when the text runs right to left", async () => {
    layOut(grid);
    const onReorder = vi.fn<(...args: unknown[]) => void>();
    const { container } = render(() => (
      <List
        initial={["a", "b", "c", "d"]}
        onReorder={onReorder}
        groupProps={{ style: { direction: "rtl" } }}
      />
    ));
    await advance(50);

    await dragTo(item(container, "a"), [10, 10], [170, 110], {
      release: false,
    });

    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c", "d"]);
  });

  it("cannot render an item outside a group", () => {
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(() => <Reorder.Item value="a" />)).toThrow(
      "inside Reorder.Group",
    );
    silence.mockRestore();
  });
});
