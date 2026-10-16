import { MotionValue, cancelFrame, frame, resize } from "motion-dom";
import { createEffect, onCleanup, type Accessor } from "solid-js";

import {
  resolveScrollProgress,
  scrollOffsets,
  type ScrollOffset,
} from "./scroll-offset";

export {
  scrollOffsets,
  type ScrollEdge,
  type ScrollOffset,
  type ScrollOffsetPoint,
} from "./scroll-offset";

export interface ScrollOptions {
  /**
   * The element that scrolls. Defaults to the document's scrolling element.
   * Use an accessor so a ref callback can provide the element after mount.
   */
  container?: Accessor<HTMLElement | undefined>;
  /** The element to track. Defaults to the container. */
  target?: Accessor<HTMLElement | undefined>;
  /**
   * The points progress passes through. Defaults to `scrollOffsets.all`: 0
   * when the target's start meets the container's start, 1 when the ends meet.
   */
  offset?: ScrollOffset;
  /**
   * Frame-polls the container's scrollWidth/scrollHeight to catch content
   * growing the scrollable range without the container's own box resizing
   * (rows appending, images finishing load). ResizeObserver only fires on
   * the container's border box, so it misses this. Off by default: a
   * per-frame read is not free while tracking is active.
   */
  trackContentSize?: boolean;
}

export interface ScrollValues {
  scrollX: MotionValue<number>;
  scrollY: MotionValue<number>;
  scrollXProgress: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
}

/**
 * Creates MotionValues for scroll position and normalized progress.
 * Measurements update on scroll, resize, and target or container changes.
 * The returned values are destroyed with their owning scope.
 */
export function createScroll(options: ScrollOptions = {}): ScrollValues {
  const scrollX = new MotionValue(0);
  const scrollY = new MotionValue(0);
  const scrollXProgress = new MotionValue(0);
  const scrollYProgress = new MotionValue(0);
  onCleanup(() => {
    scrollX.destroy();
    scrollY.destroy();
    scrollXProgress.destroy();
    scrollYProgress.destroy();
  });

  const offset = options.offset ?? scrollOffsets.all;
  const trackContentSize = options.trackContentSize ?? false;

  createEffect(
    () => {
      const container = options.container
        ? options.container()
        : defaultScrollContainer();
      if (!container) return undefined;

      const target = options.target ? options.target() : container;
      if (!target) return undefined;

      return { container, target };
    },
    (spec) =>
      spec &&
      trackScroll(
        spec.container,
        spec.target,
        offset,
        trackContentSize,
        (x, y) => {
          scrollX.set(x.current);
          scrollXProgress.set(x.progress);
          scrollY.set(y.current);
          scrollYProgress.set(y.progress);
        },
      ),
  );

  return { scrollX, scrollY, scrollXProgress, scrollYProgress };
}

/**
 * Use documentElement when jsdom does not expose document.scrollingElement.
 * Returns undefined outside a browser (SSR) instead of touching `document`.
 */
function defaultScrollContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined;
  return (document.scrollingElement ?? document.documentElement) as
    | HTMLElement
    | undefined;
}

interface AxisReading {
  current: number;
  progress: number;
}

