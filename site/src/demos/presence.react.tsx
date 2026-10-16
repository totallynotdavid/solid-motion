/** @jsxImportSource react */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { transitionOf } from "../playground/params";
import { presenceProps, type PresenceParams } from "./presence.config";

export default function Presence({ p }: { p: PresenceParams }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="cluster">
      <button
        type="button"
        className="button small"
        onClick={() => setOpen((value) => !value)}
      >
        Toggle
      </button>
      <div className="slot">
        <AnimatePresence>
          {open && (
            <motion.div
              className="box"
              data-probe
              {...presenceProps(p)}
              transition={transitionOf(p)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
