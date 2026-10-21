# Contributing

[mise](https://mise.jdx.dev) installs Bun and Node at the versions in
[`mise.toml`](../mise.toml), and runs every task. Install the dependencies:

```sh
mise run install
```

Run every check before you open a pull request:

```sh
mise run check
```

It runs these tasks:

| Task                  | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `mise run lint`       | `oxlint` with warnings as errors, and `oxfmt --check`.   |
| `mise run typecheck`  | `tsc --noEmit` over the library, its tests and the site. |
| `mise run test`       | `vitest run`.                                            |
| `mise run build`      | `tsc` writes the declarations to `dist`.                 |
| `mise run check:site` | Builds the site and tests it in Chromium (see below).    |

`mise run fix` applies the safe lint fixes and formats code and Markdown.

## Site

`site/` is the documentation site. It renders the manual from `docs/` and runs
each demo twice, once with solid-motion and once with `motion/react`, with the
same controls.

```sh
bun run --filter solid-motion-site dev    # dev server on localhost:5173
bun run --filter solid-motion-site build  # static files in site/dist
```

The tests drive every demo in Chromium. `mise run check:site` installs the
browser first. Install it alone with:

```sh
mise run install:browsers
```

A demo is three files in `site/src/demos`: `<name>.config.ts` for its
parameters, `<name>.tsx` for the solid-motion version and its code, and
`<name>.react.tsx` for the `motion/react` twin. Register it in
`site/src/demos/index.ts` and add a probe for it in `site/tests/probes.ts`. A
probe says where the demo ends and which control changes the result. A test
fails when a demo on a page has no probe.

When solid-motion cannot do what a demo shows, leave out `Solid` and set `gap`
to an entry in `site/src/gaps.ts`. The page then marks the solid-motion side
"not yet", and the tests drive only the `motion/react` side. When the capability
ships, delete the entry, add `Solid` and drop `gap`. The tests then drive both
sides with the same probe.

## Tests

Tests run on jsdom. `tests/clock.ts` fakes the clock and the frame loop, so an
animation's progress depends only on how far the test advances the clock. Use
`useFakeClock()` in a suite and `await advance(ms)` to move time forward.

jsdom does no layout. A layout test gives each element a box, as
`tests/layout.test.tsx` does.

A test drives the behavior through `motion.*` or one of the `create*` functions,
and checks what the element looks like. It does not mock `motion-dom`.

## Docs

The manual is in [`docs/`](../docs/README.md). Each page has an example. Run an
example before you change the text around it.

`mise run fix` formats the Markdown.

For the code layout, read [Architecture](../docs/architecture.md).

## Releases

Maintainers publish with a tag. See [Releasing](releasing.md). A push to `main`
that changes the site publishes it. See [Deploying the site](deploying.md).
