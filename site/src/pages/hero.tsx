import { MotionConfig } from "@totallynotdavid/solid-motion";
import { createSignal, Show } from "solid-js";

import { Code } from "../playground/code";
import { Tiles } from "./hero-example";
import example from "./hero-example.tsx?raw";

const items = [
  "Variants",
  "Gestures",
  "Layout",
  "Presence",
  "Scroll",
  "Drag",
  "Springs",
  "Stagger",
  "SVG",
  "Values",
  "Keyframes",
  "Reorder",
];

/** The home page's live example: the tiles, a replay button and their code. */
export default function Hero() {
  const [run, setRun] = createSignal(1);

  return (
    <MotionConfig reducedMotion="user">
      <section class="demo hero" aria-label="Live example">
        <Show when={[run()] as const} keyed>
          {([count]) => (
            <div class="stage hero-stage" data-run={count}>
              <Tiles items={items} />
            </div>
          )}
        </Show>
        <button
          type="button"
          class="button small replay"
          onClick={() => setRun((count) => count + 1)}
        >
          Replay
        </button>
        <div class="code-panel">
          <Code code={example.trim()} />
        </div>
      </section>
    </MotionConfig>
  );
}
