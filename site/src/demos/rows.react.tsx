/** @jsxImportSource react */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { transitionOf } from "../playground/params";
import { rowExit, rowLabels, type RowsParams } from "./rows.config";

export default function Rows({ p }: { p: RowsParams }) {
  const [items, setItems] = useState(rowLabels);
  return (
    <ul className="rows">
      <AnimatePresence mode={p.mode}>
        {items.map((label) => (
          <motion.li
            key={label}
            className="row"
            data-probe
            layout
            exit={rowExit}
            transition={transitionOf(p)}
          >
            <span>{label}</span>
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={() =>
                setItems((list) => list.filter((entry) => entry !== label))
              }
            >
              ×
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