function trackScroll(
  container: HTMLElement,
  target: HTMLElement,
  offset: ScrollOffset,
  trackContentSize: boolean,
  onMeasure: (x: AxisReading, y: AxisReading) => void,
): VoidFunction {
  const measure = () =>
    onMeasure(
      measureAxis(container, target, "x", offset),
      measureAxis(container, target, "y", offset),
    );
  const scheduleMeasure = () => frame.read(measure);

  // Page scroll events go to window; element scroll events go to the container.
  const isRootContainer = container === defaultScrollContainer();
  const scrollTarget: EventTarget = isRootContainer ? window : container;
  scrollTarget.addEventListener("scroll", scheduleMeasure, {
    passive: true,
  });

  window.addEventListener("resize", scheduleMeasure);
  // Window resize covers the root; other containers can resize during reflow.
  const stopContainerResize = isRootContainer
    ? undefined
    : resize(container, scheduleMeasure);
  // The target's own box can change independently of the container's (an
  // accordion expanding, an image finishing load), so it needs its own
  // observer whenever it isn't the container itself.
  const stopTargetResize =
    target === container ? undefined : resize(target, scheduleMeasure);
  const stopContentSizePoll = trackContentSize
    ? pollContentSize(container, scheduleMeasure)
    : undefined;

  measure();

  return () => {
    scrollTarget.removeEventListener("scroll", scheduleMeasure);
    window.removeEventListener("resize", scheduleMeasure);
    stopContainerResize?.();
    stopTargetResize?.();
    stopContentSizePoll?.();
    // A queued measurement must not update the destroyed values.
    cancelFrame(measure);
  };
}

/**
 * ResizeObserver reports the container's border box, not its scrollable content
 * size, so content that grows a fixed-height container's scrollHeight or
 * scrollWidth triggers no remeasure. Comparing every frame catches it, which is
 * why `trackContentSize` is opt-in.
 */
function pollContentSize(
  container: HTMLElement,
  onContentResize: VoidFunction,
): VoidFunction {
  let width = container.scrollWidth;
  let height = container.scrollHeight;

  const checkContentSize = () => {
    const nextWidth = container.scrollWidth;
    const nextHeight = container.scrollHeight;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    onContentResize();
  };

  frame.read(checkContentSize, true);
  return () => cancelFrame(checkContentSize);
}

function measureAxis(
  container: HTMLElement,
  target: HTMLElement,
  axis: "x" | "y",
  offset: ScrollOffset,
): AxisReading {
  const isY = axis === "y";

  // Normalize negative scrollLeft values reported by some RTL browsers.
  const current = Math.abs(isY ? container.scrollTop : container.scrollLeft);
  const containerLength = isY ? container.clientHeight : container.clientWidth;

  const isSelf = target === container;
  const targetLength = isSelf
    ? isY
      ? container.scrollHeight
      : container.scrollWidth
    : isY
      ? target.clientHeight
      : target.clientWidth;
  const inset = isSelf ? 0 : axisInset(target, container, axis);

  const progress = resolveScrollProgress(offset, {
    position: current,
    containerLength,
    targetLength,
    targetInset: inset,
  });
  return { current, progress };
}

/**
 * Returns target's border-box offset from container's padding-box origin
 * along one axis, the origin that scrollTop/scrollLeft and
 * clientHeight/clientWidth measure from.
 *
 * Each element is measured from the document on its own and the two are
 * subtracted. A single offsetParent walk from target that stops at container
 * would skip past a `position: static` container, because a static element is
 * never anyone's offsetParent.
 *
 * Transforms are invisible to offsets. getBoundingClientRect() would see them,
 * but a scrolled target's rect moves with scrollTop, which breaks the fixed
 * reference `measureAxis` needs.
 *
 * A target inside a `position: fixed` ancestor that does not contain container
 * is unsupported: a fixed element's offsetParent is null, so the two walks end
 * at different origins.
 */
function axisInset(
  target: HTMLElement,
  container: HTMLElement,
  axis: "x" | "y",
): number {
  const containerBorder =
    axis === "y" ? container.clientTop : container.clientLeft;
  return (
    offsetFromDocument(target, axis) -
    offsetFromDocument(container, axis) -
    containerBorder
  );
}

function offsetFromDocument(element: HTMLElement, axis: "x" | "y"): number {
  let offset = 0;
  let node: HTMLElement | null = element;
  while (node) {
    offset += axis === "y" ? node.offsetTop : node.offsetLeft;
    // offsetTop and offsetLeft measure from the offsetParent's padding edge, so
    // every hop after the first adds that ancestor's own border back.
    if (node !== element) {
      offset += axis === "y" ? node.clientTop : node.clientLeft;
    }
    node = node.offsetParent as HTMLElement | null;
  }
  return offset;
}
