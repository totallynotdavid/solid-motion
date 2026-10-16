import { pages } from "./pages";
import type { DocModule } from "./types";

const modules = import.meta.glob<DocModule>("../../../docs/*.md", {
  query: "?doc",
  import: "default",
  eager: true,
});

/** The parsed manual page for a slug, from `docs/<doc>.md`. */
export function docFor(slug: string): DocModule | undefined {
  const page = pages.find((entry) => entry.slug === slug);
  if (!page) return undefined;
  return modules[`../../../docs/${page.slug}.md`];
}
