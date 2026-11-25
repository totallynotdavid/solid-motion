import {
  springDefaults,
  transitionOf,
  type TransitionParams,
  type TransitionProp,
} from "../playground/params";

export type HoverParams = TransitionParams & { hover: number; tap: number };

export const hoverDefaults: HoverParams = {
  ...springDefaults,
  stiffness: 400,
  damping: 17,
  hover: 1.3,
  tap: 0.85,
};

export function hoverProps(p: HoverParams): {
  whileHover: { scale: number };
  whileTap: { scale: number };
  transition: TransitionProp;
} {
  return {
    whileHover: { scale: p.hover },
    whileTap: { scale: p.tap },
    transition: transitionOf(p),
  };
}
