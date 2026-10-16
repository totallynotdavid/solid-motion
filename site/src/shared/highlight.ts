import css from "@shikijs/langs/css";
import json from "@shikijs/langs/json";
import shellscript from "@shikijs/langs/shellscript";
import tsx from "@shikijs/langs/tsx";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const theme = {
  name: "solid-motion",
  type: "light" as const,
  colors: { "editor.foreground": "var(--code-fg)" },
  settings: [
    { settings: { foreground: "var(--code-fg)" } },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--code-comment)" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "var(--code-punct)" },
    },
    {
      scope: [
        "keyword",
        "storage",
        "keyword.control",
        "constant.language",
        "variable.language",
      ],
      settings: { foreground: "var(--code-keyword)" },
    },
    {
      scope: ["string", "punctuation.definition.string"],
      settings: { foreground: "var(--code-string)" },
    },
    {
      scope: ["constant.numeric", "keyword.other.unit"],
      settings: { foreground: "var(--code-number)" },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call entity.name.function",
      ],
      settings: { foreground: "var(--code-fn)" },
    },
    {
      scope: [
        "entity.name.tag",
        "support.class.component",
        "entity.name.type",
        "support.type",
      ],
      settings: { foreground: "var(--code-tag)" },
    },
    {
      scope: ["entity.other.attribute-name", "support.type.property-name"],
      settings: { foreground: "var(--code-attr)" },
    },
  ],
};

const highlighter = createHighlighterCoreSync({
  themes: [theme],
  langs: [...tsx, ...css, ...json, ...shellscript],
  engine: createJavaScriptRegexEngine(),
});

const aliases: Record<string, string> = {
  ts: "tsx",
  typescript: "tsx",
  js: "tsx",
  sh: "shellscript",
  bash: "shellscript",
};

/** Highlighted `<pre>` markup. Unknown languages render as plain text. */
export function highlight(code: string, lang: string): string {
  const resolved = aliases[lang] ?? lang;
  const known = highlighter.getLoadedLanguages().includes(resolved);
  return highlighter.codeToHtml(code, {
    lang: known ? resolved : "text",
    theme: "solid-motion",
  });
}
