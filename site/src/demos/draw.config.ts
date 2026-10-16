import type { Ease } from "../playground/params";

export type DrawParams = { duration: number; ease: Ease; delay: number };

export const drawDefaults: DrawParams = {
  duration: 1.2,
  ease: "easeInOut",
  delay: 0,
};

export const curve =
  "M12 70 C 40 8, 70 8, 90 50 S 140 100, 168 30 S 200 20, 228 52";

export function drawProps(p: DrawParams): {
  initial: { pathLength: number };
  animate: { pathLength: number };
  transition: { duration: number; ease: Ease; delay?: number | undefined };
} {
  return {
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: {
      duration: p.duration,
      ease: p.ease,
      delay: p.delay === 0 ? undefined : p.delay,
    },
  };
}
