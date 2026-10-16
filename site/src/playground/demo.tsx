import type { JSX } from "@solidjs/web";
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
  /** The manual page, by slug, and the section the demo follows. */
  page: string;
  after: string;
  defaults: P;
  controls: Control<P>[];
  /** Left out while `gap` is set. */
  Solid?: Component<DemoProps<P>>;
  React: () => Promise<{ default: ComponentType<DemoProps<P>> }>;
  code: { solid?: (values: P) => string; react: (values: P) => string };
  gap?: GapId;
  height?: number;
}

export interface Demo {
  id: string;
  page: string;
  after: string;
  view: () => JSX.Element;
}

export function defineDemo<P extends Params>(spec: DemoSpec<P>): Demo {
  return {
    id: spec.id,
    page: spec.page,
    after: spec.after,
    view: () => <DemoFrame spec={spec} />,
  };
}
