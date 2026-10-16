import { defineDemo } from "../playground/demo";
import { literal, withImport } from "../playground/format";
import { eases } from "../playground/params";
import { dots, overlapDefaults, type OverlapParams } from "./overlap.config";

function code(p: OverlapParams): string {
  const steps = dots
    .map((dot, index) => {
      const options = {
        duration: p.duration,
        ease: p.ease,
        at: index === 0 || p.overlap === 0 ? undefined : `-${p.overlap}`,
      };
      return `    [${literal(dot)}, ${literal({ x: p.distance })}, ${literal(options)}],`;
    })
    .join("\n");
  return withImport(
    "react",
    ["useAnimate"],
    `const [scope, animate] = useAnimate();\n\nuseEffect(() => {\n  animate([\n${steps}\n  ]);\n}, []);\n\n<div ref={scope}>…</div>`,
  );
}

export default defineDemo<OverlapParams>({
  id: "sequence-at",
  title: "Overlapping steps",
  hint: "A third item on each step sets `at`. A negative offset starts the step before the last one ends.",
  page: "create-animate",
  after: "sequences",
  defaults: overlapDefaults,
  gap: "sequence-at",
  controls: [
    {
      key: "overlap",
      label: "Overlap",
      kind: "range",
      min: 0,
      max: 0.45,
      step: 0.05,
      unit: "s",
    },
    {
      key: "duration",
      label: "Step duration",
      kind: "range",
      min: 0.1,
      max: 1.5,
      step: 0.05,
      unit: "s",
    },
    { key: "ease", label: "Easing", kind: "select", options: eases },
    {
      key: "distance",
      label: "Distance",
      kind: "range",
      min: 20,
      max: 160,
      step: 10,
      unit: "px",
    },
  ],
  React: () => import("./overlap.react"),
  code: { react: code },
});
