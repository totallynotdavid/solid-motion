import { springDefaults, type TransitionParams } from "../playground/params";

export type SwitchParams = TransitionParams;

export const switchDefaults: SwitchParams = {
  ...springDefaults,
  stiffness: 500,
  damping: 30,
};
