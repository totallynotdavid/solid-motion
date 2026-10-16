/** @jsxImportSource react */
import { motion } from "motion/react";

import { entranceProps, type EntranceParams } from "./entrance.config";

export default function Entrance({ p }: { p: EntranceParams }) {
  return <motion.div className="box" data-probe {...entranceProps(p)} />;
}
