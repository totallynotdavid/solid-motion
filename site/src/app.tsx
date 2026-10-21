import { createMemo, For, Show } from "solid-js";

import { base, pageSlug, pageUrl } from "../base";
import { pages } from "./content/pages";
import { DocPage } from "./pages/doc-page";
import { Landing } from "./pages/landing";
import { path } from "./router";

const repository = "https://github.com/totallynotdavid/solid-motion";

function Header() {
  return (
    <header class="site-header">
      <a class="brand" href={base}>
        <span class="brand-mark" aria-hidden="true" />
        solid-motion
      </a>
      <nav aria-label="Site">
        <a href={pageUrl(pages[0]?.slug ?? "")}>Manual</a>
        <a href={repository} rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}

export function App() {
  const home = createMemo(() => path().replace(/\/?$/, "/") === base);
  const page = createMemo(() => {
    const slug = pageSlug(path());
    return pages.find((entry) => entry.slug === slug);
  });

  return (
    <>
      <a class="skip" href="#content">
        Skip to content
      </a>
      <Header />
      <Show when={!home()} fallback={<Landing />}>
        <Show when={page()} fallback={<NotFound />}>
          {(entry) => <DocPage page={entry()} />}
        </Show>
      </Show>
    </>
  );
}

function NotFound() {
  return (
    <main id="content" class="not-found">
      <h1>Page not found</h1>
      <p>These pages exist:</p>
      <ul>
        <For each={pages}>
          {(entry) => (
            <li>
              <a href={pageUrl(entry.slug)}>{entry.title}</a>
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}
