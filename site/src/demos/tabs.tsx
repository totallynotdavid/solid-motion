import { motion } from "@totallynotdavid/solid-motion";
import { createSignal, For } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { openTag, withImport, type Library } from "../playground/format";
import { transitionControls, transitionOf } from "../playground/params";
import { tabs, tabsDefaults, type TabsParams } from "./tabs.config";

function Tabs(props: DemoProps<TabsParams>) {
  const [active, setActive] = createSignal("Home");
  const transition = transitionOf(props.p);
  return (
    <nav class="tabbar" data-origin>
      <For each={tabs}>
        {(tab) => (
          <button type="button" class="tab" onClick={() => setActive(tab)}>
            {tab}
            {active() === tab ? (
              <motion.span
                class="underline"
                data-probe
                layoutId="underline"
                transition={transition}
              />
            ) : null}
          </button>
        )}
      </For>
    </nav>
  );
}

function code(library: Library, p: TabsParams): string {
  const mark = openTag(
    "motion.span",
    {
      [library === "solid" ? "class" : "className"]: "underline",
      layoutId: "underline",
      transition: transitionOf(p),
    },
    { selfClose: true, indent: 4 },
  );
  const list =
    library === "solid"
      ? `<For each={tabs}>\n  {(tab) => (\n    <button onClick={() => setActive(tab)}>\n      {tab}\n      {active() === tab ? (\n        ${mark}\n      ) : null}\n    </button>\n  )}\n</For>`
      : `{tabs.map((tab) => (\n  <button key={tab} onClick={() => setActive(tab)}>\n    {tab}\n    {active === tab ? (\n      ${mark}\n    ) : null}\n  </button>\n))}`;
  return withImport(library, ["motion"], list);
}

export default defineDemo<TabsParams>({
  id: "tabs",
  title: "Shared layout",
  hint: "Two elements share a `layoutId`. When one replaces the other, the new one animates from the old one's box.",
  page: "layout",
  after: "layoutid",
  defaults: tabsDefaults,
  controls: transitionControls<TabsParams>({ delay: false }),
  Solid: Tabs,
  React: () => import("./tabs.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
