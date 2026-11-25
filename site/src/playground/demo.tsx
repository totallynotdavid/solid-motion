import type { ComponentType } from "react";
import type { Component } from "solid-js";

import type { GapId } from "../gaps";
import { DemoFrame } from "./frame";
import type { Control, Params } from "./params";

export interface DemoProps<P> {
  p: P;
}

export interface DemoSpec<P extends Params> {
  id: string;
  title: string;
  /** One or two sentences: what to try. */
  hint: string;
  defaults: P;
  controls: Control<P>[];
  /** Left out while `gap` is set. */
  Solid?: Component<DemoProps<P>>;
  React: () => Promise<{ default: ComponentType<DemoProps<P>> }>;
  code: { solid?: (values: P) => string; react: (values: P) => string };
  gap?: GapId;
  height?: number;
}

/** The island a `<!-- island NAME -->` marker mounts. */
export function defineDemo<P extends Params>(spec: DemoSpec<P>): Component {
  return () => <DemoFrame spec={spec} />;
}
