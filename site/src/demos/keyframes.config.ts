import type { Ease } from "../playground/params";

export type KeyframesParams = {
  duration: number;
  ease: Ease;
  distance: number;
  repeat: number;
};

export const keyframesDefaults: KeyframesParams = {
  duration: 1,
  ease: "easeInOut",
  distance: 90,
  repeat: 0,
};

/** The props both libraries receive, and the code on the page prints. */
export function keyframesProps(p: KeyframesParams): {
  animate: { x: number[]; rotate: number[] };
  transition: {
    duration: number;
    ease: Ease;
    repeat?: number | undefined;
  };
} {
  return {
    animate: { x: [0, p.distance, -p.distance, 0], rotate: [0, 30, 60, 90] },
    transition: {
      duration: p.duration,
      ease: p.ease,
      repeat: p.repeat === 0 ? undefined : p.repeat,
    },
  };
}
