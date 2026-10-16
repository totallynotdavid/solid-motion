import { motion } from "@totallynotdavid/solid-motion";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport, type Library } from "../playground/format";
import { eases } from "../playground/params";
import { curve, drawDefaults, drawProps, type DrawParams } from "./draw.config";

function Draw(props: DemoProps<DrawParams>) {
  const { initial, animate, transition } = drawProps(props.p);
  return (
    <svg class="draw" viewBox="0 0 240 100" aria-hidden="true">
      <motion.path
        d={curve}
        data-probe
        initial={initial}
        animate={animate}
        transition={transition}
      />
    </svg>
  );
}

const code = (library: Library, p: DrawParams) =>
  withImport(
    library,
    ["motion"],
    openTag("motion.path", { d: curve, ...drawProps(p) }, { selfClose: true }),
  );

export default defineDemo<DrawParams>({
  id: "draw",
  title: "Draw a path",
  hint: "`pathLength` goes from 0 to 1 and the stroke draws itself. The package sets up the dash for you.",
  page: "svg",
  after: "drawing-a-path",
  defaults: drawDefaults,
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
      key: "delay",
      label: "Delay",
      kind: "range",
      min: 0,
      max: 2,
      step: 0.1,
      unit: "s",
    },
  ],
  Solid: Draw,
  React: () => import("./draw.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
