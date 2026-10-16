import { AnimatePresence, motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport, type Library } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import {
  presenceDefaults,
  presenceProps,
  type PresenceParams,
} from "./presence.config";

function Presence(props: DemoProps<PresenceParams>) {
  const [open, setOpen] = createSignal(true);
  const settings = presenceProps(props.p);
  const transition = transitionOf(props.p);
  return (
    <div class="cluster">
      <button
        type="button"
        class="button small"
        onClick={() => setOpen((value) => !value)}
      >
        Toggle
      </button>
      <div class="slot">
        <AnimatePresence when={open()}>
          {() => (
            <motion.div
              class="box"
              data-probe
              initial={settings.initial}
              animate={settings.animate}
              exit={settings.exit}
              transition={transition}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function code(library: Library, p: PresenceParams): string {
  const solid = library === "solid";
  const box = openTag(
    "motion.div",
    { ...presenceProps(p), transition: transitionOf(p) },
    { selfClose: true, indent: solid ? 3 : 2 },
  );
  const body = solid
    ? `<AnimatePresence when={open()}>\n  {() => (\n    ${box}\n  )}\n</AnimatePresence>`
    : `<AnimatePresence>\n  {open && (\n    ${box}\n  )}\n</AnimatePresence>`;
  return withImport(library, ["AnimatePresence", "motion"], body);
}

export default defineDemo<PresenceParams>({
  id: "presence",
  title: "Exit animation",
  hint: "Toggle the box. It stays mounted while `exit` plays, then the boundary removes it.",
  page: "presence",
  after: "animatepresence",
  defaults: presenceDefaults,
  controls: [
    {
      key: "exit",
      label: "exit",
      kind: "select",
      options: ["fade", "slide", "shrink"],
    },
    ...transitionControls<PresenceParams>({ delay: false }),
  ],
  Solid: Presence,
  React: () => import("./presence.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
