/** @jsxImportSource react */
import { useAnimate } from "motion/react";
import { useEffect } from "react";

import { dots, type OverlapParams } from "./overlap.config";

export default function Overlap({ p }: { p: OverlapParams }) {
  const [scope, animate] = useAnimate();
  useEffect(() => {
    const controls = animate(
      dots.map(
        (dot, index) =>
          [
            dot,
            { x: p.distance },
            {
              duration: p.duration,
              ease: p.ease,
              at: index === 0 || p.overlap === 0 ? undefined : `-${p.overlap}`,
            },
          ] as const,
      ),
    );
    return () => controls.stop();
  }, [animate, p]);
  return (
    <div className="dots" ref={scope}>
      <span className="dot a" data-probe />
      <span className="dot b" data-probe />
      <span className="dot c" data-probe />
    </div>
  );
}
