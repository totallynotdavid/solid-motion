import { createScroll, motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

import { defineDemo, type DemoProps } from "../playground/demo";
import { literal, withImport, type Library } from "../playground/format";
import { offsetOf, scrollDefaults, type ScrollParams } from "./scroll.config";

function Scroll(props: DemoProps<ScrollParams>) {
  const [scroller, setScroller] = createSignal<HTMLElement>();
  const [card, setCard] = createSignal<HTMLElement>();
  const { scrollYProgress } = createScroll({
    container: scroller,
    target: card,
    offset: offsetOf(props.p.offset),
  });
  return (
    <div class="scroll-demo">
      <div class="meter">
        <motion.div
          class="meter-fill"
          data-probe
          style={{ scaleX: scrollYProgress }}
        />
      </div>
      <div class="scroller" ref={setScroller}>
        <div class="gap" />
        <div class="card" ref={setCard}>
          Target
        </div>
        <div class="gap" />
      </div>
    </div>
  );
}

function code(library: Library, p: ScrollParams): string {
  const offset = literal(offsetOf(p.offset));
  const body =
    library === "solid"
      ? `const { scrollYProgress } = createScroll({\n  container: scroller,\n  target: card,\n  offset: ${offset},\n});\n\n<motion.div style={{ scaleX: scrollYProgress }} />`
      : `const { scrollYProgress } = useScroll({\n  container: scrollerRef,\n  target: cardRef,\n  offset: ${offset},\n});\n\n<motion.div style={{ scaleX: scrollYProgress }} />`;
  return withImport(
    library,
    [library === "solid" ? "createScroll" : "useScroll", "motion"],
    body,
  );
}

export default defineDemo<ScrollParams>({
  id: "scroll-progress",
  title: "Scroll progress",
  hint: "Scroll the list. The bar follows how far the card has travelled between the two offset points.",
  page: "scroll",
  after: "offsets",
  defaults: scrollDefaults,
  height: 200,
  controls: [
    {
      key: "offset",
      label: "offset",
      kind: "select",
      options: ["enter", "any", "exit", "contain"],
    },
  ],
  Solid: Scroll,
  React: () => import("./scroll.react"),
  code: { solid: (p) => code("solid", p), react: (p) => code("react", p) },
});
