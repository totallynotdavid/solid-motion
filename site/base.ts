/** GitHub Pages serves a project site under `/<repository>/`. */
export const base = "/solid-motion/";

/** The URL of a manual page. The pages live under `docs/`. */
export const pageUrl = (slug: string) => `${base}docs/${slug}`;

/** The slug of the manual page a pathname names, if it names one. */
export function pageSlug(pathname: string): string | undefined {
  const prefix = pageUrl("");
  return pathname.startsWith(prefix)
    ? pathname.slice(prefix.length).replace(/\/$/, "")
    : undefined;
}
