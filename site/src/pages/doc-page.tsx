import { createEffect, For, Show } from "solid-js";

import { pageUrl } from "../../base";
import { docFor } from "../content/docs";
import { pages, type PageEntry } from "../content/pages";
import { demos } from "../demos";
import { Sidebar } from "./sidebar";

const sourceUrl =
  "https://github.com/totallynotdavid/solid-motion/blob/main/docs/";

function Demos(props: { slug: string; after: string }) {
  return (
    <For
      each={demos.filter(
        (demo) => demo.page === props.slug && demo.after === props.after,
      )}
    >
      {(demo) => demo.view()}
    </For>
  );
}

export function DocPage(props: { page: PageEntry }) {
  const doc = () => docFor(props.page.slug);
  createEffect(
    () => props.page.title,
    (title) => {
      document.title = `${title} · solid-motion`;
    },
  );
  const index = () =>
    pages.findIndex((entry) => entry.slug === props.page.slug);
  const previous = () => pages[index() - 1];
  const next = () => pages[index() + 1];

  return (
    <div class="doc-layout">
      <Sidebar current={props.page.slug} />
      <main id="content" class="doc">
        <Show when={doc()}>
          {(module) => (
            <>
              <h1>{module().title}</h1>
              <div class="prose" innerHTML={module().intro} />
              <Demos slug={props.page.slug} after="intro" />
              <For each={module().sections}>
                {(section) => (
                  <>
                    <div class="prose" innerHTML={section.html} />
                    <Demos slug={props.page.slug} after={section.id} />
                  </>
                )}
              </For>
            </>
          )}
        </Show>
        <footer class="doc-footer">
          <a href={`${sourceUrl}${props.page.slug}.md`} rel="noreferrer">
            Edit this page on GitHub
          </a>
          <nav aria-label="Pages">
            <Show when={previous()}>
              {(entry) => (
                <a href={pageUrl(entry().slug)} rel="prev">
                  <span>Previous</span>
                  {entry().title}
                </a>
              )}
            </Show>
            <Show when={next()}>
              {(entry) => (
                <a href={pageUrl(entry().slug)} rel="next">
                  <span>Next</span>
                  {entry().title}
                </a>
              )}
            </Show>
          </nav>
        </footer>
      </main>
      <Show when={doc()}>
        {(module) => (
          <nav class="toc" aria-label="On this page">
            <p>On this page</p>
            <ul>
              <For each={module().sections}>
                {(section) => (
                  <li>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                )}
              </For>
            </ul>
          </nav>
        )}
      </Show>
    </div>
  );
}
