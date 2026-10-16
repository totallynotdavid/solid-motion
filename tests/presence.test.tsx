import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnimatePresence,
  AnimatePresenceList,
  motion,
  useIsPresent,
  usePresenceData,
} from "../src";
import { advance, useFakeClock } from "./clock";

useFakeClock();

describe("useIsPresent", () => {
  afterEach(() => document.body.replaceChildren());

  it("is true outside a boundary", () => {
    let present!: () => boolean;
    function Probe() {
      present = useIsPresent();
      return null;
    }
    render(() => <Probe />);
    expect(present()).toBe(true);
  });

  it("turns false as the subtree starts to leave", async () => {
    const [open, setOpen] = createSignal(true);
    let present!: () => boolean;
    function Probe() {
      present = useIsPresent();
      return (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      );
    }

    render(() => (
      <AnimatePresence when={open()}>{() => <Probe />}</AnimatePresence>
    ));
    expect(present()).toBe(true);

    setOpen(false);
    flush();
    expect(present()).toBe(false);

    await advance(500);
    flush();
  });
});

describe("usePresenceData", () => {
  afterEach(() => document.body.replaceChildren());

  it("follows the boundary's custom value, including after the owner moves on", async () => {
    const [direction, setDirection] = createSignal(1);
    const [open, setOpen] = createSignal(true);
    let data!: () => number | undefined;
    function Probe() {
      data = usePresenceData<number>();
      return (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      );
    }

    render(() => (
      <AnimatePresence when={open()} custom={direction()}>
        {() => <Probe />}
      </AnimatePresence>
    ));
    expect(data()).toBe(1);

    setDirection(-1);
    setOpen(false);
    flush();
    expect(data()).toBe(-1);

    await advance(500);
    flush();
  });
});

/**
 * jsdom has no layout, so a row's box is derived from how many siblings are in
 * its parent. That makes the measurement observably depend on when it is taken:
 * before the newcomer is inserted the row sits at the top, after it the row is
 * pushed down.
 */
function layOutByPosition(root: HTMLElement) {
  const boxFor = (element: Element) => {
    const index = Array.from(element.parentElement!.children).indexOf(element);
    return { top: index * 100, left: 20, width: 200, height: 100 };
  };
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!root.contains(this)) return original.call(this);
    const box = boxFor(this);
    return {
      ...box,
      x: box.left,
      y: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
      toJSON: () => box,
    };
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

