import { defineDemo } from "../playground/demo";
import { literal, openTag, raw, withImport } from "../playground/format";
import { pathDefaults, rise, type PathParams } from "./path.config";

function code(p: PathParams): string {
  const options = {
    strength: p.strength,
    direction: p.direction === "auto" ? undefined : p.direction,
    rotate: p.rotate ? true : undefined,
  };
  const tag = openTag(
    "motion.div",
    {
      initial: { x: 0, y: 0 },
      animate: { x: p.distance, y: -rise },
      transition: {
        duration: p.duration,
        ease: "easeInOut",
        path: raw("path"),
      },
    },
    { selfClose: true },
  );
  return withImport(
    "react",
    ["arc", "motion"],
    `// Create it once so it can keep its state between renders.\nconst path = arc(${literal(options)});\n\n${tag}`,
  );
}

export default defineDemo<PathParams>({
  id: "path",
  title: "Curved path",
  hint: "`path: arc()` bends the move from one point to the next instead of drawing a straight line.",
  page: "animating-elements",
  after: "transitions",
  defaults: pathDefaults,
  gap: "path",
  controls: [
    {
      key: "distance",
      label: "Distance",
      kind: "range",
      min: 80,
      max: 220,
      step: 10,
      unit: "px",
    },
    {
      key: "strength",
      label: "Strength",
      kind: "range",
      min: 0,
      max: 1.5,
      step: 0.1,
    },
    {
      key: "direction",
      label: "Direction",
      kind: "select",
      options: ["auto", "cw", "ccw"],
    },
    { key: "rotate", label: "Follow tangent", kind: "toggle" },
    {
      key: "duration",
      label: "Duration",
      kind: "range",
      min: 0.2,
      max: 3,
      step: 0.1,
      unit: "s",
    },
  ],
  React: () => import("./path.react"),
  code: { react: code },
});
