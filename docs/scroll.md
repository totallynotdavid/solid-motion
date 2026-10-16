# Scroll

`createScroll()` returns motion values that follow a scroll position. Bind them
to `style` to drive an element from scrolling.

```tsx
import { createScroll, motion } from "@totallynotdavid/solid-motion";

function ProgressBar() {
  const { scrollYProgress } = createScroll();

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "4px",
        background: "royalblue",
        "transform-origin": "left",
        scaleX: scrollYProgress,
      }}
    />
  );
}
```

It returns four `MotionValue`s:

| Value             | Holds                                |
| ----------------- | ------------------------------------ |
| `scrollX`         | Horizontal scroll offset, in pixels. |
| `scrollY`         | Vertical scroll offset, in pixels.   |
| `scrollXProgress` | Horizontal progress, from 0 to 1.    |
| `scrollYProgress` | Vertical progress, from 0 to 1.      |

The values are measured on scroll and on resize, and are destroyed with the
owner. Call `createScroll` in a component or another reactive owner. On the
server there is nothing to measure and the values stay at 0.

## Options

`createScroll({ container, target, offset, trackContentSize })`

| Option             | Default            | Meaning                                                         |
| ------------------ | ------------------ | --------------------------------------------------------------- |
| `container`        | The page           | An accessor for the element that scrolls.                       |
| `target`           | The container      | An accessor for the element whose position is tracked.          |
| `offset`           | `[[0, 0], [1, 1]]` | When progress is 0 and when it is 1.                            |
| `trackContentSize` | `false`            | Check the scroll size on every frame, to catch growing content. |

`container` and `target` are accessors, because a ref is set after the component
runs. Until they return an element, nothing is measured.

```tsx
import { createSignal } from "solid-js";
import { createScroll, motion } from "@totallynotdavid/solid-motion";

function Panel() {
  const [box, setBox] = createSignal<HTMLElement>();
  const { scrollYProgress } = createScroll({ container: box });

  return (
    <div ref={setBox} style={{ height: "200px", overflow: "auto" }}>
      <motion.div style={{ opacity: scrollYProgress }}>Fades in</motion.div>
      <div style={{ height: "800px" }} />
    </div>
  );
}
```

`offset` is two points, `[start, end]`. Each point is `[target, container]`, a
position along each element from 0 (its start) to 1 (its end). Progress is 0
when the first point's target position meets its container position, and 1 for
the second point. The default `[[0, 0], [1, 1]]` is 0 when the target's start
meets the container's start, and 1 when their ends meet. For the page, that is 0
at the top and 1 at the bottom.

Set `trackContentSize` when the content of a fixed-height container grows after
the first measurement, for example when images load. A container that resizes is
measured without it.

Offsets are measured with `offsetTop` and `offsetLeft`, so a CSS transform on
the target or on an ancestor is not counted.
