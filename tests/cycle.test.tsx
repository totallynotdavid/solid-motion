import { createRoot, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { createCycle } from "../src";

let dispose: VoidFunction | undefined;

function setup<T>(...items: [T, ...T[]]) {
  return createRoot((stop) => {
    dispose = stop;
    return createCycle(...items);
  });
}

describe("createCycle", () => {
  afterEach(() => dispose?.());

  it("starts on the first item and steps through the rest, wrapping round", () => {
    const [item, cycle] = setup("a", "b", "c");
    expect(item()).toBe("a");

    cycle();
    flush();
    expect(item()).toBe("b");

    cycle();
    cycle();
    flush();
    expect(item()).toBe("a");
  });

  it("jumps to an index", () => {
    const [item, cycle] = setup(0, 50, 100);

    cycle(2);
    flush();
    expect(item()).toBe(100);
  });

  it("wraps an index past the end", () => {
    const [item, cycle] = setup(0, 50, 100);

    cycle(4);
    flush();
    expect(item()).toBe(50);
  });
});
