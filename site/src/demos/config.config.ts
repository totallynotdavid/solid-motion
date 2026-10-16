import { tweenDefaults, type TransitionParams } from "../playground/params";

export type ConfigParams = TransitionParams & { skip: boolean };

export const configDefaults: ConfigParams = {
  ...tweenDefaults,
  duration: 1,
  skip: false,
};

export const moveTarget = { x: 110, rotate: 90 } as const;
