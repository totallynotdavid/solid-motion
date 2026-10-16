import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { AnimatePresence, LayoutGroup, motion } from "../src";
import { advance, useFakeClock } from "./clock";
import { projectedBox, sample, settle, stubBox } from "./layout-measure";

useFakeClock();

const thumbBox = { left: 0, top: 0, width: 100, height: 100 };
const movedThumbBox = { left: 900, top: 0, width: 100, height: 100 };
const fullBox = { left: 300, top: 200, width: 400, height: 300 };

function cards(groups: { thumb?: string; full?: string }) {
  const [open, setOpen] = createSignal(false);

  const { container } = render(() => {
    const thumb = () => (
      <motion.div
        class="thumb"
        layoutId="card"
        transition={{ duration: 0.4 }}
      />
    );
    const full = () => (
      <AnimatePresence when={open()}>
        {() => (
          <motion.div
            class="full"
            layoutId="card"
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
    );
    const scoped = (id: string | undefined, content: () => unknown) =>
      id === undefined ? (
        content()
      ) : (
        <LayoutGroup id={id}>{content() as never}</LayoutGroup>
      );

    return (
      <div class={open() ? "row open" : "row"}>
        {scoped(groups.thumb, thumb)}
        {scoped(groups.full, full)}
      </div>
    );
  });

  const thumb = container.querySelector(".thumb") as HTMLElement;
  stubBox(thumb, () => (open() ? movedThumbBox : thumbBox));

  return {
    async open() {
      await advance(50);
      setOpen(true);
      flush();
      const full = container.querySelector(".full") as HTMLElement;
      stubBox(full, () => fullBox);
      return { full, boxes: await sample(full, 250) };
    },
  };
}

describe("LayoutGroup", () => {
  afterEach(() => document.body.replaceChildren());

  it("shares a layoutId between elements in the same group", async () => {
    const { open } = cards({ thumb: "a", full: "a" });
    const { full, boxes } = await open();

    const [origin] = boxes.filter((box) => box.left !== fullBox.left);
    expect(origin.left).toBeLessThan(thumbBox.left + 40);

    await settle();
    expect(projectedBox(full)).toEqual(fullBox);
  });

  it("keeps the same layoutId in different groups apart", async () => {
    const { open } = cards({ thumb: "a", full: "b" });
    const { full, boxes } = await open();

    expect(boxes.every((box) => box.left === fullBox.left)).toBe(true);
    expect(projectedBox(full)).toEqual(fullBox);
  });

  it("nests the ids of groups inside one another", async () => {
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => (
      <div class={open() ? "row open" : "row"}>
        <LayoutGroup id="list">
          <motion.div class="thumb" layoutId="card" />
          <LayoutGroup id="inner">
            <AnimatePresence when={open()}>
              {() => (
                <motion.div
                  class="full"
                  layoutId="card"
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
          </LayoutGroup>
        </LayoutGroup>
      </div>
    ));
    stubBox(container.querySelector(".thumb") as HTMLElement, () =>
      open() ? movedThumbBox : thumbBox,
    );
    await advance(50);

    setOpen(true);
    flush();
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(full, () => fullBox);
    const boxes = await sample(full, 250);

    // "list-card" and "list-inner-card" are different shared elements.
    expect(boxes.every((box) => box.left === fullBox.left)).toBe(true);
  });

  it("starts a fresh namespace when it does not inherit", async () => {
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => (
      <div class={open() ? "row open" : "row"}>
        <LayoutGroup id="a">
          <motion.div class="thumb" layoutId="card" />
          <LayoutGroup id="a" inherit={false}>
            <AnimatePresence when={open()}>
              {() => (
                <motion.div
                  class="full"
                  layoutId="card"
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
          </LayoutGroup>
        </LayoutGroup>
      </div>
    ));
    stubBox(container.querySelector(".thumb") as HTMLElement, () =>
      open() ? movedThumbBox : thumbBox,
    );
    await advance(50);

    setOpen(true);
    flush();
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(full, () => fullBox);
    const boxes = await sample(full, 250);

    // Both resolve to "a-card", so they are the same shared element.
    const [origin] = boxes.filter((box) => box.left !== fullBox.left);
    expect(origin.left).toBeLessThan(thumbBox.left + 40);
  });
});
