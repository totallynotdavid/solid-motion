import { For } from "solid-js";

import { pageUrl } from "../../base";
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
                href={pageUrl(entry.slug)}
                aria-current={props.current === entry.slug ? "page" : undefined}
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
