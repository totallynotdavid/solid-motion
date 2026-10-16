import { createSignal, flush } from "solid-js";

const [location, setLocation] = createSignal({
  path: window.location.pathname,
  hash: window.location.hash,
});

export const path = () => location().path;

function scrollToHash(hash: string): void {
  const target = hash ? document.getElementById(hash.slice(1)) : null;
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

function navigate(to: string): void {
  const url = new URL(to, window.location.href);
  window.history.pushState(null, "", url);
  setLocation({ path: url.pathname, hash: url.hash });
  flush();
  scrollToHash(url.hash);
}

/** Routes same-origin link clicks through the History API. */
export function startRouter(): void {
  window.addEventListener("popstate", () =>
    setLocation({
      path: window.location.pathname,
      hash: window.location.hash,
    }),
  );
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a");
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
}

/** Scrolls to the URL's hash once the page for it has rendered. */
export function settleHash(): void {
  scrollToHash(window.location.hash);
}
