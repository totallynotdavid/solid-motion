import {
  HTMLProjectionNode,
  buildHTMLStyles,
  frame,
  measureViewportBox,
  renderHTML,
  type HTMLRenderState,
  type IProjectionNode,
  type LayoutUpdateData,
  type MotionStyle,
  type ResolvedValues,
  type Transition,
  type VisualElement,
} from "motion-dom";

import {
  adoptLayoutNode,
  dropLayoutNode,
  invalidateLayout,
} from "./layout-updates";
import type { TransformTemplate } from "./types";
import type { TemplateSource } from "./values";

/** Which parts of a layout change are animated. */
export type LayoutOption =
  | boolean
  | "position"
  | "size"
  | "x"
  | "y"
  | "preserve-aspect";

/** An element's box in page pixels, before any transform. */
export interface LayoutBox {
  x: { min: number; max: number };
  y: { min: number; max: number };
}

/** Where a child anchors when its parent's size animates. */
export interface LayoutAnchor {
  x: number;
  y: number;
}

/** Layout events the element may listen to, read when each one fires. */
interface LayoutCallbacks {
  onBeforeLayoutMeasure?: () => void;
  onLayoutMeasure?: (box: LayoutBox, previous: LayoutBox | undefined) => void;
  onLayoutAnimationStart?: () => void;
  onLayoutAnimationComplete?: () => void;
}

export interface LayoutOptions {
  layout: LayoutOption | undefined;
  layoutId: string | undefined;
  /** Whether the element is a scroll container its children are measured in. */
  scroll: boolean | undefined;
  /** Whether the element is a root: fixed in place, whatever animates above it. */
  root: boolean | undefined;
  anchor: LayoutAnchor | false | undefined;
  /** `false` keeps a shared element at its own opacity instead of fading it. */
  crossfade: boolean | undefined;
  /**
   * Read on every commit. A defined value restricts re-measuring to the commits
   * `invalidateLayout` is called for.
   */
  dependency: () => unknown;
  callbacks: () => LayoutCallbacks;
  /** The element's `transformTemplate`, applied before its own `style` transform. */
  template: TemplateSource | undefined;
  /**
   * Reads the caller's current style, resolving an accessor or `MotionValue`
   * entry to its live value. Called on every paint rather than read once:
   * motion-dom takes over `pointerEvents` on a projecting element and reads
   * this as the only record of what to restore it to, so a stale snapshot
   * would win back over whatever the caller's value has since become,
   * including a value motion itself drives (which never lands here otherwise,
   * since projection never touches `latestValues` for this).
   */
  style: () => Record<string, unknown> | undefined;
}

/** Timing refreshed by the controller for each pass. */
export interface LayoutTiming {
  transition: Transition | undefined;
  /** Whether the change should apply immediately. */
  instant: boolean;
}

/** What changed about an element's layout in one update. */
interface LayoutShift {
  /** How far the element's own box moved, per axis, in px. */
  delta: { x: number; y: number };
  changed: boolean;
}

export interface Projection {
  /** Paints the element with its projection transform. */
  render(): void;
  setTiming(timing: LayoutTiming): void;
  /**
   * Stops layout animations from moving the element. A drag holds this while
   * the pointer owns the element's position.
   */
  block(blocked: boolean): void;
  /** Re-measures at the next commit, for a change no DOM mutation announces. */
  invalidate(): void;
  /** Reports each layout update, whether or not it moved this element. */
  onUpdate(listener: (shift: LayoutShift) => void): VoidFunction;
  dispose(): void;
}

