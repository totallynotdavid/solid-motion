# Gestures

`whileHover`, `whilePress`, `whileFocus` and `whileInView` each take a target.
The target applies while the state is active. When the state ends, the element
animates back. See [layers](animating-elements.md#layers) for how states
combine.

```tsx
import { motion } from "@totallynotdavid/solid-motion";

<motion.button
  whileHover={{ scale: 1.05 }}
  whilePress={{ scale: 0.95 }}
  whileFocus={{ outline: "2px solid royalblue" }}
  transition={{ duration: 0.15 }}
>
  Save
</motion.button>;
```

| Prop          | Active while                                                  |
| ------------- | ------------------------------------------------------------- |
| `whileHover`  | A pointer that is not a touch is over the element.            |
| `whilePress`  | The primary pointer button is down on it, or Enter is held.   |
| `whileFocus`  | The element has focus and the browser would draw a focus ring |
| `whileInView` | Part of the element is inside the viewport.                   |

Listeners are added only for the props you set. An element without `whileHover`
has no hover listeners.

`whileHover` ignores touch events, and it waits for a press to end before it
ends, so a button does not flicker when the pointer leaves during a click.
`whilePress` ignores secondary mouse buttons and every touch after the first.

`whileFocus` uses `:focus-visible`. A mouse click on a button does not trigger
it. Keyboard focus does. A browser that does not support `:focus-visible` treats
every focus as visible.

Hover and press come from `motion-dom`. In-view uses `IntersectionObserver`, and
the element is never in view where the browser has none.

## In view

```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.5 }}
  transition={{ duration: 0.3 }}
/>
```

`viewport` tunes what counts as in view:

| Option   | Type                        | Default  | Meaning                                                     |
| -------- | --------------------------- | -------- | ----------------------------------------------------------- |
| `once`   | `boolean`                   | `false`  | Stay in view after the first entry and stop observing.      |
| `root`   | `Element \| Document`       | viewport | The scrolling ancestor to measure against.                  |
| `margin` | `string`                    | none     | Grows or shrinks the detection box, in CSS margin syntax.   |
| `amount` | `"some" \| "all" \| number` | `"some"` | How much of the element must show. A number is from 0 to 1. |

## createInView

`createInView(element, viewport?)` returns a boolean accessor with the same
observer and no animation. Use it for a lazy mount, an infinite-scroll sentinel,
or an impression count.

```tsx
import { createSignal } from "solid-js";
import { createInView } from "@totallynotdavid/solid-motion";

function LazySection() {
  const [node, setNode] = createSignal<HTMLElement>();
  const inView = createInView(node, { once: true });

  return <section ref={setNode}>{inView() ? "Loaded" : "Waiting"}</section>;
}
```

The first argument is an accessor, because the element exists only after the ref
runs. Call `createInView` in a component or another reactive owner, so the
observer is disconnected on cleanup.
