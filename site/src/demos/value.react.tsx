/** @jsxImportSource react */
import { animate } from "motion/react";
import { useEffect, useState } from "react";

import { transitionOf } from "../playground/params";
import type { ValueParams } from "./value.config";

export default function Value({ p }: { p: ValueParams }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, p.to, {
      ...transitionOf(p),
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [p]);
  return (
    <div className="cluster">
      <output className="readout" data-probe>
        {Math.round(value)}
      </output>
      <div className="value-bar">
        <div style={{ transform: `scaleX(${Math.min(1, value / p.to)})` }} />
      </div>
    </div>
  );
}
