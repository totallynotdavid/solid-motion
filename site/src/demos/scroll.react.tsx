/** @jsxImportSource react */
import { motion, useScroll } from "motion/react";
import { useRef } from "react";

import { offsetOf, type ScrollParams } from "./scroll.config";

export default function Scroll({ p }: { p: ScrollParams }) {
  const scroller = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: scroller,
    target: card,
    offset: offsetOf(p.offset),
  });
  return (
    <div className="scroll-demo">
      <div className="meter">
        <motion.div
          className="meter-fill"
          data-probe
          style={{ scaleX: scrollYProgress }}
        />
      </div>
      <div className="scroller" ref={scroller}>
        <div className="gap" />
        <div className="card" ref={card}>
          Target
        </div>
        <div className="gap" />
      </div>
    </div>
  );
}
