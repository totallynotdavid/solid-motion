# Releasing

Pushing a tag `vX.Y.Z` publishes that version to npm. The
[release workflow](workflows/release.yml) runs `bun run check`, publishes
through npm trusted publishing, then creates a GitHub release with generated
notes. No npm token is stored in the repository.

## Release a version

1. Set `version` in `package.json` to `X.Y.Z` and merge it into `main`.
2. Tag the merge commit and push the tag:

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. Watch the `release` run in the Actions tab. If the `npm` environment has
   required reviewers, approve the `Publish to npm` job when it waits.

The first job fails at once when the tag differs from `package.json`. Fix the
version, delete the tag (`git push origin :refs/tags/vX.Y.Z`) and tag again. npm
never accepts the same version twice, so a version that published cannot be
re-released. Bump it instead.

## One-time setup

Do this once per package, and again in a fork that publishes under its own name.

### 1. Publish the package once

Trusted publishing is configured on an existing package. Publish the first
version by hand with `npm publish --access public`, logged in as the owner.

### 2. Create the GitHub environment

1. In the repository, open Settings, then Environments, then New environment.
2. Name it `npm`. The workflow's publish job names this environment.
3. Optionally add required reviewers, so a person approves each publish.

The environment holds no secrets and no variables.

### 3. Add the trusted publisher on npm

Either open the package on npmjs.com, then Settings, then Trusted Publisher,
choose GitHub Actions and enter these values:

| Field        | Value                       |
| ------------ | --------------------------- |
| Organization | the owner of the repository |
| Repository   | the repository name         |
| Workflow     | `release.yml`               |
| Environment  | `npm`                       |

Or run the same from a terminal, logged in as a package owner:

```sh
npm trust github @totallynotdavid/solid-motion \
  --file release.yml --repo totallynotdavid/solid-motion --env npm
```

`npm trust list @totallynotdavid/solid-motion` shows what is set. The values
must match exactly, or the publish fails with an authentication error.

### 4. Check the package metadata

npm records provenance from the repository URL, so `package.json` must carry the
real one:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/<owner>/<repo>.git"
}
```

The repository must be public. Provenance is attached automatically when a
trusted publisher publishes a public package.

## Fork the release

To publish a fork under another name:

1. Change `name`, `repository.url`, `homepage` and `bugs` in `package.json`.
2. In `release.yml`, change the `if:` on the `publish` job to the fork owner's
   name, and the environment `url` to the new package page.
3. Do the one-time setup above for the new package.
