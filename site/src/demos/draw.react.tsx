/** @jsxImportSource react */
import { motion } from "motion/react";

import { curve, drawProps, type DrawParams } from "./draw.config";

export default function Draw({ p }: { p: DrawParams }) {
  return (
    <svg className="draw" viewBox="0 0 240 100" aria-hidden="true">
      <motion.path d={curve} data-probe {...drawProps(p)} />
    </svg>
  );
}
