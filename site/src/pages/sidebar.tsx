import { For } from "solid-js";

import { pages } from "../content/pages";

export function Sidebar(props: { current: string }) {
  return (
    <nav class="sidebar" aria-label="Manual">
      <p>Manual</p>
      <ul>
        <For each={pages}>
          {(entry) => (
            <li>
              <a
                href={`/${entry.slug}`}
                aria-current={
                  props.current.replace(/^\/|\/$/g, "") === entry.slug
                    ? "page"
                    : undefined
                }
              >
                {entry.title}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
