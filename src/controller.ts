import {
  frame,
  type MotionValue,
  type ValueKeyframesDefinition,
} from "motion-dom";

import type { LayoutOptions } from "./projection";
import type { MergedTarget } from "./target";
import type { AnimationDefinition, Transition } from "./types";
import {
  claim,
  releaseValueStore,
  sharedValueStore,
  type TemplateSource,
  type ValueStore,
} from "./values";

/**
 * Everything one animation pass needs, already resolved. The component computes
 * this inside a tracking scope; the controller only ever receives plain values
 * and only ever performs side effects.
 */
export interface MotionPass {
  target: MergedTarget;
  /** Used by values falling back after the layer that owned them went away. */
  fallbackTransition: Transition | undefined;
  /** Stagger offset contributed by a variant-controlling ancestor. */
  delay: number;
  /**
   * Jump to every target instead of animating there.
   *
   * Carried on the pass rather than folded into a transition upstream. It has
   * to reach the transition of every value this pass touches, and a target that
   * brings its own transition replaces the element's, so anything merged into
   * the element-level one is dropped exactly when a variant or an inline
   * `exit={{ ..., transition }}` is in play.
   */
  skipAnimations: boolean;
  /** Suppresses layout movement for reduced motion and skipped animations. */
  instantLayout: boolean;
  /** Defers the pass until its turn for `when` orchestration. */
  sequence?: (begin: VoidFunction) => void;
  /** Handed back to lifecycle callbacks unchanged, for reporting only. */
  definition: AnimationDefinition;
  onAnimationStart?: (definition: AnimationDefinition) => void;
  onAnimationComplete?: (definition: AnimationDefinition) => void;
  onUpdate?: (latest: Record<string, string | number>) => void;
}

export interface MotionController {
  mount(element: HTMLElement | SVGElement): void;
  /** The element's values, once it has mounted. */
  readonly store: ValueStore | undefined;
  /**
   * Runs a pass. `onSettled` is called exactly once: with `true` when the pass
   * reached its target, with `false` when a later pass or disposal took over.
   */
  run(pass: MotionPass, onSettled?: (completed: boolean) => void): void;
  /** Writes values straight to the element without animating. */
  set(values: Record<string, string | number>): void;
  /** Halts every animation, leaving each value where it has reached. */
  stop(): void;
  dispose(): void;
}

