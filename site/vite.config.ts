import { fileURLToPath } from "node:url";

import { folio } from "@risinghq/folio";
import solid from "@solidjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import pkg from "../package.json" with { type: "json" };
import { base } from "./base.ts";

const reactFiles = /\.react\.tsx$/;

export default defineConfig({
  base,
  plugins: [
    folio({
      title: "solid-motion",
      version: pkg.version,
      description:
        "Animation primitives for Solid 2. Run every example, change its values, and compare it with motion/react.",
      docs: "../docs",
      repository: "https://github.com/totallynotdavid/solid-motion",
      branch: "main",
      islands: "src/islands.ts",
      landing: "landing",
    }),
    solid({ exclude: reactFiles }),
    react({ include: reactFiles }),
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
