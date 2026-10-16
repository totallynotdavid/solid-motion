import type { AnimationDefinition, Transition } from "./types";

/**
 * Drives the elements whose `animate` prop it is given. Unlike a state change,
 * a call can be awaited, repeated with the same definition, and made from an
 * event handler that has no signal to write.
 */
export interface AnimationControls {
  /**
   * Animates every attached element to a variant label, a list of labels or a
   * target, and resolves when they have all arrived or been interrupted.
   * `transition` replaces the transitions of the element's own animation.
   */
  start(
    definition: Exclude<AnimationDefinition, false | undefined>,
    transition?: Transition,
  ): Promise<void>;
  /** Jumps to a label or target without animating. */
  set(definition: Exclude<AnimationDefinition, false | undefined>): void;
  /** Stops every running animation, leaving values where they are. */
  stop(): void;
}

/** What one attached element does when the controls are used. */
export interface ControlsListener {
  start: (
    definition: Exclude<AnimationDefinition, false | undefined>,
    transition?: Transition,
  ) => Promise<void>;
  set: (definition: Exclude<AnimationDefinition, false | undefined>) => void;
  stop: () => void;
}

const listeners = new WeakMap<AnimationControls, Set<ControlsListener>>();

/**
 * Controls for any number of elements: pass the result as `animate`. Elements
 * attach when they are created and detach when they are removed, so it can be
 * made anywhere, including at module scope.
 */
export function createAnimationControls(): AnimationControls {
  const attached = new Set<ControlsListener>();

  const controls: AnimationControls = {
    start: async (definition, transition) => {
      await Promise.all(
        Array.from(attached, (listener) =>
          listener.start(definition, transition),
        ),
      );
    },
    set: (definition) =>
      attached.forEach((listener) => listener.set(definition)),
    stop: () => attached.forEach((listener) => listener.stop()),
  };

  listeners.set(controls, attached);
  return controls;
}

export function isAnimationControls(
  value: unknown,
): value is AnimationControls {
  return (
    typeof value === "object" &&
    value !== null &&
    listeners.has(value as AnimationControls)
  );
}

/** Attaches an element to the controls. Returns the function that detaches it. */
export function attachToControls(
  controls: AnimationControls,
  listener: ControlsListener,
): VoidFunction {
  const attached = listeners.get(controls);
  attached?.add(listener);
  return () => attached?.delete(listener);
}

/** What the last `start` or `set` on a set of controls asked this element for. */
export interface ControlledAnimation {
  definition: Exclude<AnimationDefinition, false | undefined>;
  transition?: Transition;
  /** Counts calls, so a pass can say which of them it answers. */
  epoch: number;
}
