import solid from "@solidjs/vite-plugin";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  resolve: { conditions: ["development", "browser"] },
  test: {
    environment: "jsdom",
    globals: true,
    // The site's specs are Playwright specs. `site/` runs them.
    exclude: [...configDefaults.exclude, "site/**"],
  },
});
