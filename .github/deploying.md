# Deploying the site

The [pages workflow](workflows/pages.yml) builds `site/` and publishes
`site/dist` to GitHub Pages. It runs on every push to `main` that changes the
site, the library source, the manual, the lockfile or the workflow. Run it by
hand from the Actions tab with "Run workflow".

The site is served at `https://<owner>.github.io/<repository>/`. For this
repository that is <https://totallynotdavid.github.io/solid-motion/>.

## One-time setup

Do this once per repository, and again in a fork.

1. Open the repository on GitHub, then Settings, then Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Open Settings, then Environments. Pages creates the `github-pages`
   environment on first use. If you restrict its deployment branches, allow
   `main`.
4. Run the `pages` workflow once from the Actions tab.
5. Open the repository page, click the gear next to About, and set Website to
   the site URL.

The workflow stores no secret. The `deploy` job asks GitHub for a short-lived
token with the `pages: write` and `id-token: write` permissions.

## Build locally

```sh
bun run build:site
```

This writes `site/dist`. To look at it as Pages serves it:

```sh
cd site
bunx vite preview --port 4173
```

Open <http://localhost:4173/solid-motion/>. The preview serves files only, as
Pages does. A path with no file answers 404.

## Base path

[`site/base.ts`](../site/base.ts) holds the path the site is served under. Vite,
the router, the manual's links and the browser tests all read it, so it is the
only place to change.

Manual pages live at `/solid-motion/docs/<page>`. The build writes two HTML
files per page, such as `site/dist/docs/variants.html` and
`site/dist/docs/variants/index.html`, plus `404.html`. The first answers the URL
without a trailing slash, the second the URL with one, so a link to a page opens
directly either way.

## Fork the site

1. Set `base` in `site/base.ts` to `/<your-repository>/`.
2. In the fork, repeat the one-time setup. Pages is off in a new fork.
3. Change the repository links in `site/src/app.tsx`,
   `site/src/pages/doc-page.tsx` and `site/plugins/docs.ts` to the fork.

For a user or organization site served at the domain root, set `base` to `/`.
