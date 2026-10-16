import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Marked, type Tokens } from "marked";

import type { PageEntry } from "../src/content/types.ts";

/** `docs/README.md`, relative to the site's root. */
export const manualIndex = (root: string): string =>
  resolve(root, "../docs/README.md");

/**
 * The pages of the manual in the order `docs/README.md` numbers them. Each
 * list item is a link to `<slug>.md`, and the link text is the page title.
 */
export function readManual(file: string): PageEntry[] {
  const list = new Marked()
    .lexer(readFileSync(file, "utf8"))
    .find((token): token is Tokens.List => token.type === "list");
  if (!list) throw new Error(`${file} has no list of pages`);

  return list.items.map((item) => {
    const link = item.tokens
      .flatMap((token) => (token.type === "text" ? (token.tokens ?? []) : []))
      .find((token): token is Tokens.Link => token.type === "link");
    const slug = /^([a-z-]+)\.md$/.exec(link?.href ?? "")?.[1];
    if (!link || !slug) {
      throw new Error(`${file}: "${item.text}" does not link to a page`);
    }
    return { slug, title: link.text };
  });
}
