/** GitHub Pages serves a project site under `/<repository>/`. */
export const base = "/solid-motion/";

/** The URL of a manual page. The pages live under `docs/`. */
export const pageUrl = (slug: string) => `${base}docs/${slug}`;
