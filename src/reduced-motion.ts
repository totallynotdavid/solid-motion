import { createSignal, type Accessor } from "solid-js";

/**
 * One listener per document, installed at module load rather than per element.
 * The signal is written from a media-query event, never during render. On the
 * server the query is absent and the value stays `false`. That cannot desync
 * hydration, because the preference only selects a transition and never an
 * initial style.
 */
const query =
  typeof window === "undefined"
    ? undefined
    : window.matchMedia?.("(prefers-reduced-motion: reduce)");

const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(
  query?.matches ?? false,
);

query?.addEventListener("change", (event) =>
  setPrefersReducedMotion(event.matches),
);

/** The device's reduced-motion preference, as a reactive accessor. */
export function useReducedMotion(): Accessor<boolean> {
  return prefersReducedMotion;
}
