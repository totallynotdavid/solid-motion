import { springDefaults, type TransitionParams } from "../playground/params";

export type RowsParams = TransitionParams & { mode: "sync" | "popLayout" };

export const rowsDefaults: RowsParams = {
  ...springDefaults,
  type: "tween",
  duration: 0.35,
  mode: "popLayout",
};

export const rowLabels = ["Inbox", "Drafts", "Sent", "Archive"];

export const rowExit = { opacity: 0, scale: 0.8 } as const;
