import { motion } from "@totallynotdavid/solid-motion";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag } from "../playground/format";
import { transitionControls } from "../playground/params";
import {
  entranceDefaults,
  entranceProps,
  type EntranceParams,
} from "./entrance.config";

function Entrance(props: DemoProps<EntranceParams>) {
  const { initial, animate, transition } = entranceProps(props.p);
  return (
    <motion.div
      class="box"
      data-probe
      initial={initial}
      animate={animate}
      transition={transition}
    />
  );
}

export default defineDemo<EntranceParams>({
  id: "entrance",
  title: "Entrance",
  hint: "The box starts at `initial` and animates to `animate` on mount. Change how it gets there.",
  page: "animating-elements",
  after: "intro",
  defaults: entranceDefaults,
  controls: [
    ...transitionControls<EntranceParams>(),
    {
      key: "offset",
      label: "Offset",
      kind: "range",
      min: 0,
      max: 200,
      step: 10,
      unit: "px",
    },
    {
      key: "scale",
      label: "Start scale",
      kind: "range",
      min: 0,
      max: 1,
      step: 0.1,
    },
  ],
  Solid: Entrance,
  React: () => import("./entrance.react"),
  code: {
    solid: (p) =>
      `import { motion } from "@totallynotdavid/solid-motion";\n\n${openTag("motion.div", entranceProps(p), { selfClose: true })}`,
    react: (p) =>
      `import { motion } from "motion/react";\n\n${openTag("motion.div", entranceProps(p), { selfClose: true })}`,
  },
});
