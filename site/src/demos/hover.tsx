import { motion } from "@totallynotdavid/solid-motion";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport, type Library } from "../playground/format";
import { transitionControls } from "../playground/params";
import { hoverDefaults, hoverProps, type HoverParams } from "./hover.config";

function Hover(props: DemoProps<HoverParams>) {
  const { whileHover, whileTap, transition } = hoverProps(props.p);
  return (
    <motion.button
      type="button"
      class="box press"
      data-probe
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
    >
      Press
    </motion.button>
  );
}

const code = (library: Library, p: HoverParams) =>
  withImport(
    library,
    ["motion"],
    `${openTag("motion.button", hoverProps(p))}\n  Press\n</motion.button>`,
  );

export default defineDemo<HoverParams>({
  id: "hover-tap",
  title: "Hover and tap",
  hint: "Move the pointer over the box, then press it. Each state is a target the box animates to, and back from.",
  page: "gestures",
  after: "intro",
  defaults: hoverDefaults,
  controls: [
    {
      key: "hover",
      label: "whileHover scale",
      kind: "range",
      min: 1,
      max: 2,
      step: 0.05,
    },
    {
      key: "tap",
      label: "whileTap scale",
      kind: "range",
      min: 0.5,
      max: 1,
      step: 0.05,
    },
    ...transitionControls<HoverParams>({ delay: false }),
  ],
  Solid: Hover,
  React: () => import("./hover.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
