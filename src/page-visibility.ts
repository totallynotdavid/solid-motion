import { createSignal, type Accessor } from "solid-js";

/**
 * Like the reduced-motion preference, one module-scope listener serves every
 * reader. The server has no document, so the page counts as visible there and
 * on the first client render alike.
 */
const [pageInView, setPageInView] = createSignal(
  typeof document === "undefined" || document.visibilityState !== "hidden",
);

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () =>
    setPageInView(document.visibilityState !== "hidden"),
  );
}

/**
 * Whether the tab is visible. It turns false while the tab is in the
 * background, which is when a looping animation should stop spending frames.
 */
export function createPageInView(): Accessor<boolean> {
  return pageInView;
}
