import { springDefaults, type TransitionParams } from "../playground/params";

export type TabsParams = TransitionParams;

export const tabsDefaults: TabsParams = {
  ...springDefaults,
  stiffness: 500,
  damping: 35,
};

export const tabs = ["Home", "Docs", "Blog", "About"];
