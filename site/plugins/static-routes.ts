import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { Plugin } from "vite";

import { manualIndex, readManual } from "./manual.ts";

/**
 * The site routes on the History API. A static host serves `/docs/variants`
 * only if a file answers it. The build copies the entry page to
 * `docs/variants.html` for the URL without a slash, and to
 * `docs/variants/index.html` for the URL with one.
 */
export function staticRoutes(): Plugin {
  let outDir = "";
  let index = "";
  return {
    name: "solid-motion-static-routes",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      index = manualIndex(config.root);
    },
    closeBundle() {
      const entry = join(outDir, "index.html");
      for (const page of readManual(index)) {
        const route = join(outDir, "docs", page.slug);
        mkdirSync(route, { recursive: true });
        copyFileSync(entry, `${route}.html`);
        copyFileSync(entry, join(route, "index.html"));
      }
      copyFileSync(entry, join(outDir, "404.html"));
    },
  };
}
