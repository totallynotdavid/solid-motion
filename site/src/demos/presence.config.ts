import { springDefaults, type TransitionParams } from "../playground/params";

export type PresenceParams = TransitionParams & {
  exit: "fade" | "slide" | "shrink";
};

export const presenceDefaults: PresenceParams = {
  ...springDefaults,
  type: "tween",
  duration: 0.5,
  exit: "slide",
};

export function presenceProps(p: PresenceParams): {
  initial: { opacity: number; scale: number };
  animate: { opacity: number; scale: number };
  exit: { opacity: number; x?: number; scale?: number };
} {
  const exit = {
    fade: { opacity: 0 },
    slide: { opacity: 0, x: 80 },
    shrink: { opacity: 0, scale: 0.3 },
  }[p.exit];
  return {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    exit,
  };
}
