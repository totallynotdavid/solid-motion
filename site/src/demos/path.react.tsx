/** @jsxImportSource react */
import { arc, motion } from "motion/react";
import { useMemo } from "react";

import { rise, type PathParams } from "./path.config";

export default function Path({ p }: { p: PathParams }) {
  const path = useMemo(
    () =>
      arc({
        strength: p.strength,
        direction: p.direction === "auto" ? undefined : p.direction,
        rotate: p.rotate,
      }),
    [p],
  );
  return (
    <div className="runway">
      <motion.div
        className="box small"
        data-probe
        initial={{ x: 0, y: 0 }}
        animate={{ x: p.distance, y: -rise }}
        transition={{ duration: p.duration, ease: "easeInOut", path }}
      />
    </div>
  );
}
