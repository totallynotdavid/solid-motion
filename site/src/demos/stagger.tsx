import { motion } from "@totallynotdavid/solid-motion";
import { For } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import {
  literal,
  openTag,
  raw,
  withImport,
  type Library,
} from "../playground/format";
import {
  itemTransition,
  itemVariants,
  labels,
  listTransition,
  listVariants,
  staggerDefaults,
  type StaggerParams,
} from "./stagger.config";

function Stagger(props: DemoProps<StaggerParams>) {
  const { p } = props;
  const transition = listTransition(p);
  const own = itemTransition(p);
  return (
    <motion.ul
      class="chips"
      variants={listVariants}
      initial="hidden"
      animate={p.variant}
      transition={transition}
    >
      <For each={labels}>
        {(label) => (
          <motion.li
            class="chip"
            data-probe
            variants={itemVariants}
            transition={own}
          >
            {label}
          </motion.li>
        )}
      </For>
    </motion.ul>
  );
}

function code(library: Library, p: StaggerParams): string {
  const each =
    library === "solid"
      ? `<For each={labels}>\n    {(label) => (\n      <motion.li variants={item} transition={{ duration: ${p.duration} }}>\n        {label}\n      </motion.li>\n    )}\n  </For>`
      : `{labels.map((label) => (\n    <motion.li key={label} variants={item} transition={{ duration: ${p.duration} }}>\n      {label}\n    </motion.li>\n  ))}`;
  const tag = openTag("motion.ul", {
    variants: raw("list"),
    initial: "hidden",
    animate: p.variant,
    transition: listTransition(p),
  });
  return withImport(
    library,
    ["motion"],
    `const list = ${literal(listVariants)};\nconst item = ${literal(itemVariants)};\n\n${tag}\n  ${each}\n</motion.ul>`,
  );
}

export default defineDemo<StaggerParams>({
  id: "stagger",
  title: "Stagger",
  hint: "The parent names the variant. Each child looks it up in its own map and starts a beat after the one before.",
  page: "variants",
  after: "stagger",
  defaults: staggerDefaults,
  height: 190,
  controls: [
    {
      key: "variant",
      label: "Variant",
      kind: "select",
      options: ["hidden", "visible", "raised"],
    },
    {
      key: "stagger",
      label: "staggerChildren",
      kind: "range",
      min: 0,
      max: 0.4,
      step: 0.02,
      unit: "s",
    },
    {
      key: "delayChildren",
      label: "delayChildren",
      kind: "range",
      min: 0,
      max: 1,
      step: 0.05,
      unit: "s",
    },
    {
      key: "direction",
      label: "Direction",
      kind: "select",
      options: ["first", "last"],
    },
    {
      key: "when",
      label: "when",
      kind: "select",
      options: ["none", "beforeChildren", "afterChildren"],
    },
    {
      key: "duration",
      label: "Duration",
      kind: "range",
      min: 0.1,
      max: 1.5,
      step: 0.05,
      unit: "s",
    },
  ],
  Solid: Stagger,
  React: () => import("./stagger.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
