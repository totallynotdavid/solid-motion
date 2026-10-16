import { MotionConfig, motion } from "@totallynotdavid/solid-motion";
import { createSignal, Show } from "solid-js";

import { pages } from "../content/pages";
import { Code, CopyButton } from "../playground/code";
import { Tiles } from "./hero-example";
import example from "./hero-example.tsx?raw";

const packages = [
  "@totallynotdavid/solid-motion",
  "solid-js@next",
  "@solidjs/web@next",
];
const install = `npm install ${packages.join(" ")}`;

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

const rise = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export function Landing() {
  const [run, setRun] = createSignal(1);

  return (
    <MotionConfig reducedMotion="user">
      <main id="content" class="landing">
        <motion.div
          class="landing-copy"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          <motion.p class="eyebrow" variants={rise}>
            Solid 2 · built on motion-dom
          </motion.p>
          <motion.h1 variants={rise}>
            Animate Solid the way Motion does.
          </motion.h1>
          <motion.p class="lede" variants={rise}>
            solid-motion mirrors the <code>motion/react</code> components on
            Solid 2. Every manual page runs each demo in both libraries, with
            the same controls.
          </motion.p>
          <motion.div class="install" variants={rise}>
            <code>
              npm install{" "}
              {packages.map((name) => (
                <>
                  <span>{name}</span>{" "}
                </>
              ))}
            </code>
            <CopyButton text={() => install} label="Copy the install command" />
          </motion.div>
          <motion.div class="landing-actions" variants={rise}>
            <a class="button" href={`/${pages[0]?.slug ?? ""}`}>
              Read the manual
            </a>
            <a class="link-quiet" href="/gestures">
              Compare with motion/react
            </a>
          </motion.div>
        </motion.div>

        <div class="landing-demo">
          <section class="demo" aria-label="Live example">
            <Show when={[run()] as const} keyed>
              {([count]) => (
                <div class="stage landing-stage" data-run={count}>
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
        </div>
      </main>
    </MotionConfig>
  );
}
