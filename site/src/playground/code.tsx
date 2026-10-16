import { createSignal, onCleanup, onSettled } from "solid-js";

type Highlight = (code: string, lang: string) => string;

const [highlighter, setHighlighter] = createSignal<Highlight>();
let loading: Promise<void> | undefined;

/** The highlighter is large, so it loads after the first paint. */
function loadHighlighter(): void {
  loading ??= (async () => {
    const module = await import("../shared/highlight");
    setHighlighter(() => module.highlight);
  })();
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function CopyButton(props: { text: () => string; label?: string }) {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  const copy = async () => {
    await copyText(props.text());
    setCopied(true);
    clearTimeout(timer);
    timer = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      class="copy"
      data-copied={copied()}
      aria-label={props.label ?? "Copy code"}
      onClick={copy}
    >
      {copied() ? "Copied" : "Copy"}
    </button>
  );
}

export function Code(props: { code: string; lang?: string }) {
  onSettled(loadHighlighter);
  const html = () => {
    const highlight = highlighter();
    return highlight
      ? highlight(props.code, props.lang ?? "tsx")
      : `<pre class="shiki"><code>${escapeHtml(props.code)}</code></pre>`;
  };

  return (
    <figure class="code" data-lang={props.lang ?? "tsx"}>
      <CopyButton text={() => props.code} />
      <div innerHTML={html()} />
    </figure>
  );
}