describe("mode popLayout", () => {
  afterEach(() => document.body.replaceChildren());

  it("pins an exiting row where it was while its sibling takes its place", async () => {
    const [items, setItems] = createSignal([{ id: "a" }, { id: "b" }]);
    const { container } = render(() => (
      <div data-testid="list">
        <AnimatePresenceList
          each={items()}
          getKey={(item) => item.id}
          mode="popLayout"
        >
          {(item) => (
            <motion.div
              data-id={item().id}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresenceList>
      </div>
    ));
    const restore = layOutByPosition(container);
    const row = (id: string) =>
      container.querySelector(`[data-id="${id}"]`) as HTMLElement;
    const leaving = row("b");

    setItems([{ id: "a" }, { id: "c" }]);
    flush();

    expect(leaving.style.position).toBe("absolute");
    expect(leaving.style.width).toBe("200px");
    expect(leaving.style.height).toBe("100px");
    expect(leaving.style.top).toBe("100px");
    expect(leaving.style.left).toBe("20px");
    expect(leaving.style.getPropertyPriority("position")).toBe("important");

    await advance(800);
    flush();
    restore();
    expect(container.querySelector('[data-id="b"]')).toBeNull();
  });

  it("anchors to the right and bottom when asked", async () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <div>
        <AnimatePresence
          when={open()}
          mode="popLayout"
          anchorX="right"
          anchorY="bottom"
        >
          {() => (
            <motion.div
              data-id="only"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));
    const restore = layOutByPosition(container);
    const element = container.querySelector("[data-id]") as HTMLElement;
    Object.defineProperty(element, "offsetParent", {
      value: Object.assign(document.createElement("div"), {}),
    });
    const parent = element.offsetParent as HTMLElement;
    Object.defineProperties(parent, {
      clientWidth: { value: 500 },
      clientHeight: { value: 400 },
    });
    parent.getBoundingClientRect = () => new DOMRect(0, 0, 500, 400);

    setOpen(false);
    flush();

    expect(element.style.right).toBe("280px");
    expect(element.style.bottom).toBe("300px");
    expect(element.style.left).toBe("");
    expect(element.style.top).toBe("");

    await advance(500);
    flush();
    restore();
  });

  it("measures right and bottom against the viewport when nothing is the offset parent", async () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <div>
        <AnimatePresence
          when={open()}
          mode="popLayout"
          anchorX="right"
          anchorY="bottom"
        >
          {() => (
            <motion.div
              data-id="only"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));
    const restore = layOutByPosition(container);
    const root = document.documentElement;
    Object.defineProperties(root, {
      clientWidth: { value: 500, configurable: true },
      clientHeight: { value: 400, configurable: true },
    });
    const element = container.querySelector("[data-id]") as HTMLElement;
    expect(element.offsetParent).toBeNull();

    setOpen(false);
    flush();

    expect(element.style.right).toBe("280px");
    expect(element.style.bottom).toBe("300px");

    await advance(500);
    flush();
    restore();
    Reflect.deleteProperty(root, "clientWidth");
    Reflect.deleteProperty(root, "clientHeight");
  });

  it("puts the element back when the subtree returns before it has gone", async () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <div>
        <AnimatePresence when={open()} mode="popLayout">
          {() => (
            <motion.div
              data-id="only"
              style={{ position: "relative" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));
    const restore = layOutByPosition(container);
    const element = container.querySelector("[data-id]") as HTMLElement;

    setOpen(false);
    flush();
    expect(element.style.position).toBe("absolute");

    await advance(100);
    setOpen(true);
    flush();
    expect(element.style.position).toBe("relative");
    expect(element.style.width).toBe("");
    restore();
  });
});

describe("propagate", () => {
  afterEach(() => document.body.replaceChildren());

  it("lets an inner boundary exit with the outer one and holds the outer open", async () => {
    const [open, setOpen] = createSignal(true);
    const exited: string[] = [];
    const { container } = render(() => (
      <AnimatePresence
        when={open()}
        onExitComplete={() => exited.push("outer")}
      >
        {() => (
          <motion.section
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            data-id="outer"
          >
            <AnimatePresence
              when="inner"
              propagate
              onExitComplete={() => exited.push("inner")}
            >
              {() => (
                <motion.p
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  data-id="inner"
                />
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>
    ));

    setOpen(false);
    flush();
    await advance(300);
    flush();

    // The outer exit is long finished; the inner one is still playing.
    expect(container.querySelector('[data-id="outer"]')).not.toBeNull();
    expect(exited).toEqual([]);

    await advance(600);
    flush();
    expect(container.querySelector('[data-id="outer"]')).toBeNull();
    expect(exited).toContain("outer");
  });

  it("leaves an inner boundary without it alone, as before", async () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <AnimatePresence when={open()}>
        {() => (
          <motion.section exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
            <AnimatePresence when="inner">
              {() => (
                <motion.p
                  exit={{ opacity: 0 }}
                  transition={{ duration: 5 }}
                  data-id="inner"
                />
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>
    ));

    setOpen(false);
    flush();
    await advance(400);
    flush();

    expect(container.querySelector("section")).toBeNull();
  });
});

describe("onExitComplete", () => {
  afterEach(() => document.body.replaceChildren());

  it("fires once when the single subtree has left", async () => {
    const [open, setOpen] = createSignal(true);
    const done = vi.fn<() => void>();
    render(() => (
      <AnimatePresence when={open()} onExitComplete={done}>
        {() => (
          <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.1 }} />
        )}
      </AnimatePresence>
    ));

    setOpen(false);
    flush();
    expect(done).not.toHaveBeenCalled();

    await advance(400);
    flush();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("fires for a list only after the last leaving row has gone", async () => {
    const [items, setItems] = createSignal([{ id: "a" }, { id: "b" }]);
    const done = vi.fn<() => void>();
    render(() => (
      <AnimatePresenceList
        each={items()}
        getKey={(item) => item.id}
        onExitComplete={done}
      >
        {(item) => (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: item().id === "a" ? 0.1 : 0.5 }}
          />
        )}
      </AnimatePresenceList>
    ));

    setItems([]);
    flush();
    await advance(250);
    flush();
    expect(done).not.toHaveBeenCalled();

    await advance(600);
    flush();
    expect(done).toHaveBeenCalledTimes(1);
  });
});
