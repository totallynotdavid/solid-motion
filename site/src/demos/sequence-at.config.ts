import type { Ease } from "../playground/params";

export type OverlapParams = {
  duration: number;
  ease: Ease;
  distance: number;
  /** Seconds each step starts before the previous one ends. */
  overlap: number;
};

export const overlapDefaults: OverlapParams = {
  duration: 0.5,
  ease: "easeOut",
  distance: 120,
  overlap: 0.2,
};

export const dots = [".a", ".b", ".c"] as const;
