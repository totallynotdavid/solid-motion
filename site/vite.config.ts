import { fileURLToPath } from "node:url";

import solid from "@solidjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { docs } from "./plugins/docs.ts";
import { staticRoutes } from "./plugins/static-routes.ts";

const reactFiles = /\.react\.tsx$/;

export default defineConfig({
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
});
