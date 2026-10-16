/** @jsxImportSource react */
import { motion } from "motion/react";

import { areaSize, dragProps, type DragParams } from "./drag.config";

export default function Drag({ p }: { p: DragParams }) {
  return (
    <div className="area" style={areaSize(p)}>
      <motion.div className="box grab" data-probe {...dragProps(p)} />
    </div>
  );
}
