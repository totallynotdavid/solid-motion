/** @jsxImportSource react */
import { MotionConfig, motion } from "motion/react";

import { transitionOf } from "../playground/params";
import { moveTarget, type ConfigParams } from "./config.config";

export default function Config({ p }: { p: ConfigParams }) {
  return (
    <MotionConfig transition={transitionOf(p)} skipAnimations={p.skip}>
      <div className="duo">
        <motion.div
          className="box small"
          data-probe
          initial={{ x: 0, rotate: 0 }}
          animate={moveTarget}
        />
        <motion.div
          className="box small ghost"
          initial={{ x: 0, rotate: 0 }}
          animate={moveTarget}
          transition={{ duration: 0.2 }}
        />
      </div>
    </MotionConfig>
  );
}
