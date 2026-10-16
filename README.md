# solid-motion

Animation for [Solid](https://www.solidjs.com) 2, built on
[`motion-dom`](https://motion.dev), the core of Motion.

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
/>
```

## Install

```sh
npm install @totallynotdavid/solid-motion solid-js@next @solidjs/web@next
```

`solid-js` and `@solidjs/web` are peer dependencies, and both must be version 2.
Solid 2 is a prerelease, so install it from the `next` tag.

The package ships TSX source, so your build must compile Solid JSX inside
`node_modules`. `@solidjs/vite-plugin` does this:

```ts
// vite.config.ts
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [solid()] });
```

For TypeScript, set `"jsx": "preserve"` and `"jsxImportSource": "@solidjs/web"`
in `tsconfig.json`.

## Get started

```tsx
import { render } from "@solidjs/web";
import { createSignal } from "solid-js";
import { motion } from "@totallynotdavid/solid-motion";

function App() {
  const [open, setOpen] = createSignal(true);

  return (
    <>
      <button onClick={() => setOpen((value) => !value)}>Toggle</button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: open() ? 1 : 0.2, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        Fades and slides in on mount
      </motion.div>
    </>
  );
}

render(() => <App />, document.getElementById("root")!);
```

The element starts at `initial`, animates to `animate` on mount, and animates
again each time a signal read inside `animate` changes.

## Features

- `initial`, `animate` and `exit` targets, with keyframes and `"auto"` sizes
- Variants, with stagger and parent-child ordering
- Hover, tap, focus, pan and in-view states, with callbacks
- Drag with constraints, momentum and drag controls, and `Reorder` lists
- Animation controls for starting an animation from an event handler
- Exit animations with `AnimatePresence`, including `popLayout`
- Layout and shared-layout animations, with `LayoutGroup`
- Motion values, derived values, scroll-linked values and velocity
- SVG geometry and path drawing
- Reduced-motion support and a switch that turns all animation off
- Server rendering: the first paint is in the HTML
- `animate()` for elements you do not render yourself

## Manual

The [manual](docs/README.md) has one page per part of the API. Start with
[Animating elements](docs/animating-elements.md).

To work on the package, see [contributing](.github/contributing.md).

## License

[MIT](LICENSE)
