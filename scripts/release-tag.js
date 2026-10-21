import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const tag = process.env.GITHUB_REF_NAME ?? "";

if (tag.replace(/^v/, "") !== version) {
  console.error(`Tag ${tag} != package.json ${version}`);
  process.exit(1);
}
