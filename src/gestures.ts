import {
  addDomEvent,
  frame,
  hover,
  press,
  type EventInfo,
  type TapInfo,
} from "motion-dom";
import {
  createEffect,
  createMemo,
  createSignal,
  untrack,
  type Accessor,
} from "solid-js";

import type { AnimationDefinition } from "./types";

export type { EventInfo, TapInfo };

/** The pointer position of an event, in page coordinates. */
function eventInfo(event: PointerEvent): EventInfo {
  return { point: { x: event.pageX, y: event.pageY } };
}

export type TapHandler = (event: PointerEvent, info: TapInfo) => void;
export type HoverHandler = (event: PointerEvent, info: EventInfo) => void;
export type ViewportHandler = (entry: IntersectionObserverEntry) => void;

/**
 * The slice of the motion options this module reads. Narrower than the whole
 * options object on purpose: nothing here depends on the variant map, so
 * nothing here has to be generic over its custom data.
 */
export type GestureOptions = Partial<
  Record<GestureName, AnimationDefinition>
> & {
  viewport?: ViewportOptions;
  onHoverStart?: HoverHandler;
  onHoverEnd?: HoverHandler;
  onTapStart?: TapHandler;
  onTap?: TapHandler;
  onTapCancel?: TapHandler;
  /** Ends a tap that starts on this element wherever the pointer is released. */
  globalTapTarget?: boolean;
  propagate?: { tap?: boolean };
  onViewportEnter?: ViewportHandler;
  onViewportLeave?: ViewportHandler;
};

/**
 * The gesture states an element can be in, lowest priority first. `animate`
 * sits below all of them and `exit` above, matching Motion's own order.
 */
export const gestureNames = [
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
] as const;

export type GestureName = (typeof gestureNames)[number];

export interface ViewportOptions {
  /** Stay in the in-view state once entered, and stop observing. */
  once?: boolean;
  root?: Element | Document;
  /** Grows or shrinks the detection box, in CSS margin syntax. */
  margin?: string;
  /** How much of the element must be visible to count. */
  amount?: "some" | "all" | number;
}

type GestureTarget = HTMLElement | SVGElement;

/**
 * Hover and press come from motion-dom rather than from `pointerenter` and
 * `pointerdown` listeners written here. They are not thin wrappers: hover
 * filters polyfilled touch events, defers its end while a press is in flight so
 * a button does not flicker when the pointer slips off mid-click, and backs off
 * while a drag is active. Press filters secondary and multi-touch pointers,
 * ends on the capture phase so a child calling `stopPropagation` cannot strand
 * it, and drives the same gesture from Enter keydown/keyup for keyboards.
 *
 * Callbacks run on `postRender`, after the frame that applied the state, so a
 * handler that reads the element sees the gesture's animation already started.
 * They are read from `options` at the moment of the event, not captured, so a
 * handler that changes between renders is the one that runs.
 */
function observeHover(
  element: GestureTarget,
  setActive: (active: boolean) => void,
  options: () => GestureOptions,
): VoidFunction {
  return hover(element, (_element, startEvent) => {
    setActive(true);
    notify(() => options().onHoverStart, startEvent);

    return (endEvent) => {
      setActive(false);
      notify(() => options().onHoverEnd, endEvent);
    };
  });
}

interface TapSettings {
  globalTapTarget: boolean | undefined;
  stopPropagation: boolean;
}

function observeTap(
  element: GestureTarget,
  setActive: (active: boolean) => void,
  options: () => GestureOptions,
  { globalTapTarget, stopPropagation }: TapSettings,
): VoidFunction {
  // A disabled button gets no pointer events from the browser, but a press
  // that began elsewhere and a keyboard Enter can still reach it.
  const isDisabled = () =>
    element instanceof HTMLButtonElement && element.disabled;

  return press(
    element,
    (_element, startEvent) => {
      if (isDisabled()) return undefined;

      setActive(true);
      notify(() => options().onTapStart, startEvent);

      return (endEvent, { success }) => {
        setActive(false);
        notify(
          () => (success ? options().onTap : options().onTapCancel),
          endEvent,
        );
      };
    },
    {
      useGlobalTarget: globalTapTarget,
      stopPropagation,
    },
  );
}

function notify(
  handler: () => HoverHandler | TapHandler | undefined,
  event: PointerEvent,
): void {
  frame.postRender(() => untrack(handler)?.(event, eventInfo(event)));
}

const visibilityThresholds = { some: 0, all: 1 } as const;

/**
 * Viewport visibility, the one gesture motion-dom does not offer: `inView`
 * lives in framer-motion, and depending on that package to reach it would drag
 * back the animation engine wrapper we deliberately left behind.
 *
 * `onChange` only hears about changes: the observer's first report for an
 * element that starts out of view is not a "leave". `once` unobserves on entry
 * rather than checking a flag on every callback, so a list that has finished
 * revealing stops costing anything.
 */
