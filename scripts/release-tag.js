// The tag check applies only to tag runs. The notes check applies to every run
// so pull requests validate the release notes before publication.
import { readFileSync } from "node:fs";

const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));
const problems = [];

if (process.env.GITHUB_REF_TYPE === "tag") {
  const tag = process.env.GITHUB_REF_NAME ?? "";
  if (tag.replace(/^v/, "") !== version) {
    problems.push(`Tag ${tag} != package.json ${version}`);
  }
}

const expected = `${name} ${version} is out.`;
const [first] = readFileSync(".github/release-notes.md", "utf8").split("\n");
if (first !== expected) {
  problems.push(
    `.github/release-notes.md starts with "${first}", expected "${expected}"`,
  );
}

for (const problem of problems) console.error(problem);
if (problems.length) process.exit(1);
