import { defineDemo } from "../playground/demo";
import { literal, raw, withImport } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import { valueDefaults, type ValueParams } from "./value.config";

function code(p: ValueParams): string {
  const options = { ...transitionOf(p), onUpdate: raw("setValue") };
  return withImport(
    "react",
    ["animate"],
    `const [value, setValue] = useState(0);\n\nuseEffect(() => {\n  const controls = animate(0, ${p.to}, ${literal(options, 1)});\n  return () => controls.stop();\n}, []);\n\n<output>{Math.round(value)}</output>`,
  );
}

export default defineDemo<ValueParams>({
  id: "animate-value",
  title: "Animate a number",
  hint: "`animate(from, to, options)` drives a plain number and calls `onUpdate` on every frame.",
  page: "create-animate",
  after: "controls",
  defaults: valueDefaults,
  gap: "animate-value",
  controls: [
    { key: "to", label: "To", kind: "range", min: 10, max: 500, step: 10 },
    ...transitionControls<ValueParams>({ delay: false }),
  ],
  React: () => import("./value.react"),
  code: { react: code },
});