/** Adapts an HTML projection node to the small host surface Solid provides. */
export function createProjection(
  element: HTMLElement,
  /** The element's animated values, which the node projects on top of. */
  latestValues: ResolvedValues,
  /** Shared with the value store, so one paint writes both sets of styles. */
  renderState: HTMLRenderState,
  options: LayoutOptions,
): Projection {
  let node: IProjectionNode | undefined;
  let blocked = false;
  const listeners = new Set<(shift: LayoutShift) => void>();
  const timing: LayoutTiming = { transition: undefined, instant: false };

  // Motion's own generated transform composes position and scale off animated
  // axis values; a caller's static `transform` never animates and has no axis
  // to hook into, so projection would otherwise drop it the moment it starts
  // writing its own. Appending it here is the only way it survives.
  const transformTemplate = (
    latest: ResolvedValues,
    motionGenerated: string,
  ): string => {
    const generated =
      options.template?.()?.(
        latest as Parameters<TransformTemplate>[0],
        motionGenerated,
      ) ?? motionGenerated;
    const custom = options.style()?.transform;
    if (typeof custom !== "string") {
      return generated;
    }
    const normalizedCustom = custom.trim().toLowerCase();
    if (normalizedCustom === "" || normalizedCustom === "none") {
      return generated;
    }
    return generated ? `${generated} ${custom}` : custom;
  };

  const render = () => {
    buildHTMLStyles(renderState, latestValues);
    // Passing the node lets projection compose its transform over the base style.
    renderHTML(element, renderState, toMotionStyle(options.style()), node);
  };

  const host = {
    current: element,
    latestValues,
    props: {},
    renderState,
    getProps: () => {
      // The engine only notifies an event whose callback is present here.
      const {
        onBeforeLayoutMeasure,
        onLayoutAnimationStart,
        onLayoutAnimationComplete,
      } = options.callbacks();
      return {
        transformTemplate,
        onBeforeLayoutMeasure,
        onLayoutAnimationStart,
        onLayoutAnimationComplete,
      };
    },
    getDefaultTransition: () => timing.transition,
    get shouldReduceMotion() {
      return timing.instant;
    },
    notify: (event: string, ...args: unknown[]) => {
      const { onBeforeLayoutMeasure, onLayoutMeasure } = options.callbacks();
      if (event === "BeforeLayoutMeasure") onBeforeLayoutMeasure?.();
      if (event === "LayoutMeasure") {
        onLayoutMeasure?.(
          args[0] as LayoutBox,
          args[1] as LayoutBox | undefined,
        );
      }
    },
    measureViewportBox: () => measureViewportBox(element),
    scheduleRender: () => {
      frame.render(render);
    },
    render,
    setStaticValue: (key: string, value: string | number) => {
      latestValues[key] = value;
    },
  };

  adoptLayoutNode(element, {
    instant: () => timing.instant,
    gated: () => options.dependency() !== undefined,
    create(parent) {
      // The projection node's host type is wider than the concrete HTML node's
      // type, so erase only that type parameter at this boundary.
      node = new HTMLProjectionNode(
        latestValues,
        parent,
      ) as unknown as IProjectionNode;

      node.setOptions({
        // `layoutId` alone also enables projection.
        layout: options.layout ? true : undefined,
        layoutId: options.layoutId,
        layoutScroll: options.scroll,
        layoutRoot: options.root,
        layoutAnchor: options.anchor,
        animationType:
          typeof options.layout === "string" ? options.layout : "both",
        // Match Motion's shared-element default.
        crossfade: options.crossfade ?? true,
        visualElement: host as unknown as VisualElement,
      });
      node.isAnimationBlocked = blocked;
      node.addEventListener("didUpdate", (data: LayoutUpdateData) => {
        const shift: LayoutShift = {
          delta: {
            x: data.delta.x.translate,
            y: data.delta.y.translate,
          },
          changed: data.hasLayoutChanged,
        };
        for (const listener of listeners) listener(shift);
      });

      return node;
    },
  });

  return {
    render,
    block(next) {
      blocked = next;
      if (!node) return;
      node.isAnimationBlocked = next;
      if (next) node.target = undefined;
    },
    invalidate() {
      invalidateLayout(element);
    },
    onUpdate(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTiming(next) {
      timing.transition = next.transition;
      timing.instant = next.instant;
    },
    dispose() {
      dropLayoutNode(element);
      node = undefined;
    },
  };
}

/**
 * The caller's style as motion spells it. Motion looks its own entries up by
 * property name (`pointerEvents`), while a Solid style object is written the
 * way CSS spells them, because Solid sets an object entry with `setProperty`.
 * A `pointer-events: none` the caller set is only restored if it arrives under
 * the name motion looks for. Custom properties are left alone: they are CSS
 * names all the way down, and motion never reads one from here.
 */
function toMotionStyle(
  style: Record<string, unknown> | undefined,
): MotionStyle | undefined {
  if (!style) return undefined;

  const named: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) {
    named[key.startsWith("--") ? key : dashToCamel(key)] = value;
  }
  return named as MotionStyle;
}

function dashToCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
