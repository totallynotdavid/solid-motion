/**
 * What `motion/react` does that solid-motion does not yet. A demo points at
 * one entry with `gap`. The "Site" section of `.github/contributing.md` says
 * how to add and retire one.
 */
export interface Gap {
  /** Shown on the pane. */
  title: string;
  /** The `motion/react` API the demo uses. */
  react: string;
  /** What solid-motion does today. */
  note: string;
}

export const gaps = {
  path: {
    title: "Curved motion paths",
    react: "transition={{ path: arc() }}",
    note: "`transition.path` has no effect, so x and y move in a straight line. `arc()` is not exported.",
  },
  "animate-value": {
    title: "Animating a plain value",
    react: "animate(0, 100, { onUpdate })",
    note: "`createAnimate` takes elements and selectors. It cannot animate a number or a MotionValue.",
  },
  "sequence-at": {
    title: "Overlapping sequence steps",
    react: "[target, keyframes, { at }]",
    note: "A step is a two-item tuple and starts when the one before it ends. There is no `at`.",
  },
} satisfies Record<string, Gap>;

export type GapId = keyof typeof gaps;
