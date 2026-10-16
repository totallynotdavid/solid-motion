/** @jsxImportSource react */
import { motion } from "motion/react";
import { useState } from "react";

import { transitionOf } from "../playground/params";
import type { SwitchParams } from "./switch.config";

export default function Switch({ p }: { p: SwitchParams }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Switch"
      className={on ? "track on" : "track"}
      data-origin
      onClick={() => setOn((value) => !value)}
    >
      <motion.span
        className="knob"
        data-probe
        layout
        transition={transitionOf(p)}
      />
    </button>
  );
}
