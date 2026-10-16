import { motion } from "@totallynotdavid/solid-motion";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport } from "../playground/format";
import { eases } from "../playground/params";
import {
  keyframesDefaults,
  keyframesProps,
  type KeyframesParams,
} from "./keyframes.config";

function Keyframes(props: DemoProps<KeyframesParams>) {
  const { animate, transition } = keyframesProps(props.p);
  return (
    <motion.div
      class="box"
      data-probe
      animate={animate}
      transition={transition}
    />
  );
}

const code = (library: "solid" | "react", p: KeyframesParams) =>
  withImport(
    library,
    ["motion"],
    openTag("motion.div", keyframesProps(p), { selfClose: true }),
  );

export default defineDemo<KeyframesParams>({
  id: "keyframes",
  title: "Keyframes",
  hint: "An array is a list of stops. The box visits each one in turn and `rotate` ends at 90.",
  page: "animating-elements",
  after: "targets",
  defaults: keyframesDefaults,
  controls: [
    {
      key: "duration",
      label: "Duration",
      kind: "range",
      min: 0.2,
      max: 4,
      step: 0.1,
      unit: "s",
    },
    { key: "ease", label: "Easing", kind: "select", options: eases },
    {
      key: "distance",
      label: "Distance",
      kind: "range",
      min: 20,
      max: 140,
      step: 5,
      unit: "px",
    },
    { key: "repeat", label: "Repeat", kind: "range", min: 0, max: 3, step: 1 },
  ],
  Solid: Keyframes,
  React: () => import("./keyframes.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
