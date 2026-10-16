import { readFileSync } from "node:fs";

import { Marked, type Tokens } from "marked";
import type { Plugin } from "vite";

import type { DocModule, PageEntry } from "../src/content/types.ts";
import { highlight } from "../src/shared/highlight.ts";
import { manualIndex, readManual } from "./manual.ts";

const sourceUrl =
  "https://github.com/totallynotdavid/solid-motion/blob/main/docs/";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** A link to another manual page becomes a route. Anything else stays. */
function rewriteHref(href: string, pages: PageEntry[]): string {
  const match = /^([a-z-]+)\.md(#.*)?$/.exec(href);
  if (!match) return href;
  const [, name = "", hash = ""] = match;
  const page = pages.find((entry) => entry.slug === name);
  return page ? `/${page.slug}${hash}` : `${sourceUrl}${name}.md${hash}`;
}

function render(markdown: string, pages: PageEntry[]): DocModule {
  const ids = new WeakMap<Tokens.Heading, string>();
  const marked = new Marked({
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? "text").split(/\s/)[0] ?? "text";
        return `<figure class="code" data-lang="${escapeHtml(language)}"><button class="copy" type="button">Copy</button>${highlight(text, language)}</figure>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const target = rewriteHref(href, pages);
        const external = /^https?:/.test(target);
        const attrs = [
          `href="${escapeHtml(target)}"`,
          title ? `title="${escapeHtml(title)}"` : "",
          external ? 'rel="noreferrer"' : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<a ${attrs}>${this.parser.parseInline(tokens)}</a>`;
      },
      table(token: Tokens.Table) {
        const cell = (entry: Tokens.TableCell, tag: string) => {
          const align = entry.align ? ` style="text-align:${entry.align}"` : "";
          return `<${tag}${align}>${this.parser.parseInline(entry.tokens)}</${tag}>`;
        };
        const head = token.header.map((entry) => cell(entry, "th")).join("");
        const body = token.rows
          .map(
            (row) =>
              `<tr>${row.map((entry) => cell(entry, "td")).join("")}</tr>`,
          )
          .join("");
        return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
      },
      heading(token: Tokens.Heading) {
        const { tokens, depth, text } = token;
        const id = ids.get(token) ?? slugify(text);
        const inner = this.parser.parseInline(tokens);
        if (depth === 1) return `<h1 id="${id}">${inner}</h1>\n`;
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}">${inner}</a></h${depth}>\n`;
      },
    },
  });

  type Token = ReturnType<typeof marked.lexer>[number];
  const isHeading = (token: Token): token is Tokens.Heading =>
    token.type === "heading";
  const intro: Token[] = [];
  const groups: { id: string; title: string; tokens: Token[] }[] = [];
  let title = "";

  const lexed = marked.lexer(markdown);
  const used = new Map<string, number>();
  for (const token of lexed) {
    if (!isHeading(token)) continue;
    const base = slugify(token.text.replaceAll("`", ""));
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    ids.set(token, count === 0 ? base : `${base}-${count}`);
  }

  for (const token of lexed) {
    if (isHeading(token) && token.depth === 1 && !title) {
      title = token.text.replaceAll("`", "");
    } else if (isHeading(token) && token.depth === 2) {
      groups.push({
        id: ids.get(token) ?? "",
        title: token.text.replaceAll("`", ""),
        tokens: [token],
      });
    } else {
      (groups.at(-1)?.tokens ?? intro).push(token);
    }
  }

  const result: DocModule = {
    title,
    intro: marked.parser(intro),
    sections: groups.map((group) => ({
      id: group.id,
      title: group.title,
      html: marked.parser(group.tokens),
    })),
  };
  return result;
}

const virtualManual = "virtual:manual";

/**
 * Serves `docs/<name>.md?doc` as a parsed module, and `virtual:manual` as the
 * page list from `docs/README.md`. The site renders the manual from the same
 * files the repository publishes.
 */
export function docs(): Plugin {
  let index = "";
  return {
    name: "solid-motion-docs",
    configResolved(config) {
      index = manualIndex(config.root);
    },
    resolveId(id) {
      return id === virtualManual ? `\0${virtualManual}` : null;
    },
    load(id) {
      if (id === `\0${virtualManual}`) {
        this.addWatchFile(index);
        return `export const pages = ${JSON.stringify(readManual(index))};`;
      }
      if (!id.endsWith(".md?doc")) return null;
      const file = id.slice(0, -"?doc".length);
      this.addWatchFile(file);
      this.addWatchFile(index);
      const module = render(readFileSync(file, "utf8"), readManual(index));
      return `export default ${JSON.stringify(module)};`;
    },
  };
}
