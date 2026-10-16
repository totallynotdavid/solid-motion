/** @jsxImportSource react */
import { motion } from "motion/react";

import {
  itemTransition,
  itemVariants,
  labels,
  listTransition,
  listVariants,
  type StaggerParams,
} from "./stagger.config";

export default function Stagger({ p }: { p: StaggerParams }) {
  return (
    <motion.ul
      className="chips"
      variants={listVariants}
      initial="hidden"
      animate={p.variant}
      transition={listTransition(p)}
    >
      {labels.map((label) => (
        <motion.li
          key={label}
          className="chip"
          data-probe
          variants={itemVariants}
          transition={itemTransition(p)}
        >
          {label}
        </motion.li>
      ))}
    </motion.ul>
  );
}
