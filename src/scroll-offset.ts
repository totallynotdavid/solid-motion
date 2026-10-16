/** A position along an element: a named edge, a fraction, or a length. */
export type ScrollEdge =
  | "start"
  | "center"
  | "end"
  | number
  | `${number}px`
  | `${number}%`
  | `${number}vw`
  | `${number}vh`
  | (string & {});

/**
 * One point of progress: where an edge of the target meets an edge of the
 * container. `"start end"` and `["start", "end"]` name both edges, `"end"` uses
 * the same edge of both, and `"100px"` is 100px past the target's start against
 * the container's start.
 */
export type ScrollOffsetPoint =
  | ScrollEdge
  | `${string} ${string}`
  | readonly [target: ScrollEdge, container: ScrollEdge];

/** Points progress passes through, evenly spaced from 0 to 1. */
export type ScrollOffset = readonly ScrollOffsetPoint[];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Where `value` sits between `from` and `to`; 1 when they coincide. */
const progress = (from: number, to: number, value: number) =>
  to === from ? 1 : (value - from) / (to - from);

const namedEdges = { start: 0, center: 0.5, end: 1 } as const;

function resolveEdge(edge: ScrollEdge, length: number, inset = 0): number {
  let fraction: number | undefined;
  let delta = 0;

  if (typeof edge === "number") {
    fraction = edge;
  } else if (edge in namedEdges) {
    fraction = namedEdges[edge as keyof typeof namedEdges];
  } else {
    const value = parseFloat(edge);
    if (edge.endsWith("px")) delta = value;
    else if (edge.endsWith("%")) fraction = value / 100;
    else if (edge.endsWith("vw"))
      delta = (value / 100) * document.documentElement.clientWidth;
    else if (edge.endsWith("vh"))
      delta = (value / 100) * document.documentElement.clientHeight;
    else fraction = value;
  }

  return inset + delta + (fraction === undefined ? 0 : length * fraction);
}

function resolvePoint(
  point: ScrollOffsetPoint,
  containerLength: number,
  targetLength: number,
  targetInset: number,
): number {
  let target: ScrollEdge;
  let container: ScrollEdge;

  if (Array.isArray(point)) {
    [target, container] = point as [ScrollEdge, ScrollEdge];
  } else if (typeof point === "number") {
    target = container = point;
  } else {
    const text = (point as string).trim();
    if (text.includes(" ")) {
      [target, container] = text.split(/\s+/) as [ScrollEdge, ScrollEdge];
    } else {
      // A named edge applies to both elements. A length applies to the
      // target's start only, measured against the container's start.
      target = text;
      container = text in namedEdges ? text : "0";
    }
  }

  return (
    resolveEdge(target, targetLength, targetInset) -
    resolveEdge(container, containerLength)
  );
}

/**
 * Maps a scroll position to 0..1 over the resolved points. The points are
 * evenly spaced in progress, so it walks to the segment holding the position
 * instead of building an interpolator on every scroll event.
 */
function progressThrough(points: readonly number[], position: number): number {
  const last = points.length - 1;
  if (last < 1) return 0;

  const reverse = points[0] > points[last];
  const at = (index: number) => points[reverse ? last - index : index];

  if (points[0] === points[1] && position < at(0)) return reverse ? 1 : 0;

  let segment = 0;
  while (segment < last - 1 && position >= at(segment + 1)) segment += 1;

  const through =
    (segment + progress(at(segment), at(segment + 1), position)) / last;
  return reverse ? 1 - through : through;
}

export interface AxisMeasure {
  position: number;
  containerLength: number;
  targetLength: number;
  /** Distance from the container's padding edge to the target's border edge. */
  targetInset: number;
}

export function resolveScrollProgress(
  offset: ScrollOffset,
  measure: AxisMeasure,
): number {
  const points = offset.map((point) =>
    resolvePoint(
      point,
      measure.containerLength,
      measure.targetLength,
      measure.targetInset,
    ),
  );
  return clamp(progressThrough(points, measure.position));
}

/**
 * The progress ranges the common cases ask for, as presets to pass as `offset`.
 */
export const scrollOffsets = {
  /** From the target's start entering the container until it is fully in. */
  enter: [
    [0, 1],
    [1, 1],
  ],
  /** From the target starting to leave until it has gone. */
  exit: [
    [0, 0],
    [1, 0],
  ],
  /** From the first pixel visible until the last one has gone. */
  any: [
    [0, 1],
    [1, 0],
  ],
  /** From both starts meeting until both ends meet. This is the default. */
  all: [
    [0, 0],
    [1, 1],
  ],
} as const satisfies Record<string, ScrollOffset>;
