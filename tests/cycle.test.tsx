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

  it.each([
    { name: "jumps to an index", index: 2, expected: 100 },
    { name: "wraps an index past the end", index: 4, expected: 50 },
  ])("$name", ({ index, expected }) => {
    const [item, cycle] = setup(0, 50, 100);

    cycle(index);
    flush();
    expect(item()).toBe(expected);
  });
});
