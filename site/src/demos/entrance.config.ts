import {
  springDefaults,
  transitionOf,
  type TransitionParams,
  type TransitionProp,
} from "../playground/params";

export type EntranceParams = TransitionParams & {
  offset: number;
  scale: number;
};

export const entranceDefaults: EntranceParams = {
  ...springDefaults,
  offset: 120,
  scale: 0.6,
};

/** The props both libraries receive, and the code on the page prints. */
export function entranceProps(p: EntranceParams): {
  initial: { opacity: number; x: number; scale: number };
  animate: { opacity: number; x: number; scale: number };
  transition: TransitionProp;
} {
  return {
    initial: { opacity: 0, x: -p.offset, scale: p.scale },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: transitionOf(p),
  };
}