function observeInView(
  element: GestureTarget,
  onChange: (inView: boolean, entry: IntersectionObserverEntry) => void,
  { once = false, root, margin, amount = "some" }: ViewportOptions = {},
): VoidFunction {
  if (typeof IntersectionObserver === "undefined") return () => undefined;

  let inView = false;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting === inView) continue;
        inView = entry.isIntersecting;

        if (inView) {
          onChange(true, entry);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          onChange(false, entry);
        }
      }
    },
    {
      root,
      rootMargin: margin,
      threshold:
        typeof amount === "number" ? amount : visibilityThresholds[amount],
    },
  );

  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Whether an element is in the viewport, as a plain accessor.
 *
 * The same observer `whileInView` runs on, without an animation attached. It is
 * exposed because the package already computes this, and the alternative is an
 * app reaching for a second IntersectionObserver library to answer a question
 * this one is already asking: a fetch-more sentinel, a lazily mounted chart, an
 * analytics impression.
 *
 * The node arrives through an accessor because a ref callback fires after the
 * effect would first run, and a plain variable is invisible to it.
 */
export function createInView(
  element: Accessor<HTMLElement | SVGElement | undefined>,
  viewport?: ViewportOptions,
): Accessor<boolean> {
  const [inView, setInView] = createSignal(false);

  createEffect(
    () => element(),
    (node) => (node ? observeInView(node, setInView, viewport) : undefined),
  );

  return inView;
}

/**
 * Focus only counts when the browser would have drawn a focus ring. Activating
 * on every `focus` would light the element up on a plain mouse click, which is
 * not what a focus style means.
 *
 * A browser without `:focus-visible` throws on the selector and draws its
 * default outline for all focus, so treating the throw as visible keeps the
 * animation consistent with what that browser paints.
 */
function observeFocus(
  element: GestureTarget,
  setActive: (active: boolean) => void,
): VoidFunction {
  const onFocus = () => {
    let isFocusVisible: boolean;
    try {
      isFocusVisible = element.matches(":focus-visible");
    } catch {
      isFocusVisible = true;
    }
    if (isFocusVisible) setActive(true);
  };

  const removeFocus = addDomEvent(element, "focus", onFocus);
  const removeBlur = addDomEvent(element, "blur", () => setActive(false));

  return () => {
    removeFocus();
    removeBlur();
  };
}

export interface GestureStates {
  states: Record<GestureName, Accessor<boolean>>;
  /** `whileDrag` has no listener of its own: the drag engine reports into it. */
  setDragging: (dragging: boolean) => void;
}

/**
 * One signal per gesture, with listeners attached only while a matching prop
 * exists, so an element without `whileHover` or `onHoverStart` pays for no
 * pointer listeners.
 *
 * The node arrives through a signal rather than a `let`, because an effect
 * cannot observe a plain variable being assigned by a ref callback.
 */
export function watchGestures(
  options: () => GestureOptions,
  element: Accessor<GestureTarget | undefined>,
): GestureStates {
  const states = {} as Record<GestureName, Accessor<boolean>>;
  const setters = {} as Record<GestureName, (active: boolean) => void>;

  for (const name of gestureNames) {
    const [active, setActive] = createSignal(false);
    states[name] = active;
    setters[name] = setActive;
  }

  /** Keeps one observer active until its enablement or settings change. */
  const observe = <T>(
    wanted: () => boolean,
    key: () => T,
    start: (node: GestureTarget, key: T) => VoidFunction,
  ) => {
    const enabled = createMemo(wanted);
    createEffect(
      () => {
        if (!enabled()) return undefined;
        const node = element();
        if (!node) return undefined;
        return { node, key: key() };
      },
      (spec) => (spec ? start(spec.node, spec.key) : undefined),
    );
  };

  const has = (...keys: (keyof GestureOptions)[]) => {
    const current = options();
    return keys.some((key) => current[key] !== undefined);
  };

  observe(
    () => has("whileHover", "onHoverStart", "onHoverEnd"),
    () => undefined,
    (node) => observeHover(node, setters.whileHover, options),
  );

  // `press` takes both settings when it starts, so a change restarts it. The
  // boolean is a memo so a new `propagate` object with the same meaning does not.
  const stopsTapPropagation = createMemo(
    () => options().propagate?.tap === false,
  );
  observe(
    () => has("whileTap", "onTapStart", "onTap", "onTapCancel"),
    (): TapSettings => ({
      globalTapTarget: options().globalTapTarget,
      stopPropagation: stopsTapPropagation(),
    }),
    (node, settings) => observeTap(node, setters.whileTap, options, settings),
  );

  observe(
    () => has("whileFocus"),
    () => undefined,
    (node) => observeFocus(node, setters.whileFocus),
  );

  // Re-read the viewport options here so changing them re-observes instead of
  // leaving a stale IntersectionObserver in place.
  observe(
    () => has("whileInView", "onViewportEnter", "onViewportLeave"),
    () => options().viewport,
    (node, viewport) =>
      observeInView(
        node,
        (inView, entry) => {
          setters.whileInView(inView);
          const current = untrack(options);
          (inView ? current.onViewportEnter : current.onViewportLeave)?.(entry);
        },
        viewport,
      ),
  );

  return { states, setDragging: setters.whileDrag };
}
