import {
  addDomEvent,
  cancelFrame,
  frame,
  isPrimaryPointer,
  time,
  type EventInfo,
  type PanInfo,
} from "motion-dom";
import { createEffect, createMemo, untrack, type Accessor } from "solid-js";

export type { PanInfo };

export type PanHandler = (event: PointerEvent, info: PanInfo) => void;

export interface PanOptions {
  onPanSessionStart?: PanHandler;
  onPanStart?: PanHandler;
  onPan?: PanHandler;
  onPanEnd?: PanHandler;
}

export interface Point {
  x: number;
  y: number;
}

interface TimestampedPoint extends Point {
  timestamp: number;
}

/** How far the pointer must travel, in px, before a press becomes a pan. */
const panThreshold = 3;

/** The span of recent movement a release velocity is measured over. */
const velocityWindow = 100;

const scrollableOverflow = new Set(["auto", "scroll"]);

export interface PanSessionHandlers {
  /** The pointer went down. Runs synchronously, before any movement. */
  onSessionStart?: PanHandler;
  /** The pointer moved past the threshold, once per session. */
  onStart?: PanHandler;
  onMove?: PanHandler;
  /** The pointer was released after a pan started. */
  onEnd?: PanHandler;
  /** The pointer was released, whether or not a pan started. */
  onSessionEnd?: PanHandler;
  /** The pointer was released without a pan ever starting. */
  onTapRelease?: VoidFunction;
}

export interface PanSessionOptions {
  /** Maps page coordinates into the caller's coordinate space. */
  transformPagePoint?: (point: Point) => Point;
  /** Pixels of travel before the pan starts. */
  distanceThreshold?: number;
  /** The element being panned, whose scrolling ancestors are compensated for. */
  element?: Element;
}

export interface PanSession {
  end: VoidFunction;
}

function pointOf(event: PointerEvent): Point {
  return { x: event.pageX, y: event.pageY };
}

const subtract = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

/**
 * Velocity over the last `velocityWindow` ms of movement, in px per second.
 *
 * Measured against the oldest sample still inside the window rather than the
 * previous move: pointer events arrive unevenly, and a release after a pause
 * must read as zero instead of the speed of the last jitter.
 */
function velocityOf(history: TimestampedPoint[]): Point {
  if (history.length < 2) return { x: 0, y: 0 };

  const last = history[history.length - 1];
  let from = last;
  for (let i = history.length - 1; i >= 0; i--) {
    from = history[i];
    if (last.timestamp - from.timestamp > velocityWindow) break;
  }

  // Reaching the first sample means the whole history is the window, unless
  // that sample is stale, in which case the next one is the better anchor.
  if (
    from === history[0] &&
    history.length > 2 &&
    last.timestamp - from.timestamp > velocityWindow * 2
  ) {
    from = history[1];
  }

  const seconds = (last.timestamp - from.timestamp) / 1000;
  if (seconds === 0) return { x: 0, y: 0 };

  const finite = (value: number) => (Number.isFinite(value) ? value : 0);
  return {
    x: finite((last.x - from.x) / seconds),
    y: finite((last.y - from.y) / seconds),
  };
}

/**
 * Tracks one pointer from press to release, reporting movement past a distance
 * threshold as a pan. It listens on the window in the capture phase, so a child
 * that stops propagation cannot strand the session, and handles movement on the
 * frame loop. Scroll deltas are folded into the tracked positions, so a page
 * that scrolls mid-drag does not leave the element behind the cursor.
 */
