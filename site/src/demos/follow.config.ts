import { springDefaults, type TransitionParams } from "../playground/params";

export type FollowParams = TransitionParams;

export const followDefaults: FollowParams = {
  ...springDefaults,
  stiffness: 120,
  damping: 8,
};

/** How far the ball travels when the target changes. */
export const reach = 140;
