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

| Option             | Default             | Meaning                                                         |
| ------------------ | ------------------- | --------------------------------------------------------------- |
| `container`        | The page            | An accessor for the element that scrolls.                       |
| `target`           | The container       | An accessor for the element whose position is tracked.          |
| `offset`           | `scrollOffsets.all` | The points progress passes through. See [offsets](#offsets).    |
| `trackContentSize` | `false`             | Check the scroll size on every frame, to catch growing content. |

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

## Offsets

`offset` lists the points progress passes through. Progress is 0 at the first
point, 1 at the last, and the points in between are spaced evenly. Each point
says where an edge of the target meets an edge of the container:

| Point              | Meaning                                                       |
| ------------------ | ------------------------------------------------------------- |
| `"start end"`      | The target's start meets the container's end.                 |
| `["start", "end"]` | The same, written as a pair.                                  |
| `[0, 1]`           | The same, with numbers. 0 is the start, 1 is the end.         |
| `"end"` or `0.5`   | The same edge of both elements.                               |
| `"100px"`          | 100px past the target's start, against the container's start. |

An edge is `"start"`, `"center"`, `"end"`, a number from 0 to 1, or a length:
`"px"`, `"%"` of the element, `"vw"` or `"vh"`.

```tsx
// `node` is an accessor for the element. Progress is 0 as it starts to enter
// and 1 once it has fully entered.
createScroll({ target: node, offset: ["start end", "end end"] });
```

The common ranges are presets in `scrollOffsets`:

| Preset                | 0 when                                          | 1 when                                        |
| --------------------- | ----------------------------------------------- | --------------------------------------------- |
| `scrollOffsets.enter` | The target's start meets the container's end.   | The target's end meets the container's end.   |
| `scrollOffsets.exit`  | The target's start meets the container's start. | The target's end meets the container's start. |
| `scrollOffsets.any`   | The first pixel of the target is visible.       | The last pixel has gone.                      |
| `scrollOffsets.all`   | The starts meet. The default.                   | The ends meet.                                |

For the page, `all` is 0 at the top and 1 at the bottom.

Set `trackContentSize` when the content of a fixed-height container grows after
the first measurement, for example when images load. A container that resizes is
measured without it.

Offsets are measured with `offsetTop` and `offsetLeft`, so a CSS transform on
the target or on an ancestor is not counted.