export function createMotionController(
  /**
   * The target the element was rendered with, in raw (pre-CSS) units. It
   * describes the element, not a pass, and the value store is built from it when
   * the ref fires. A store built without it reads the DOM instead, and the
   * computed transform matrix cannot tell `rotate: 450` from `rotate: 90`.
   */
  initialValues: Record<string, string | number>,
  /** Values from `style` that the caller owns; bound, never created here. */
  bound: ReadonlyMap<string, MotionValue>,
  /** Present when the element asked for `layout` or `layoutId`. */
  layout?: LayoutOptions,
  /** Present when the element asked for a `transformTemplate`. */
  template?: TemplateSource,
): MotionController {
  let store: ValueStore | undefined;
  let mountedElement: HTMLElement | SVGElement | undefined;
  let queued:
    | { pass: MotionPass; onSettled?: (completed: boolean) => void }
    | undefined;
  let onUpdate: MotionPass["onUpdate"];
  let observing = false;

  /**
   * What the element was last told to become, so a pass only touches values that
   * actually changed. Seeded from the initial target, because that is what the
   * element was rendered carrying.
   */
  let applied = new Map<string, ValueKeyframesDefinition>(
    Object.entries(initialValues),
  );

  /** Identifies the pass allowed to settle. Cancelled animations may not settle. */
  let generation = 0;
  let release: ((completed: boolean) => void) | undefined;

  const supersede = () => {
    generation += 1;
    const previous = release;
    release = undefined;
    previous?.(false);
  };

  const complete = (pass: number) => {
    if (pass !== generation) return;
    const settled = release;
    release = undefined;
    settled?.(true);
  };

  const start = (
    pass: MotionPass,
    onSettled?: (completed: boolean) => void,
  ) => {
    supersede();
    release = onSettled;

    const generationAtStart = generation;
    if (!store) return;

    // Layout timing follows the winning pass. The target's transition is the one
    // the active layer brought, so a `transition.layout` written into a variant
    // or an inline target reaches the projection engine.
    store.setLayoutTiming({
      transition: pass.target.transition,
      instant: pass.instantLayout,
    });

    // Keep one subscription while allowing the callback to change.
    onUpdate = pass.onUpdate;
    if (onUpdate && !observing) {
      observing = true;
      store.observe((latest) => onUpdate?.(latest));
    }

    if (!pass.sequence) {
      begin(pass, generationAtStart);
      return;
    }
    pass.sequence(() => begin(pass, generationAtStart));
  };

  /** Starts the pass after any sequencing delay. */
  const begin = (pass: MotionPass, generationAtStart: number) => {
    if (generationAtStart !== generation || !store || !mountedElement) return;
    const element = mountedElement;

    const work = planWork(pass, applied, store, initialValues);
    applied = work.applied;

    const { transitionEnd } = pass.target;

    // Idempotent because a pass can reach completion two ways once it has
    // started animating: every animation it owns finishing naturally, or
    // `claim()` reporting that one of them got reclaimed first (see below).
    // Either can fire after the other has already run this pass to
    // completion, and only the first one must count.
    let done = false;
    const finish = () => {
      if (generationAtStart !== generation || done) return;
      done = true;
      for (const [key, value] of Object.entries(transitionEnd)) {
        store?.set(key, value);
        applied.set(key, value);
      }
      pass.onAnimationComplete?.(pass.definition);
      complete(generationAtStart);
    };

    if (work.changes.length === 0) {
      finish();
      return;
    }

    pass.onAnimationStart?.(pass.definition);

    // How many keys this pass is still waiting on, mirroring
    // `create-animate.ts`'s `runTarget`: a key only counts once it actually
    // starts animating, and only ever counts down once, whichever happens
    // first between its own `finished` resolving naturally and a later call
    // claiming it away. Waiting for this to reach zero, rather than firing
    // `finish` off any single key, is what keeps one property being
    // reclaimed from resolving the whole pass while its other properties are
    // still animating.
    let pending = 0;

    // Animations are created on motion's frame, never inline in Solid's flush.
    // `time.now()` is memoised per synchronous block and cleared on a
    // microtask, so an animation started in the middle of a long render gets
    // the clock reading from the top of that block. Its start time is then in
    // the past, and a short animation completes on its first tick.
    //
    // Inside `frame.update` the clock is the frame's own, which is the clock the
    // animation's ticks read. It also coalesces every element animating in one
    // Solid flush into a single frame.
    frame.update(() => {
      if (generationAtStart !== generation || !store) return;

      for (const change of work.changes) {
        const animation = store.animate(
          change.key,
          change.value,
          passTransition(change.transition, pass),
        );

        if (!animation) {
          // `store.animate()` took this pair through `value.start()` even
          // though motion resolved it instantly with nothing to hand back.
          // Claiming it anyway notifies whoever held it before. This pass has
          // nothing left to wait on for this key.
          claim(element, change.key, () => undefined);
          continue;
        }

        pending += 1;

        let keyDone = false;
        const finishKey = () => {
          if (keyDone) return;
          keyDone = true;
          pending -= 1;
          if (pending > 0) return;
          finish();
        };

        // An imperative `animate()` call on this same element/property steals
        // the `MotionValue` this pass just started animating (motion-dom's own
        // `MotionValue.start` stops whatever animation was already running on
        // it) without ever settling that animation's own `finished`. Claiming
        // it lets whichever call takes it next report that back, so this key
        // counts as done the same way its own `finished` resolving naturally
        // would have.
        animation.finished.catch(() => undefined).finally(finishKey);
        claim(element, change.key, finishKey);
      }

      // Motion resolves instant targets without creating an animation at all,
      // so nothing pending means every key this pass touched already reached
      // its target.
      if (pending === 0) {
        finish();
        return;
      }
    });
  };

  return {
    get store() {
      return store;
    },

    mount(element) {
      mountedElement = element;
      store = sharedValueStore(element, initialValues, bound, layout, template);
      if (!queued) return;

      const { pass, onSettled } = queued;
      queued = undefined;
      release = undefined;
      start(pass, onSettled);
    },

    run(pass, onSettled) {
      // The ref has not fired yet. Hold the pass until `mount` provides the store.
      if (!store) {
        queued?.onSettled?.(false);
        queued = { pass, onSettled };
        return;
      }
      start(pass, onSettled);
    },

    set(values) {
      supersede();
      for (const [key, value] of Object.entries(values)) {
        store?.set(key, value);
        applied.set(key, value);
      }
    },

    stop() {
      supersede();
      if (!store) return;
      // What the next pass is compared against has to be where the element
      // actually stopped, or a pass back to the old target would see no change.
      for (const key of applied.keys()) {
        const value = store.value(key);
        value.stop();
        applied.set(key, value.get());
      }
    },

    dispose() {
      supersede();
      queued?.onSettled?.(false);
      queued = undefined;
      store?.dispose();
      if (store && mountedElement) releaseValueStore(mountedElement, store);
      store = undefined;
    },
  };
}

/** Adds pass-wide delay and animation settings to a value transition. */
function passTransition(
  transition: Transition | undefined,
  pass: MotionPass,
): Transition | undefined {
  if (!pass.delay && !pass.skipAnimations) return transition;

  const own = (transition as { delay?: number } | undefined)?.delay ?? 0;
  return {
    ...transition,
    ...(pass.delay ? { delay: own + pass.delay } : undefined),
    ...(pass.skipAnimations ? { skipAnimations: true } : undefined),
  } as Transition;
}

interface ValueChange {
  key: string;
  value: ValueKeyframesDefinition;
  transition: Transition | undefined;
}

/** Plans changed values and restores keys removed from the target. */
function planWork(
  pass: MotionPass,
  applied: Map<string, ValueKeyframesDefinition>,
  store: ValueStore,
  initialValues: Record<string, string | number>,
): { changes: ValueChange[]; applied: Map<string, ValueKeyframesDefinition> } {
  const changes: ValueChange[] = [];
  const next = new Map<string, ValueKeyframesDefinition>();

  for (const [key, entry] of pass.target.entries) {
    next.set(key, entry.value);
    if (isSameTarget(applied.get(key), entry.value)) continue;
    changes.push({ key, value: entry.value, transition: entry.transition });
  }

  for (const key of applied.keys()) {
    if (next.has(key)) continue;

    const base = store.baseValue(key) ?? initialValues[key];
    if (base === undefined) continue;

    next.set(key, base);
    if (isSameTarget(applied.get(key), base)) continue;
    changes.push({ key, value: base, transition: pass.fallbackTransition });
  }

  return { changes, applied: next };
}

/** Compares keyframe arrays by contents so fresh equivalent arrays do not restart. */
function isSameTarget(
  current: ValueKeyframesDefinition | undefined,
  next: ValueKeyframesDefinition,
): boolean {
  if (Object.is(current, next)) return true;
  if (!Array.isArray(current) || !Array.isArray(next)) return false;

  return (
    current.length === next.length &&
    current.every((value, index) => Object.is(value, next[index]))
  );
}
