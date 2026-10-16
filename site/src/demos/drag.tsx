import { motion } from "@totallynotdavid/solid-motion";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport, type Library } from "../playground/format";
import {
  areaSize,
  dragDefaults,
  dragProps,
  type DragParams,
} from "./drag.config";

function Drag(props: DemoProps<DragParams>) {
  const settings = dragProps(props.p);
  const area = areaSize(props.p);
  return (
    <div
      class="area"
      style={{ width: `${area.width}px`, height: `${area.height}px` }}
    >
      <motion.div
        class="box grab"
        data-probe
        drag={settings.drag}
        dragConstraints={settings.dragConstraints}
        dragElastic={settings.dragElastic}
        dragMomentum={settings.dragMomentum}
        dragSnapToOrigin={settings.dragSnapToOrigin}
        whileDrag={settings.whileDrag}
      />
    </div>
  );
}

const code = (library: Library, p: DragParams) =>
  withImport(
    library,
    ["motion"],
    openTag("motion.div", dragProps(p), { selfClose: true }),
  );

export default defineDemo<DragParams>({
  id: "drag",
  title: "Drag with constraints",
  hint: "Drag the box past the dashed edge and let go. It resists by the elastic factor, then springs back.",
  page: "drag",
  after: "intro",
  defaults: dragDefaults,
  height: 200,
  controls: [
    {
      key: "axis",
      label: "drag",
      kind: "select",
      options: ["both", "x", "y"],
    },
    {
      key: "constraint",
      label: "Constraint",
      kind: "range",
      min: 20,
      max: 120,
      step: 5,
      unit: "px",
    },
    {
      key: "elastic",
      label: "dragElastic",
      kind: "range",
      min: 0,
      max: 1,
      step: 0.05,
    },
    { key: "snapBack", label: "dragSnapToOrigin", kind: "toggle" },
  ],
  Solid: Drag,
  React: () => import("./drag.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
