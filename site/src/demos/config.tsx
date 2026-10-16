import { MotionConfig, motion } from "@totallynotdavid/solid-motion";

import { defineDemo, type DemoProps } from "../playground/demo";
import { literal, withImport, type Library } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import { configDefaults, moveTarget, type ConfigParams } from "./config.config";

function Config(props: DemoProps<ConfigParams>) {
  const { p } = props;
  return (
    <MotionConfig transition={transitionOf(p)} skipAnimations={p.skip}>
      <div class="duo">
        <motion.div
          class="box small"
          data-probe
          initial={{ x: 0, rotate: 0 }}
          animate={moveTarget}
        />
        <motion.div
          class="box small ghost"
          initial={{ x: 0, rotate: 0 }}
          animate={moveTarget}
          transition={{ duration: 0.2 }}
        />
      </div>
    </MotionConfig>
  );
}

function code(library: Library, p: ConfigParams): string {
  const config = `<MotionConfig\n  transition={${literal(transitionOf(p), 1)}}${p.skip ? "\n  skipAnimations" : ""}\n>`;
  const body = `${config}\n  <motion.div initial={{ x: 0, rotate: 0 }} animate={${literal(moveTarget)}} />\n  <motion.div\n    initial={{ x: 0, rotate: 0 }}\n    animate={${literal(moveTarget)}}\n    transition={{ duration: 0.2 }}\n  />\n</MotionConfig>`;
  return withImport(library, ["MotionConfig", "motion"], body);
}

export default defineDemo<ConfigParams>({
  id: "config",
  title: "MotionConfig",
  hint: "The first box sets no transition and takes the one from `MotionConfig`. The second sets its own. `skipAnimations` overrules both.",
  page: "configuration",
  after: "intro",
  defaults: configDefaults,
  controls: [
    { key: "skip", label: "skipAnimations", kind: "toggle" },
    ...transitionControls<ConfigParams>({ delay: false }),
  ],
  Solid: Config,
  React: () => import("./config.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
