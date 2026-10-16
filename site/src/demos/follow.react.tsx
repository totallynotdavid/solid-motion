/** @jsxImportSource react */
import { motion, useFollowValue, useMotionValue } from "motion/react";

import { transitionOf } from "../playground/params";
import { reach, type FollowParams } from "./follow.config";

export default function Follow({ p }: { p: FollowParams }) {
  const target = useMotionValue(0);
  const x = useFollowValue(target, transitionOf(p));
  return (
    <div className="cluster">
      <button
        type="button"
        className="button small"
        onClick={() => target.set(target.get() === 0 ? reach : 0)}
      >
        Move
      </button>
      <div className="rail">
        <motion.div className="box small" data-probe style={{ x }} />
      </div>
    </div>
  );
}
