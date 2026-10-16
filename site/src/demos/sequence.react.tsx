/** @jsxImportSource react */
import { useAnimate } from "motion/react";
import { useEffect } from "react";

import { dots, type SequenceParams } from "./sequence.config";

export default function Sequence({ p }: { p: SequenceParams }) {
  const [scope, animate] = useAnimate();
  useEffect(() => {
    const controls = animate(
      dots.map(
        (dot) =>
          [
            dot,
            { x: p.distance },
            { duration: p.duration, ease: p.ease },
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
