import type { Ease } from "../playground/params";

export type SequenceParams = {
  duration: number;
  ease: Ease;
  distance: number;
};

export const sequenceDefaults: SequenceParams = {
  duration: 0.4,
  ease: "easeOut",
  distance: 120,
};

/** The three dots, in the order the sequence moves them. */
export const dots = [".a", ".b", ".c"] as const;
