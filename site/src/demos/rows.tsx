import { AnimatePresenceList, motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, raw, withImport, type Library } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import {
  rowExit,
  rowLabels,
  rowsDefaults,
  type RowsParams,
} from "./rows.config";

function Rows(props: DemoProps<RowsParams>) {
  const [items, setItems] = createSignal(rowLabels);
  const transition = transitionOf(props.p);
  return (
    <ul class="rows">
      <AnimatePresenceList
        each={items()}
        getKey={(label) => label}
        mode={props.p.mode}
      >
        {(label) => (
          <motion.li
            class="row"
            data-probe
            layout
            exit={rowExit}
            transition={transition}
          >
            <span>{label()}</span>
            <button
              type="button"
              aria-label={`Remove ${label()}`}
              onClick={() =>
                setItems((list) => list.filter((entry) => entry !== label()))
              }
            >
              ×
            </button>
          </motion.li>
        )}
      </AnimatePresenceList>
    </ul>
  );
}

function code(library: Library, p: RowsParams): string {
  const solid = library === "solid";
  const row = openTag(
    "motion.li",
    {
      key: solid ? undefined : raw("label"),
      layout: true,
      exit: rowExit,
      transition: transitionOf(p),
    },
    { indent: 2 },
  );
  const body = solid
    ? `<AnimatePresenceList each={items()} getKey={(label) => label} mode="${p.mode}">\n  {(label) => (\n    ${row}\n      {label()}\n    </motion.li>\n  )}\n</AnimatePresenceList>`
    : `<AnimatePresence mode="${p.mode}">\n  {items.map((label) => (\n    ${row}\n      {label}\n    </motion.li>\n  ))}\n</AnimatePresence>`;
  return withImport(
    library,
    [solid ? "AnimatePresenceList" : "AnimatePresence", "motion"],
    body,
  );
}

export default defineDemo<RowsParams>({
  id: "rows",
  title: "Exit in a list",
  hint: "Remove a row. With `popLayout` the row leaves the flow at once, so its neighbours move up while it fades.",
  page: "presence",
  after: "animatepresencelist",
  defaults: rowsDefaults,
  height: 220,
  controls: [
    {
      key: "mode",
      label: "mode",
      kind: "select",
      options: ["sync", "popLayout"],
    },
    ...transitionControls<RowsParams>({ delay: false }),
  ],
  Solid: Rows,
  React: () => import("./rows.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
