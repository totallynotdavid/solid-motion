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

`bun run format` fixes the formatting.

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
