/** @jsxImportSource react */
import { MotionConfig } from "motion/react";
import type { ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

/** Renders a React demo into `element` and returns the function that removes it. */
export function mount<P>(
  element: HTMLElement,
  Demo: ComponentType<{ p: P }>,
  p: P,
  reduced: boolean,
): () => void {
  const root = createRoot(element);
  flushSync(() =>
    root.render(
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>
        <Demo p={p} />
      </MotionConfig>,
    ),
  );
  return () => root.unmount();
}
