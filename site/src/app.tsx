import { createMemo, For, Show } from "solid-js";

import { pages } from "./content/pages";
import { DocPage } from "./pages/doc-page";
import { Landing } from "./pages/landing";
import { path } from "./router";

const repository = "https://github.com/totallynotdavid/solid-motion";

function Header() {
  return (
    <header class="site-header">
      <a class="brand" href="/">
        <span class="brand-mark" aria-hidden="true" />
        solid-motion
      </a>
      <nav aria-label="Site">
        <a href={`/${pages[0]?.slug ?? ""}`}>Manual</a>
        <a href={repository} rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}

export function App() {
  const slug = createMemo(() => path().replace(/^\/|\/$/g, ""));
  const page = createMemo(() => pages.find((entry) => entry.slug === slug()));

  return (
    <>
      <a class="skip" href="#content">
        Skip to content
      </a>
      <Header />
      <Show when={slug() !== ""} fallback={<Landing />}>
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
              <a href={`/${entry.slug}`}>{entry.title}</a>
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}
