import type { ComponentProps, JSX } from "@solidjs/web";
import type {
  MotionValue,
  TargetAndTransition,
  TransformTemplate,
  Transition,
} from "motion-dom";
import type { Element as SolidElement } from "solid-js";

import type { AnimationControls } from "./animation-controls";
import type { DragOptions } from "./drag";
import type { EventInfo, TapInfo, ViewportOptions } from "./gestures";
import type { PanOptions, Point } from "./pan";
import type { LayoutAnchor, LayoutBox, LayoutOption } from "./projection";

export type {
  MotionValue,
  TargetAndTransition,
  TransformTemplate,
  Transition,
  WillChange,
} from "motion-dom";

/**
 * A style entry motion writes itself on the animation frame instead of handing
 * to the DOM: a value the caller holds, or a Solid accessor to carry across.
 */
export type MotionStyleValue = MotionValue | (() => string | number);

/** Plain CSS, with any entry optionally replaced by a value motion drives. */
export type MotionStyle =
  | JSX.CSSProperties
  | Record<string, string | number | MotionStyleValue | undefined>;
export type { ViewportOptions } from "./gestures";

export type VariantDefinition<TCustom = unknown> =
  | TargetAndTransition
  | ((custom: TCustom) => TargetAndTransition);

export type VariantMap<TCustom = unknown> = Record<
  string,
  VariantDefinition<TCustom>
>;

export type AnimationDefinition =
  | false
  | string
  | string[]
  | TargetAndTransition
  | undefined;

export interface MotionConfigState {
  reducedMotion?: "always" | "never" | "user";
  transition?: Transition;
  skipAnimations?: boolean;
  /**
   * Maps pointer coordinates into the space an element is dragged or panned
   * in, for a page that scales or rotates a container the element lives in.
   */
  transformPagePoint?: (point: Point) => Point;
}

/**
 * What a presence boundary offers the elements inside it. `hold` is the whole
 * exit protocol: take one while animating out, call the returned release on
 * every terminal path, and the boundary unmounts the item when the count
 * reaches zero.
 */
export interface PresenceScope {
  isPresent: () => boolean;
  initial: () => boolean | undefined;
  custom: () => unknown;
  hold: () => () => void;
}

type MotionPropKeys = keyof MotionOptions | "ref";

/**
 * How an element animates, with nothing about how it is rendered. This is what
 * `createMotion` takes; `MotionProps` is this plus the element's own attributes.
 */
export interface MotionOptions<TCustom = unknown>
  extends DragOptions, PanOptions {
  /**
   * What the element animates to. Controls from `createAnimationControls` leave
   * it to `controls.start()`.
   */
  animate?: AnimationDefinition | AnimationControls;
  custom?: TCustom;
  exit?: AnimationDefinition;
  initial?: AnimationDefinition;
  /**
   * Animates layout changes. `true` covers position and size; string values
   * narrow it.
   */
  layout?: LayoutOption;
  /**
   * Shares and crossfades layout transitions with matching elements, including
   * across `AnimatePresence`.
   */
  layoutId?: string;
  /**
   * Re-measures the element when this value changes, for a layout change that
   * no DOM change announces. Once it is set, the element re-measures only then.
   */
  layoutDependency?: unknown;
  /** `false` stops a shared element fading, so it keeps its own opacity. */
  layoutCrossfade?: boolean;
  /**
   * `false` stops the element following the variant labels of the motion
   * element above it. Read once, when the element is created.
   */
  inherit?: boolean;
  /**
   * Marks the element as a scroll container. Children are measured inside its
   * scroll, so scrolling it does not animate them.
   */
  layoutScroll?: boolean;
  /** Marks a fixed-position element that stays put while ancestors animate. */
  layoutRoot?: boolean;
  /** Pins where a child sits while its parent's size animates. */
  layoutAnchor?: LayoutAnchor | false;
  /** Called before each layout measurement. */
  onBeforeLayoutMeasure?: () => void;
  /** Called with each new layout box and the one before it. */
  onLayoutMeasure?: (box: LayoutBox, previous: LayoutBox | undefined) => void;
  onLayoutAnimationStart?: () => void;
  onLayoutAnimationComplete?: () => void;
  /** Applied while the element has a visible focus ring. */
  whileFocus?: AnimationDefinition;
  /** Applied while the element is inside the viewport. */
  whileInView?: AnimationDefinition;
  /** Tunes what `whileInView` and the viewport callbacks count as visible. */
  viewport?: ViewportOptions;
  /** Called when the element enters the viewport. */
  onViewportEnter?: (entry: IntersectionObserverEntry) => void;
  /** Called when the element leaves the viewport. Not called under `once`. */
  onViewportLeave?: (entry: IntersectionObserverEntry) => void;
  /** Applied while a non-touch pointer is over the element. */
  whileHover?: AnimationDefinition;
  onHoverStart?: (event: PointerEvent, info: EventInfo) => void;
  onHoverEnd?: (event: PointerEvent, info: EventInfo) => void;
  /** Applied while the element is pressed, including by Enter on a keyboard. */
  whileTap?: AnimationDefinition;
  /** Called when a press that started on the element ends on it. */
  onTap?: (event: PointerEvent, info: TapInfo) => void;
  onTapStart?: (event: PointerEvent, info: TapInfo) => void;
  /** Called when a press that started on the element ends somewhere else. */
  onTapCancel?: (event: PointerEvent, info: TapInfo) => void;
  /** Applied while the element is being dragged. */
  whileDrag?: AnimationDefinition;
  /** Lets a tap that starts on the element end anywhere in the window. */
  globalTapTarget?: boolean;
  /** `{ tap: false }` stops a tap on this element from also tapping its ancestors. */
  propagate?: { tap?: boolean };
  onAnimationComplete?: (definition: AnimationDefinition) => void;
  onAnimationStart?: (definition: AnimationDefinition) => void;
  onUpdate?: (latest: Record<string, unknown>) => void;
  /**
   * Plain CSS, except that any entry may be a `MotionValue` or a Solid accessor.
   * Those are bound to the element and written on the frame loop, so they move
   * without re-rendering, and naming the same key in `animate` animates them.
   */
  style?: MotionStyle;
  transition?: Transition;
  /**
   * Builds the element's `transform` from the transform values motion holds and
   * the string it generated from them. Return the string to write.
   */
  transformTemplate?: TransformTemplate;
  variants?: VariantMap<TCustom>;
}

/** `MotionOptions` once any animation controls have been turned into a definition. */
export type ResolvedMotionOptions<TCustom = unknown> = Omit<
  MotionOptions<TCustom>,
  "animate"
> & { animate?: AnimationDefinition };

export interface MotionProps<TCustom = unknown>
  extends MotionOptions<TCustom>, Omit<ComponentProps<"div">, MotionPropKeys> {
  ref?: JSX.Ref<unknown>;
  children?: SolidElement;
}

export type MotionComponent<TProps extends object = Record<string, unknown>> = (
  props: TProps,
) => SolidElement;

export type MotionProxy = {
  [K in keyof JSX.IntrinsicElements]: MotionComponent<
    Omit<JSX.IntrinsicElements[K], MotionPropKeys> & MotionProps
  >;
} & {
  create: <TProps extends object>(
    component: MotionComponent<TProps>,
  ) => MotionComponent<TProps & MotionProps>;
};
