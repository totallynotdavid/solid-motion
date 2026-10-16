import type { JSX } from "@solidjs/web";
import { MotionConfig } from "@totallynotdavid/solid-motion";
import type { ComponentType } from "react";
import {
  createSignal,
  onSettled,
  Show,
  untrack,
  type Component,
} from "solid-js";

import type { Gap } from "../gaps";
import type { DemoProps } from "./demo";
import { Inline } from "./inline";

type State = "loading" | "ready" | "error";

export function Pane(props: {
  side: "solid" | "react";
  label: string;
  state?: string;
  children: JSX.Element;
}) {
  return (
    <div
      class="pane"
      data-pane={props.side}
      data-state={props.state ?? "ready"}
    >
      <div class="pane-label">{props.label}</div>
      {props.children}
    </div>
  );
}

export function SolidStage<P>(props: {
  /** Which start of the demo this is. Tests wait for it to change. */
  run: number;
  Demo: Component<DemoProps<P>>;
  p: P;
  reduced: boolean;
  height: number;
}) {
  return (
    <div
      class="stage"
      data-state="ready"
      data-run={props.run}
      style={{ height: `${props.height}px` }}
    >
      <MotionConfig reducedMotion={props.reduced ? "always" : "never"}>
        {/* The demo reads its values once. The frame starts it over on a change. */}
        {untrack(() => props.Demo({ p: props.p }))}
      </MotionConfig>
    </div>
  );
}

export function ReactStage<P>(props: {
  run: number;
  load: () => Promise<{ default: ComponentType<DemoProps<P>> }>;
  p: P;
  reduced: boolean;
  height: number;
}) {
  let host: HTMLDivElement | undefined;
  const [state, setState] = createSignal<State>("loading");

  onSettled(() => {
    let cancelled = false;
    let unmount: (() => void) | undefined;
    const start = async () => {
      try {
        const [demo, react] = await Promise.all([
          props.load(),
          import("./react-host.react"),
        ]);
        if (cancelled || !host) return;
        unmount = react.mount(host, demo.default, props.p, props.reduced);
        setState("ready");
      } catch {
        setState("error");
      }
    };
    void start();
    return () => {
      cancelled = true;
      unmount?.();
    };
  });

  return (
    <div
      class="stage"
      data-state={state()}
      data-run={props.run}
      style={{ height: `${props.height}px` }}
    >
      <div
        class="react-root"
        ref={(element) => {
          host = element;
        }}
      />
      <Show when={state() !== "ready"}>
        <p class="stage-note">
          {state() === "error" ? "motion/react failed to load." : "Loading…"}
        </p>
      </Show>
    </div>
  );
}

export function NotYet(props: { gap: Gap; height: number }) {
  return (
    <div class="stage not-yet" style={{ height: `${props.height}px` }}>
      <span class="badge">Not yet</span>
      <p class="not-yet-title">{props.gap.title}</p>
      <p>
        <Inline text={props.gap.note} />
      </p>
    </div>
  );
}
