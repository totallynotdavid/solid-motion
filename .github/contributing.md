# Contributing

Install the dependencies with [Bun](https://bun.sh):

```sh
bun install
```

Run every check before you open a pull request:

```sh
bun run check
```

It runs these steps in order, and stops at the first one that fails:

| Script                 | What it does                                           |
| ---------------------- | ------------------------------------------------------ |
| `bun run typecheck`    | `tsc --noEmit` over `src` and `tests`.                 |
| `bun run lint`         | `oxlint`, with warnings treated as errors.             |
| `bun run check:format` | `oxfmt --check` for code, `prettier --check` for docs. |
| `bun run test`         | `vitest run`.                                          |
| `bun run build`        | `tsc` writes the declarations to `dist`.               |
| `bun run check:site`   | Type-checks, builds and tests the site (see below).    |

`bun run format` fixes the formatting.

## Site

`site/` is the documentation site. It renders the manual from `docs/` and runs
each demo twice, once with solid-motion and once with `motion/react`, with the
same controls.

```sh
bun run --filter solid-motion-site dev    # dev server on localhost:5173
bun run --filter solid-motion-site build  # static files in site/dist
```

The tests drive every demo in Chromium. Install the browser once:

```sh
cd site && bunx playwright install chromium
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

Format changed Markdown files with:

```sh
bunx prettier --print-width 80 --prose-wrap always --write docs/animating-elements.md
```

For the code layout, read [Architecture](../docs/architecture.md).
