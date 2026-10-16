/** @jsxImportSource react */
import { motion } from "motion/react";

import { keyframesProps, type KeyframesParams } from "./keyframes.config";

export default function Keyframes({ p }: { p: KeyframesParams }) {
  return <motion.div className="box" data-probe {...keyframesProps(p)} />;
}
