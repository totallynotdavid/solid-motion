import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { Plugin } from "vite";

import { manualIndex, readManual } from "./manual.ts";

/**
 * The site routes on the History API. A static host serves `/variants` only if
 * a file answers it, so the build copies the entry page to every route.
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
        const dir = join(outDir, page.slug);
        mkdirSync(dir, { recursive: true });
        copyFileSync(entry, join(dir, "index.html"));
      }
      copyFileSync(entry, join(outDir, "404.html"));
    },
  };
}
