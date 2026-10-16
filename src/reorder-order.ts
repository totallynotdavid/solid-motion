import type { LayoutBox } from "./projection";

export type ReorderAxis = "x" | "y" | "xy";

export interface ReorderItemLayout<T> {
  value: T;
  layout: LayoutBox;
}

export interface Offset {
  x: number;
  y: number;
}

type AxisSpan = LayoutBox["x"];

const centre = ({ min, max }: AxisSpan) => (min + max) / 2;

const isSeparated = (a: AxisSpan, b: AxisSpan) =>
  a.max <= b.min || b.max <= a.min;

/**
 * Which way a list runs, judged from where its items sit: `"x"` when they are
 * side by side, `"y"` when stacked, `"xy"` when they wrap into rows.
 */
export function detectAxis(layouts: readonly LayoutBox[]): ReorderAxis {
  let x = false;
  let y = false;

  for (let i = 0; i < layouts.length; i++) {
    for (let j = i + 1; j < layouts.length; j++) {
      x ||= isSeparated(layouts[i].x, layouts[j].x);
      y ||= isSeparated(layouts[i].y, layouts[j].y);
      if (x && y) return "xy";
    }
  }

  return x ? "x" : "y";
}

function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * The order after dragging `value` by `offset` from where it was measured, or
 * `order` itself when the drag has not crossed into a neighbour. `velocity`
 * gives the direction of travel on a single axis, so an item that has been held
 * still over a neighbour does not swap back.
 */
export function checkReorder<T>(
  order: ReorderItemLayout<T>[],
  value: T,
  offset: Offset,
  velocity: Offset,
  axis: ReorderAxis,
  direction: "ltr" | "rtl" = "ltr",
): ReorderItemLayout<T>[] {
  const index = order.findIndex((item) => item.value === value);
  if (index === -1) return order;

  if (axis === "xy") return checkGrid(order, index, offset, direction);

  if (!velocity[axis]) return order;

  const step = velocity[axis] > 0 ? 1 : -1;
  const next = order[index + step];
  if (!next) return order;

  const own = order[index].layout[axis];
  const nextCentre = centre(next.layout[axis]);

  const crossed =
    step === 1
      ? own.max + offset[axis] > nextCentre
      : own.min + offset[axis] < nextCentre;
  return crossed ? moveItem(order, index, index + step) : order;
}

interface Line<T> {
  items: ReorderItemLayout<T>[];
  min: number;
  max: number;
}

/** Groups consecutive items that overlap vertically into rows. */
function getLines<T>(order: ReorderItemLayout<T>[]): Line<T>[] {
  const lines: Line<T>[] = [];

  for (const item of order) {
    const { min, max } = item.layout.y;
    const line = lines[lines.length - 1];

    if (!line || min >= line.max || max <= line.min) {
      lines.push({ items: [item], min, max });
    } else {
      line.items.push(item);
      line.min = Math.min(line.min, min);
      line.max = Math.max(line.max, max);
    }
  }

  return lines;
}

function distanceToLine(y: number, line: Line<unknown>): number {
  if (y < line.min) return line.min - y;
  return y > line.max ? y - line.max : 0;
}

/** Squared, because only the ordering of distances matters. */
function distanceToBox(point: Offset, box: LayoutBox): number {
  const x = Math.max(box.x.min - point.x, 0, point.x - box.x.max);
  const y = Math.max(box.y.min - point.y, 0, point.y - box.y.max);
  return x * x + y * y;
}

function checkGrid<T>(
  order: ReorderItemLayout<T>[],
  index: number,
  offset: Offset,
  direction: "ltr" | "rtl",
): ReorderItemLayout<T>[] {
  const { layout } = order[index];
  const point = {
    x: centre(layout.x) + offset.x,
    y: centre(layout.y) + offset.y,
  };

  const lines = getLines(order);
  const source = lines.find((line) => line.items.includes(order[index]))!;
  const target = lines.reduce((closest, line) =>
    distanceToLine(point.y, line) < distanceToLine(point.y, closest)
      ? line
      : closest,
  );

  if (target !== source) {
    return moveToLine(order, index, point.x, target, direction);
  }

  // Within a row the item steps towards whichever neighbour it now overlaps
  // more than its own slot.
  let nearest = -1;
  let nearestDistance = distanceToBox(point, layout);
  order.forEach((item, itemIndex) => {
    if (itemIndex === index) return;
    const distance = distanceToBox(point, item.layout);
    if (distance < nearestDistance) {
      nearest = itemIndex;
      nearestDistance = distance;
    }
  });

  return nearest === -1
    ? order
    : moveItem(order, index, index + Math.sign(nearest - index));
}

function moveToLine<T>(
  order: ReorderItemLayout<T>[],
  index: number,
  x: number,
  line: Line<T>,
  direction: "ltr" | "rtl",
): ReorderItemLayout<T>[] {
  const remaining = order.filter((_, itemIndex) => itemIndex !== index);
  const before = line.items.find((item) => {
    const middle = centre(item.layout.x);
    return direction === "ltr" ? x < middle : x > middle;
  });
  const at = before
    ? remaining.indexOf(before)
    : remaining.indexOf(line.items[line.items.length - 1]) + 1;

  const next = [...remaining];
  next.splice(at, 0, order[index]);

  return next.every((item, itemIndex) => item === order[itemIndex])
    ? order
    : next;
}
