import { springDefaults, type TransitionParams } from "../playground/params";

export type ValueParams = TransitionParams & { to: number };

export const valueDefaults: ValueParams = {
  ...springDefaults,
  stiffness: 120,
  damping: 20,
  to: 100,
};