export function startPanSession(
  event: PointerEvent,
  handlers: PanSessionHandlers,
  {
    transformPagePoint = (point) => point,
    distanceThreshold = panThreshold,
    element,
  }: PanSessionOptions = {},
): PanSession | undefined {
  if (!isPrimaryPointer(event)) return undefined;

  // The press is stamped with the clock, not the last frame's time: after an
  // idle spell that is stale, and a stale start reads as a slow first segment.
  const history: TimestampedPoint[] = [
    { ...transformPagePoint(pointOf(event)), timestamp: time.now() },
  ];
  let started = false;
  let pending = false;
  let lastEvent: PointerEvent | undefined;
  let rawPoint: Point | undefined;
  let point: Point | undefined;

  const infoFor = (current: Point): PanInfo => ({
    point: current,
    delta: subtract(current, history[history.length - 1]),
    offset: subtract(current, history[0]),
    velocity: velocityOf(history),
  });

  handlers.onSessionStart?.(event, infoFor(history[0]));

  const update = () => {
    if (!lastEvent || !point) return;
    pending = false;
    if (rawPoint) point = transformPagePoint(rawPoint);

    const info = infoFor(point);
    const travelled = Math.hypot(info.offset.x, info.offset.y);
    if (!started && travelled < distanceThreshold) return;

    history.push({ ...point, timestamp: time.now() });

    if (!started) {
      started = true;
      handlers.onStart?.(lastEvent, info);
    }
    handlers.onMove?.(lastEvent, info);
  };

  const onMove = (moveEvent: PointerEvent) => {
    lastEvent = moveEvent;
    rawPoint = pointOf(moveEvent);
    point = transformPagePoint(rawPoint);
    pending = true;
    frame.update(update, true);
  };

  const scrollOrigins = new Map<Element | Window, Point>();
  const stopListening: VoidFunction[] = [];

  const onScroll = (target: Element | Window) => {
    const origin = scrollOrigins.get(target);
    if (!origin) return;

    const now =
      target instanceof Window
        ? { x: target.scrollX, y: target.scrollY }
        : { x: target.scrollLeft, y: target.scrollTop };
    const delta = subtract(now, origin);
    if (delta.x === 0 && delta.y === 0) return;

    // Window scroll moves the pointer's page position; an inner scroller moves
    // the element under a pointer that did not move, so the start shifts.
    if (target instanceof Window) {
      if (point) {
        point.x += delta.x;
        point.y += delta.y;
      }
    } else {
      history[0].x -= delta.x;
      history[0].y -= delta.y;
    }

    scrollOrigins.set(target, now);
    frame.update(update, true);
  };

  const end = () => {
    for (const stop of stopListening) stop();
    stopListening.length = 0;
    scrollOrigins.clear();
    cancelFrame(update);
  };

  const onUp = (upEvent: PointerEvent) => {
    if (pending) update();
    end();

    if (!started) handlers.onTapRelease?.();
    if (!lastEvent || !point) return;

    // A cancel carries no usable position, so the last move stands in for it.
    const final = upEvent.type === "pointercancel" ? point : pointOf(upEvent);
    const info = infoFor(transformPagePoint(final));

    if (started) handlers.onEnd?.(upEvent, info);
    handlers.onSessionEnd?.(upEvent, info);
  };

  const listen = (
    type: "pointermove" | "pointerup" | "pointercancel",
    handler: (event: PointerEvent) => void,
  ) =>
    stopListening.push(
      addDomEvent(window, type, handler as (event: Event) => void, {
        passive: true,
        capture: true,
      }),
    );
  listen("pointermove", onMove);
  listen("pointerup", onUp);
  listen("pointercancel", onUp);

  if (element) {
    for (
      let current = element.parentElement;
      current;
      current = current.parentElement
    ) {
      const style = getComputedStyle(current);
      if (
        scrollableOverflow.has(style.overflowX) ||
        scrollableOverflow.has(style.overflowY)
      ) {
        scrollOrigins.set(current, {
          x: current.scrollLeft,
          y: current.scrollTop,
        });
      }
    }
    scrollOrigins.set(window, { x: window.scrollX, y: window.scrollY });

    const onElementScroll = (scrollEvent: Event) =>
      onScroll(scrollEvent.target as Element);
    const onWindowScroll = () => onScroll(window);
    window.addEventListener("scroll", onElementScroll, { capture: true });
    window.addEventListener("scroll", onWindowScroll);
    stopListening.push(
      () => window.removeEventListener("scroll", onElementScroll, true),
      () => window.removeEventListener("scroll", onWindowScroll),
    );
  }

  return { end };
}

export type { EventInfo };

/**
 * Wires the `onPan*` callbacks to an element. A session starts on every primary
 * pointer press and only reports once the pointer has travelled far enough, so
 * a plain click is never a pan. Callbacks run on the frame loop, like motion's.
 */
export function watchPan(
  options: () => PanOptions,
  element: Accessor<HTMLElement | SVGElement | undefined>,
  transformPagePoint?: (point: Point) => Point,
): void {
  const enabled = createMemo(() => {
    const current = options();
    return Boolean(
      current.onPanSessionStart ||
      current.onPanStart ||
      current.onPan ||
      current.onPanEnd,
    );
  });

  createEffect(
    () => (enabled() ? element() : undefined),
    (node) => {
      if (!node) return undefined;

      // The session captures nothing but ids and callbacks, and reads the
      // latest handlers when an event fires.
      const call =
        (name: keyof PanOptions) => (event: PointerEvent, info: PanInfo) =>
          frame.postRender(() => untrack(options)[name]?.(event, info));

      let session: PanSession | undefined;
      const stopPress = addDomEvent(node, "pointerdown", (pressEvent) => {
        session?.end();
        session = startPanSession(
          pressEvent as PointerEvent,
          {
            onSessionStart: call("onPanSessionStart"),
            onStart: call("onPanStart"),
            onMove: call("onPan"),
            onEnd: call("onPanEnd"),
          },
          { element: node, transformPagePoint },
        );
      });

      return () => {
        stopPress();
        session?.end();
      };
    },
  );
}
