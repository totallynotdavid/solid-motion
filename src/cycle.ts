import { createSignal, type Accessor } from "solid-js";

/**
 * Steps through a fixed list. Called bare it steps to the next item and wraps
 * after the last; given an index it jumps there, wrapping an index that is out
 * of range.
 */
export type Cycle = (index?: number) => void;

export function createCycle<T>(...items: [T, ...T[]]): [Accessor<T>, Cycle] {
  const [index, setIndex] = createSignal(0);
  const wrap = (value: number) =>
    ((value % items.length) + items.length) % items.length;

  return [
    () => items[index()]!,
    (next) =>
      setIndex((current) =>
        wrap(typeof next === "number" ? next : current + 1),
      ),
  ];
}
