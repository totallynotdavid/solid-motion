import { createAnimate } from "@totallynotdavid/solid-motion";
import { onSettled } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { literal, withImport, type Library } from "../playground/format";
import { eases } from "../playground/params";
import { dots, sequenceDefaults, type SequenceParams } from "./sequence.config";

function Sequence(props: DemoProps<SequenceParams>) {
  const { p } = props;
  const [scope, animate] = createAnimate();
  onSettled(() => {
    void animate(
      dots.map(
        (dot) =>
          [
            dot,
            {
              x: p.distance,
              transition: { duration: p.duration, ease: p.ease },
            },
          ] as const,
      ),
    );
  });
  return (
    <div class="dots" ref={scope}>
      <span class="dot a" data-probe />
      <span class="dot b" data-probe />
      <span class="dot c" data-probe />
    </div>
  );
}

function code(library: Library, p: SequenceParams): string {
  const solid = library === "solid";
  const steps = dots
    .map((dot) =>
      solid
        ? `  [${literal(dot)}, ${literal({ x: p.distance, transition: { duration: p.duration, ease: p.ease } })}],`
        : `  [${literal(dot)}, ${literal({ x: p.distance })}, ${literal({ duration: p.duration, ease: p.ease })}],`,
    )
    .join("\n");
  const body = solid
    ? `const [scope, animate] = createAnimate();\n\nonSettled(() => animate([\n${steps}\n]));\n\n<div ref={scope}>…</div>`
    : `const [scope, animate] = useAnimate();\n\nuseEffect(() => {\n  animate([\n${steps.replaceAll("\n", "\n  ").replace(/^/, "  ")}\n  ]);\n}, []);\n\n<div ref={scope}>…</div>`;
  return withImport(library, [solid ? "createAnimate" : "useAnimate"], body);
}

export default defineDemo<SequenceParams>({
  id: "sequence",
  title: "A sequence",
  hint: "Each step starts when the one before it ends. The three dots arrive one after another.",
  page: "create-animate",
  after: "sequences",
  defaults: sequenceDefaults,
  controls: [
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
  Solid: Sequence,
  React: () => import("./sequence.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
