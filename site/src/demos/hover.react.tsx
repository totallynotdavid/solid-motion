/** @jsxImportSource react */
import { motion } from "motion/react";

import { hoverProps, type HoverParams } from "./hover.config";

export default function Hover({ p }: { p: HoverParams }) {
  return (
    <motion.button
      type="button"
      className="box press"
      data-probe
      {...hoverProps(p)}
    >
      Press
    </motion.button>
  );
}
