import { motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport, type Library } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import { switchDefaults, type SwitchParams } from "./switch.config";

function Switch(props: DemoProps<SwitchParams>) {
  const [on, setOn] = createSignal(false);
  const transition = transitionOf(props.p);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on() ? "true" : "false"}
      aria-label="Switch"
      class={on() ? "track on" : "track"}
      data-origin
      onClick={() => setOn((value) => !value)}
    >
      <motion.span class="knob" data-probe layout transition={transition} />
    </button>
  );
}

function code(library: Library, p: SwitchParams): string {
  const solid = library === "solid";
  const knob = openTag(
    "motion.span",
    {
      [solid ? "class" : "className"]: "knob",
      layout: true,
      transition: transitionOf(p),
    },
    { selfClose: true, indent: 1 },
  );
  const track = solid
    ? `<button class={on() ? "track on" : "track"} onClick={toggle}>`
    : `<button className={on ? "track on" : "track"} onClick={toggle}>`;
  return withImport(
    library,
    ["motion"],
    `${track}\n  ${knob}\n</button>\n\n/* .track.on { justify-content: flex-end } */`,
  );
}

export default defineDemo<SwitchParams>({
  id: "switch",
  title: "Layout switch",
  hint: "The class moves the knob in CSS. `layout` animates it there instead of jumping. Click the switch.",
  page: "layout",
  after: "intro",
  defaults: switchDefaults,
  controls: transitionControls<SwitchParams>({ delay: false }),
  Solid: Switch,
  React: () => import("./switch.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
