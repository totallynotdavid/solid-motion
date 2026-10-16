import { createMotionValue, motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { literal, withImport, type Library } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import { followDefaults, reach, type FollowParams } from "./follow.config";

function Follow(props: DemoProps<FollowParams>) {
  const [target, setTarget] = createSignal(0);
  const x = createMotionValue(target, transitionOf(props.p));
  return (
    <div class="cluster">
      <button
        type="button"
        class="button small"
        onClick={() => setTarget((value) => (value === 0 ? reach : 0))}
      >
        Move
      </button>
      <div class="rail">
        <motion.div class="box small" data-probe style={{ x }} />
      </div>
    </div>
  );
}

function code(library: Library, p: FollowParams): string {
  const transition = literal(transitionOf(p));
  const body =
    library === "solid"
      ? `const [target, setTarget] = createSignal(0);\nconst x = createMotionValue(target, ${transition});\n\n<button onClick={() => setTarget(${reach})}>Move</button>\n<motion.div style={{ x }} />`
      : `const target = useMotionValue(0);\nconst x = useFollowValue(target, ${transition});\n\n<button onClick={() => target.set(${reach})}>Move</button>\n<motion.div style={{ x }} />`;
  return withImport(
    library,
    library === "solid"
      ? ["createMotionValue", "motion"]
      : ["motion", "useFollowValue", "useMotionValue"],
    body,
  );
}

export default defineDemo<FollowParams>({
  id: "follow",
  title: "A value that follows",
  hint: "A motion value follows its source with a spring. Press Move, then again while it is still travelling.",
  page: "motion-values",
  after: "springs-and-following",
  defaults: followDefaults,
  controls: transitionControls<FollowParams>({ delay: false }),
  Solid: Follow,
  React: () => import("./follow.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
