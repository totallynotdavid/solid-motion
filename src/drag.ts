import {
  addDomEvent,
  frame,
  isElementTextInput,
  setDragLock,
  type DragElastic,
  type InertiaOptions,
  type MotionValue,
  type PanInfo,
  type Transition,
} from "motion-dom";
import { createEffect, createMemo, untrack, type Accessor } from "solid-js";

import { startPanSession, type PanSession, type Point } from "./pan";
import type { ValueStore } from "./values";

export type DragAxis = boolean | "x" | "y";

/** Limits on how far the element may travel from where it rests, in px. */
export interface DragBounds {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

/**
 * Where a drag may go: fixed limits on its translation, or an element it must
 * stay inside. An accessor is resolved at the start of each drag, so a ref
 * that is assigned after the draggable renders still works.
 */
export type DragConstraints =
  | DragBounds
  | Element
  | (() => Element | null | undefined);

export type DragHandler = (event: PointerEvent, info: PanInfo) => void;

export interface DragOptions {
  /** Enables dragging on both axes (`true`) or on one. */
  drag?: DragAxis;
  dragConstraints?: DragConstraints;
  /** How far past the constraints the element may be pulled. Default 0.35. */
  dragElastic?: DragElastic;
  /** Keeps moving after release, at the speed of the release. Default true. */
  dragMomentum?: boolean;
  /** Overrides the inertia animation that runs after release. */
  dragTransition?: InertiaOptions;
  /** Returns the element to where it started on release. */
  dragSnapToOrigin?: boolean;
  /** Locks a drag to whichever axis it first moves along. */
  dragDirectionLock?: boolean;
  /** Lets a drag also drag the draggable ancestors it sits inside. */
  dragPropagation?: boolean;
  /** `false` stops the element starting its own drag; use `dragControls`. */
  dragListener?: boolean;
  dragControls?: DragControls;
  onDragStart?: DragHandler;
  onDrag?: DragHandler;
  onDragEnd?: DragHandler;
  onDirectionLock?: (axis: "x" | "y") => void;
  onDragTransitionEnd?: VoidFunction;
  /**
   * Receives the constraints measured from an element, as limits on the
   * translation, and may return different ones.
   */
  onMeasureDragConstraints?: (constraints: DragBounds) => DragBounds | void;
}

export interface DragStartOptions {
  /** Centres the element on the pointer before the drag begins. */
  snapToCursor?: boolean;
  /** Pixels the pointer must travel before the drag begins. */
  distanceThreshold?: number;
}

/**
 * Starts a drag on elements that opted in with `dragControls`, from a pointer
 * event on any other element: a handle, a header, a custom hit area.
 */
export interface DragControls {
  start(event: PointerEvent, options?: DragStartOptions): void;
  /** Ends the drag now, letting the element settle as if it was released. */
  stop(): void;
  /** Ends the drag now and leaves the element where it is. */
  cancel(): void;
}

type Axis = "x" | "y";
type AxisSpan = { min?: number; max?: number };
type Constraints = { x: AxisSpan; y: AxisSpan };

const axes: Axis[] = ["x", "y"];
const defaultElastic = 0.35;
const directionLockThreshold = 10;

interface DragController {
  start(event: PointerEvent, options?: DragStartOptions): void;
  stop(): void;
  cancel(): void;
  dispose(): void;
}

const groups = new WeakMap<DragControls, Set<DragController>>();

export function createDragControls(): DragControls {
  const members = new Set<DragController>();
  const controls: DragControls = {
    start(event, options) {
      for (const member of members) member.start(event, options);
    },
    stop() {
      for (const member of members) member.stop();
    },
    cancel() {
      for (const member of members) member.cancel();
    },
  };
  groups.set(controls, members);
  return controls;
}

function shouldDrag(
  axis: Axis,
  drag: DragAxis | undefined,
  locked: Axis | null,
): boolean {
  return (
    (drag === true || drag === axis) && (locked === null || locked === axis)
  );
}

/** Pulls a point that is past a limit back towards it by the elastic factor. */
function applyConstraints(
  point: number,
  { min, max }: AxisSpan,
  elastic: { min: number; max: number },
): number {
  if (min !== undefined && point < min)
    return min + (point - min) * elastic.min;
  if (max !== undefined && point > max)
    return max + (point - max) * elastic.max;
  return point;
}

function resolveElastic(
  elastic: DragElastic = defaultElastic,
): Record<Axis, { min: number; max: number }> {
  const of = (side: keyof DragBounds) => {
    if (elastic === true) return defaultElastic;
    if (elastic === false) return 0;
    return typeof elastic === "number" ? elastic : (elastic[side] ?? 0);
  };
  return {
    x: { min: of("left"), max: of("right") },
    y: { min: of("top"), max: of("bottom") },
  };
}

/**
 * Limits on the translation that keep a box inside a container, given the box
 * as it sits now. A container smaller than the box swaps the limits, so the
 * box can still be moved to cover it.
 */
function containedSpan(box: AxisSpan, container: AxisSpan): AxisSpan {
  let min = container.min! - box.min!;
  let max = container.max! - box.max!;
  if (container.max! - container.min! < box.max! - box.min!) {
    [min, max] = [max, min];
  }
  return { min, max };
}

function asBounds({ x, y }: Constraints): DragBounds {
  return { left: x.min, right: x.max, top: y.min, bottom: y.max };
}

function fromBounds({ left, right, top, bottom }: DragBounds): Constraints {
  return { x: { min: left, max: right }, y: { min: top, max: bottom } };
}

export interface DragHost {
  store: Accessor<ValueStore | undefined>;
  isPresent: Accessor<boolean>;
  /** Reports whether a drag is in progress, for `whileDrag`. */
  setDragging: (dragging: boolean) => void;
  /** Maps page coordinates into the caller's coordinate space. */
  transformPagePoint?: (point: Point) => Point;
}

/**
 * Drag for one element. Its position lives in the `x` and `y` values, so it
 * composes with other transforms and can be bound to a caller's `MotionValue`.
 * Moves set the values directly, bypassing Solid. On release the values run
 * motion's inertia animation, springing at the constraints.
 */
function createDragController(
  node: HTMLElement,
  options: () => DragOptions,
  host: DragHost,
): DragController {
  let session: PanSession | undefined;
  let releaseLock: VoidFunction | null = null;
  let dragging = false;
  let locked: Axis | null = null;
  let constraints: Constraints | undefined;
  let elastic = resolveElastic();
  const origin = { x: 0, y: 0 };
  let latest: { event: PointerEvent; info: PanInfo } | undefined;

  const read = () => untrack(options);
  const value = (axis: Axis): MotionValue => host.store()!.value(axis);

  const translation = (axis: Axis): number => {
    const current = value(axis).get() as number | string | undefined;
    if (typeof current === "number") return current;
    if (typeof current !== "string") return 0;
    const amount = parseFloat(current);
    if (Number.isNaN(amount)) return 0;
    if (current.endsWith("%")) {
      const length = axis === "x" ? node.offsetWidth : node.offsetHeight;
      return (length * amount) / 100;
    }
    return amount;
  };

  /**
   * Measured on every drag rather than cached. Constraints given as an element
   * depend on both boxes, and a container that resized between drags would
   * otherwise leave the element held to its old size.
   */
  const measureConstraints = (): Constraints | undefined => {
    const { dragConstraints, onMeasureDragConstraints } = read();
    if (!dragConstraints) return undefined;

    if (
      typeof dragConstraints !== "function" &&
      !(dragConstraints instanceof Element)
    ) {
      return fromBounds(dragConstraints);
    }

    const container =
      typeof dragConstraints === "function"
        ? dragConstraints()
        : dragConstraints;
    if (!container) return undefined;

    // The box as it would sit with no drag applied: translation is what the
    // constraints are measured in.
    const box = node.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const dx = translation("x");
    const dy = translation("y");
    const measured: Constraints = {
      x: containedSpan(
        { min: box.left - dx, max: box.right - dx },
        { min: bounds.left, max: bounds.right },
      ),
      y: containedSpan(
        { min: box.top - dy, max: box.bottom - dy },
        { min: bounds.top, max: bounds.bottom },
      ),
    };
    const adjusted = onMeasureDragConstraints?.(asBounds(measured));
    return adjusted ? fromBounds(adjusted) : measured;
  };

  const stopAnimations = () => {
    for (const axis of axes) value(axis).stop();
  };

  const snapToCursor = (event: PointerEvent) => {
    const { drag } = read();
    const box = node.getBoundingClientRect();
    const cursor = { x: event.clientX, y: event.clientY };
    const centre = {
      x: (box.left + box.right) / 2,
      y: (box.top + box.bottom) / 2,
    };
    for (const axis of axes) {
      if (!shouldDrag(axis, drag, locked)) continue;
      value(axis).set(translation(axis) + cursor[axis] - centre[axis]);
    }
  };

  /**
   * Carries the element on from where it was released. With no momentum, no
   * constraints and no snap the animation has nothing to do and ends at once.
   */
  const settle = (velocity: { x: number; y: number }) => {
    const {
      drag,
      dragMomentum = true,
      dragElastic = defaultElastic,
      dragTransition,
      dragSnapToOrigin,
      onDragTransitionEnd,
    } = read();

    const finished: Promise<unknown>[] = [];
    for (const axis of axes) {
      if (!shouldDrag(axis, drag, locked)) continue;

      const limits = dragSnapToOrigin
        ? { min: 0, max: 0 }
        : (constraints?.[axis] ?? {});
      const transition: Transition = {
        type: "inertia",
        velocity: dragMomentum ? velocity[axis] : 0,
        // Without elastic the bounce is so stiff it reads as a hard stop.
        bounceStiffness: dragElastic ? 200 : 1_000_000,
        bounceDamping: dragElastic ? 40 : 10_000_000,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...dragTransition,
        ...limits,
      } as Transition;

      const animation = host.store()!.animate(axis, 0, transition);
      if (animation) finished.push(animation.finished.catch(() => undefined));
    }

    void Promise.all(finished).then(() => onDragTransitionEnd?.());
  };

  const cancel = () => {
    dragging = false;
    host.store()?.projection?.block(false);
    session?.end();
    session = undefined;

    if (releaseLock) {
      releaseLock();
      releaseLock = null;
    }
    host.setDragging(false);
  };

  const stop = (event?: PointerEvent, info?: PanInfo) => {
    const final = event && info ? { event, info } : latest;
    const wasDragging = dragging;
    cancel();
    if (!wasDragging || !final) return;

    settle(final.info.velocity);
    const { onDragEnd } = read();
    if (onDragEnd) {
      frame.postRender(() => onDragEnd(final.event, final.info));
    }
  };

  const begin = (event: PointerEvent, info: PanInfo) => {
    const { drag, dragPropagation, onDragStart } = read();

    // A drag takes a global lock so that nested draggables on the same axis
    // do not all move at once.
    if (drag && !dragPropagation) {
      releaseLock?.();
      releaseLock = setDragLock(drag);
      if (!releaseLock) return;
    }

    latest = { event, info };
    dragging = true;
    locked = null;

    for (const axis of axes) origin[axis] = translation(axis);
    constraints = measureConstraints();
    elastic = resolveElastic(read().dragElastic);

    host.store()?.projection?.block(true);
    if (onDragStart) frame.update(() => onDragStart(event, info), false, true);
    host.setDragging(true);
  };

  const move = (event: PointerEvent, info: PanInfo) => {
    latest = { event, info };
    const {
      dragPropagation,
      dragDirectionLock,
      onDirectionLock,
      onDrag,
      drag,
    } = read();
    if (!dragPropagation && !releaseLock) return;

    if (dragDirectionLock && locked === null) {
      const { x, y } = info.offset;
      locked =
        Math.abs(y) > directionLockThreshold
          ? "y"
          : Math.abs(x) > directionLockThreshold
            ? "x"
            : null;
      if (locked) onDirectionLock?.(locked);
      return;
    }

    for (const axis of axes) {
      if (!shouldDrag(axis, drag, locked)) continue;

      let next = origin[axis] + info.offset[axis];
      const limits = constraints?.[axis];
      if (limits) next = applyConstraints(next, limits, elastic[axis]);
      value(axis).set(next);
    }

    if (onDrag) frame.update(() => onDrag(event, info), false, true);
  };

  const start = (
    originEvent: PointerEvent,
    { snapToCursor: snap = false, distanceThreshold }: DragStartOptions = {},
  ) => {
    // An element on its way out cannot be picked up.
    if (!host.isPresent() || !host.store()) return;
    session?.end();

    session = startPanSession(
      originEvent,
      {
        onSessionStart: (event) => {
          if (snap) snapToCursor(event);
          stopAnimations();
        },
        onStart: begin,
        onMove: move,
        onSessionEnd: (event, info) => {
          latest = { event, info };
          stop(event, info);
          latest = undefined;
        },
        // A press that never became a drag still returns an element that was
        // resting outside its constraints.
        onTapRelease: () => {
          const { dragSnapToOrigin } = read();
          if (dragSnapToOrigin || constraints) settle({ x: 0, y: 0 });
        },
      },
      {
        distanceThreshold,
        element: node,
        transformPagePoint: host.transformPagePoint,
      },
    );
  };

  // Layout can move a dragged element out from under the pointer, as in a
  // reorderable list. Taking the shift into the translation keeps it held.
  const stopShifts = host
    .store()
    ?.projection?.onUpdate(({ delta, changed }) => {
      if (!dragging || !changed) return;
      for (const axis of axes) {
        origin[axis] += delta[axis];
        value(axis).set(translation(axis) + delta[axis]);
      }
    });

  const stopPress = addDomEvent(node, "pointerdown", (event) => {
    const { drag, dragListener = true } = read();
    const target = event.target as Element;
    const typing = target !== node && isElementTextInput(target);
    if (drag && dragListener && !typing) start(event as PointerEvent);
  });

  return {
    start,
    stop: () => stop(),
    cancel,
    dispose() {
      cancel();
      stopPress();
      stopShifts?.();
    },
  };
}

/**
 * Styles that make an element draggable by pointer: no browser gesture claims
 * the touch, no text selection or native image drag starts, and a one-axis drag
 * leaves the other axis to scroll.
 */
function prepareForDrag(node: HTMLElement, drag: DragAxis): VoidFunction {
  const { style } = node;
  const previous = {
    touchAction: style.touchAction,
    userSelect: style.userSelect,
    webkitUserSelect: style.webkitUserSelect,
    webkitTouchCallout: style.getPropertyValue("-webkit-touch-callout"),
    draggable: node.draggable,
  };

  style.touchAction =
    drag === true ? "none" : `pan-${drag === "x" ? "y" : "x"}`;
  style.userSelect = style.webkitUserSelect = "none";
  style.setProperty("-webkit-touch-callout", "none");
  node.draggable = false;

  return () => {
    style.touchAction = previous.touchAction;
    style.userSelect = previous.userSelect;
    style.webkitUserSelect = previous.webkitUserSelect;
    style.setProperty("-webkit-touch-callout", previous.webkitTouchCallout);
    node.draggable = previous.draggable;
  };
}

/**
 * Makes the element draggable while `drag` is set, and joins it to its
 * `dragControls`. The controller is rebuilt when the controls change, and torn
 * down with everything it holds when drag is switched off.
 */
export function watchDrag(
  options: () => DragOptions,
  element: Accessor<HTMLElement | SVGElement | undefined>,
  host: DragHost,
): void {
  const drag = createMemo(() => options().drag);
  const controls = createMemo(() => options().dragControls);

  createEffect(
    () => {
      const node = element();
      const axis = drag();
      if (!node || !axis || !(node instanceof HTMLElement)) return undefined;
      return { node, axis, controls: controls() };
    },
    (spec) => {
      if (!spec) return undefined;

      const controller = createDragController(spec.node, options, host);
      const restore = prepareForDrag(spec.node, spec.axis);
      const members = spec.controls && groups.get(spec.controls);
      members?.add(controller);

      return () => {
        members?.delete(controller);
        restore();
        controller.dispose();
      };
    },
  );
}
