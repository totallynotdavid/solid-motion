# Gestures

`whileHover`, `whileTap`, `whileFocus`, `whileInView` and [`whileDrag`](drag.md)
each take a target. The target applies while the state is active. When the state
ends, the element animates back. See [layers](animating-elements.md#layers) for
how states combine.

```tsx
import { motion } from "@totallynotdavid/solid-motion";

<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ outline: "2px solid royalblue" }}
  transition={{ duration: 0.15 }}
>
  Save
</motion.button>;
```

| Prop          | Active while                                                  |
| ------------- | ------------------------------------------------------------- |
| `whileHover`  | A pointer that is not a touch is over the element.            |
| `whileTap`    | The primary pointer button is down on it, or Enter is held.   |
| `whileFocus`  | The element has focus and the browser would draw a focus ring |
| `whileInView` | Part of the element is inside the viewport.                   |

Listeners are added only for the props you set. An element without `whileHover`
or `onHoverStart` has no hover listeners.

`whileHover` ignores touch events, and it waits for a press to end before it
ends, so a button does not flicker when the pointer leaves during a click.
`whileTap` ignores secondary mouse buttons and every touch after the first. A
disabled button is never pressed.

`whileFocus` uses `:focus-visible`. A mouse click on a button does not trigger
it. Keyboard focus does. A browser that does not support `:focus-visible` treats
every focus as visible.

Hover and press come from `motion-dom`. In-view uses `IntersectionObserver`, and
the element is never in view where the browser has none.

## Callbacks

Each state has callbacks. They run whether or not the matching `while*` prop is
set, and the latest function you passed is the one that runs.

| Prop                                 | Called when                                     |
| ------------------------------------ | ----------------------------------------------- |
| `onHoverStart`, `onHoverEnd`         | A pointer that is not a touch enters or leaves. |
| `onTapStart`                         | A press starts on the element.                  |
| `onTap`                              | A press that started on the element ends on it. |
| `onTapCancel`                        | A press that started on it ends somewhere else. |
| `onViewportEnter`, `onViewportLeave` | The element enters or leaves the viewport.      |

Hover and tap handlers get `(event, info)`, where `event` is the `PointerEvent`
and `info.point` is the pointer in page coordinates. `onViewportEnter` and
`onViewportLeave` get the `IntersectionObserverEntry`. They run on a change, not
on every observer report. With `viewport.once`, the element is never reported
leaving.

```tsx
<motion.button
  onTapStart={(event, info) => console.log("down at", info.point.x)}
  onTap={() => save()}
  onTapCancel={() => console.log("let go elsewhere")}
/>
```

Two props change how a press is tracked:

- `globalTapTarget` lets a press that starts on the element end anywhere in the
  window, so `onTap` fires even when the pointer has left the element.
- `propagate={{ tap: false }}` stops a press on this element from also pressing
  the tappable elements above it. By default a press counts for every one.

## Pan

A pan is a press that moves. It starts after the pointer has travelled a few
pixels, so a plain click is never a pan. The callbacks get `(event, info)`, and
`info` is a `PanInfo`: `point`, `delta` since the last event, `offset` since the
press, and `velocity` in pixels per second over the last 100 ms.

| Prop                | Called when                                   |
| ------------------- | --------------------------------------------- |
| `onPanSessionStart` | The pointer goes down, before any movement.   |
| `onPanStart`        | The pointer first travels past the threshold. |
| `onPan`             | The pointer moves during a pan.               |
| `onPanEnd`          | The pointer is released after a pan.          |

```tsx
<motion.div
  onPan={(_, info) => setOffset(info.offset.x)}
  onPanEnd={(_, info) => {
    if (info.velocity.x > 500) next();
  }}
/>
```

A pan listens on the window, so it follows the pointer outside the element. Set
`transformPagePoint` on a [`MotionConfig`](configuration.md#transformpagepoint)
when the page scales or rotates a container, so the points are in the space of
the element.

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
