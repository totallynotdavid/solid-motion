import { fileURLToPath } from "node:url";

import solid from "@solidjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { base } from "./base.ts";
import { docs } from "./plugins/docs.ts";
import { staticRoutes } from "./plugins/static-routes.ts";

const reactFiles = /\.react\.tsx$/;

// Preview serves files like GitHub Pages. MPA mode makes missing routes 404.
export default defineConfig(({ isPreview }) => ({
  base,
  appType: isPreview ? "mpa" : "spa",
  plugins: [
    docs(),
    solid({ exclude: reactFiles }),
    react({ include: reactFiles }),
    staticRoutes(),
  ],
  resolve: {
    alias: {
      "@totallynotdavid/solid-motion": fileURLToPath(
        new URL("../src/index.tsx", import.meta.url),
      ),
    },
  },
  server: { fs: { allow: [".."] } },
}));
