# Drag

Set `drag` and the element follows the pointer. On release it carries on at the
speed it was let go, then rests.

```tsx
import { motion } from "@totallynotdavid/solid-motion";

<motion.div
  drag
  whileDrag={{ scale: 1.1 }}
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 0 }}
/>;
```

The element moves by writing its `x` and `y` values, so a drag composes with
every other transform. Pass your own motion values in `style` to read the
position or set it:

```tsx
const x = createMotionValue(0);

<motion.div drag="x" style={{ x }} />;
```

A press that moves less than a few pixels is a click, not a drag.

## Props

| Prop                       | Meaning                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `drag`                     | `true` for both axes, or `"x"` or `"y"` for one.                     |
| `dragConstraints`          | Where the element may go. See below.                                 |
| `dragElastic`              | How far past the constraints it may be pulled. Default `0.35`.       |
| `dragMomentum`             | Keep moving after release. Default `true`.                           |
| `dragTransition`           | Options for the inertia animation that runs after release.           |
| `dragSnapToOrigin`         | Return to where the drag started on release.                         |
| `dragDirectionLock`        | Lock to the axis the drag first moves along.                         |
| `dragPropagation`          | Let the drag also drag the draggable ancestors.                      |
| `dragListener`             | `false` stops the element starting its own drag. See `dragControls`. |
| `dragControls`             | Controls from `createDragControls`, to start a drag from elsewhere.  |
| `whileDrag`                | A target that applies while the element is dragged.                  |
| `onDragStart`, `onDragEnd` | Called with `(event, info)`. `info` is a `PanInfo`.                  |
| `onDrag`                   | Called with `(event, info)` on every move.                           |
| `onDirectionLock`          | Called with `"x"` or `"y"` when `dragDirectionLock` picks an axis.   |
| `onDragTransitionEnd`      | Called when the animation that follows release has finished.         |

`info` has `point`, `delta`, `offset` and `velocity`, as for a
[pan](gestures.md#pan). A drag starts on the element itself, except from a text
input inside it, so a field in a draggable card still takes a click.

Under a drag the element gets `touch-action`, `user-select` and `draggable`
styles so that the browser does not scroll, select or drag a ghost image. They
are put back when `drag` is turned off. With a single axis the other axis stays
free to scroll on touch.

When two draggables on the same axis are nested, only the innermost moves.
`dragPropagation` moves them together.

An element that is leaving an [`AnimatePresence`](presence.md) cannot be picked
up.

## dragConstraints

`dragConstraints` is one of:

- An object with `top`, `left`, `right` and `bottom`: limits on how far the
  element may move from where it rests, in pixels.
- An element: the element must stay inside it.
- A function that returns an element, or `undefined`. It is called at the start
  of each drag, so a ref assigned after the draggable renders works.

```tsx
import { createSignal } from "solid-js";

function Board() {
  const [board, setBoard] = createSignal<HTMLElement>();

  return (
    <div ref={setBoard} class="board">
      <motion.div drag dragConstraints={board} />
    </div>
  );
}
```

An element is measured on every drag, so a container that resizes is followed.
`onMeasureDragConstraints` receives the measured limits as an object and may
return different ones.

Past a limit the element resists by the `dragElastic` factor and springs back on
release. `dragElastic={false}` is a hard stop. An object sets a factor per side.

## Release

On release the element runs motion's inertia animation. It starts at the speed
of the release, stops at the constraints with a spring, and snaps to the origin
with `dragSnapToOrigin`. `dragMomentum={false}` leaves the element where it was
released. `dragTransition` takes the inertia options, for example
`{ power: 0.2, timeConstant: 200 }`.

## createDragControls

`createDragControls()` returns controls you pass to `dragControls`. They start a
drag from a pointer event on any other element, such as a handle.

```tsx
import { createDragControls, motion } from "@totallynotdavid/solid-motion";

function Sheet() {
  const controls = createDragControls();

  return (
    <motion.div drag="y" dragControls={controls} dragListener={false}>
      <div onPointerDown={(event) => controls.start(event)}>Handle</div>
      Content
    </motion.div>
  );
}
```

| Method                   | Does                                                   |
| ------------------------ | ------------------------------------------------------ |
| `start(event, options?)` | Starts a drag with a `pointerdown` event.              |
| `stop()`                 | Ends the drag and lets the element settle as released. |
| `cancel()`               | Ends the drag and leaves the element where it is.      |

`start` takes `snapToCursor`, which centres the element on the pointer first,
and `distanceThreshold`, the pixels the pointer must travel before the drag
begins. One set of controls can drive several elements.

## Pointer coordinates

When the page scales or rotates a container that holds a draggable, set
`transformPagePoint` on a [`MotionConfig`](configuration.md#transformpagepoint).

## Reordering a list

See [Reorder](reorder.md).
