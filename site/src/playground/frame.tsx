import { createSignal, onCleanup, Show, untrack } from "solid-js";

import { gaps } from "../gaps";
import { Code } from "./code";
import { Controls } from "./controls";
import type { DemoSpec } from "./demo";
import { Inline } from "./inline";
import { NotYet, Pane, ReactStage, SolidStage } from "./panes";
import type { Params, ParamValue } from "./params";

const settleMs = 140;

export function DemoFrame<P extends Params>(props: { spec: DemoSpec<P> }) {
  const spec = props.spec;
  const height = spec.height ?? 168;
  const gap = spec.gap === undefined ? undefined : gaps[spec.gap];
  const [state, setState] = createSignal({ values: spec.defaults });
  const values = () => state().values;
  const [reduced, setReduced] = createSignal(false);
  const [run, setRun] = createSignal(0);
  const [tab, setTab] = createSignal<"solid" | "react">(
    spec.Solid && !gap ? "solid" : "react",
  );

  // A drag on a slider fires many changes. The demo starts over once they stop.
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  const replay = () => {
    clearTimeout(timer);
    setRun((count) => count + 1);
  };

  const change = (key: keyof P & string, value: ParamValue) => {
    setState(({ values: current }) => ({
      values: Object.assign({}, current, { [key]: value }),
    }));
    clearTimeout(timer);
    timer = setTimeout(replay, settleMs);
  };

  const code = () =>
    tab() === "solid" && spec.code.solid
      ? spec.code.solid(values())
      : spec.code.react(values());
  const hasSolid = spec.Solid !== undefined && gap === undefined;

  return (
    <section class="demo" data-demo={spec.id} aria-label={spec.title}>
      <header class="demo-head">
        <div>
          <h3>{spec.title}</h3>
          <p>
            <Inline text={spec.hint} />
          </p>
        </div>
        <div class="demo-actions">
          <div class="field toggle">
            <label>
              <input
                id={`${spec.id}-reduced`}
                type="checkbox"
                checked={reduced()}
                onChange={(event) => {
                  setReduced(event.currentTarget.checked);
                  replay();
                }}
              />
              Reduced motion
            </label>
          </div>
          <button type="button" class="button" onClick={replay}>
            Replay
          </button>
        </div>
      </header>

      <div class="panes">
        <Pane
          side="solid"
          label="solid-motion"
          state={hasSolid ? "ready" : "not-yet"}
        >
          <Show
            when={hasSolid && spec.Solid}
            fallback={
              <Show
                when={gap}
                fallback={<p class="stage-note">No solid-motion demo.</p>}
              >
                {(entry) => <NotYet gap={entry()} height={height} />}
              </Show>
            }
          >
            {(Demo) => (
              <Show when={[run(), reduced()] as const} keyed>
                {([count]) => (
                  <SolidStage
                    run={count}
                    Demo={Demo()}
                    p={untrack(values)}
                    reduced={untrack(reduced)}
                    height={height}
                  />
                )}
              </Show>
            )}
          </Show>
        </Pane>
        <Pane side="react" label="motion/react">
          <Show when={[run(), reduced()] as const} keyed>
            {([count]) => (
              <ReactStage
                run={count}
                load={spec.React}
                p={untrack(values)}
                reduced={untrack(reduced)}
                height={height}
              />
            )}
          </Show>
        </Pane>
      </div>

      <Controls
        demo={spec.id}
        controls={spec.controls}
        values={values()}
        onChange={change}
      />

      <div class="code-panel">
        <Show when={hasSolid}>
          <div class="tabs" role="tablist" aria-label="Code">
            <button
              type="button"
              role="tab"
              aria-selected={tab() === "solid" ? "true" : "false"}
              onClick={() => setTab("solid")}
            >
              solid-motion
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab() === "react" ? "true" : "false"}
              onClick={() => setTab("react")}
            >
              motion/react
            </button>
          </div>
        </Show>
        <Code code={code()} />
      </div>
    </section>
  );
}
