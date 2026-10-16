# Architecture

The package starts `motion-dom` animations directly, one per value. Solid
signals decide what the target is. Two small adapters in `src/values.ts` and
`src/projection.ts` give `motion-dom` the few members it reads from an element.

## How an animation runs

```text
motion.div / createMotion    reads the options, owns the element's lifecycle
  resolve.ts, target.ts      options -> one merged target
  controller.ts              diffs the target, starts animations
    values.ts                one MotionValue per property, bound to the element
    projection.ts            layout and layoutId, through motion-dom projection
      layout-updates.ts      finds DOM changes that move a layout element
```

1. `createMotion` resolves each layer (`animate`, the `while*` props, `exit`)
   against `variants`.
2. `mergeLayers` combines the active layers. The highest layer wins for each
   key.
3. The controller compares the merged target with the values it applied last. It
   starts an animation only for the keys that changed.
4. `values.ts` creates a `MotionValue` for each key and binds it to the element.
   `motion-dom` composes the transform and writes the style or attributes.

The first paint does not wait for this. `initial.ts` turns the initial target
into inline style and attributes. It uses no DOM, so the server and the client
produce the same markup.

## Files

| File                        | Owns                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| `src/index.tsx`             | The public exports.                                                   |
| `src/types.ts`              | Public types: `MotionOptions`, `MotionProps`, `VariantMap`.           |
| `src/option-keys.ts`        | Which props are motion options, so `motion.*` keeps them off the DOM. |
| `src/motion.tsx`            | `motion.*` and `motion.create`: `createMotion` plus a component.      |
| `src/create-motion.ts`      | `createMotion`. Wires every other module for one element.             |
| `src/resolve.ts`            | Variant labels and arrays to a target. The target of the first paint. |
| `src/target.ts`             | Merging layers. The reduced-motion rule.                              |
| `src/initial.ts`            | Target to inline style and attributes.                                |
| `src/svg.ts`                | Which tags are SVG. Attribute names.                                  |
| `src/controller.ts`         | One element's passes: diff, start, complete, supersede.               |
| `src/values.ts`             | Per-element `MotionValue` store, shared with `createAnimate`.         |
| `src/motion-values.ts`      | Motion values, derived values and events. Style binding.              |
| `src/gestures.ts`           | Hover, tap, focus and in-view state. `createInView`.                  |
| `src/pan.ts`                | The pointer session behind pan and drag.                              |
| `src/drag.ts`               | Drag, constraints, release, `createDragControls`.                     |
| `src/reorder.tsx`           | `Reorder.Group` and `Reorder.Item`.                                   |
| `src/reorder-order.ts`      | Which neighbour a dragged item has passed. Axis detection.            |
| `src/auto-scroll.ts`        | Scrolls a container when an item is dragged to its edge.              |
| `src/animation-controls.ts` | `createAnimationControls`.                                            |
| `src/variants.ts`           | Label inheritance, stagger delays, `when` ordering.                   |
| `src/presence.tsx`          | `AnimatePresence`, the hold protocol, `usePresence`.                  |
| `src/presence-list.tsx`     | `AnimatePresenceList`.                                                |
| `src/pop-layout.ts`         | `mode="popLayout"`: takes a leaving element out of flow.              |
| `src/config.tsx`            | `MotionConfig`, `useMotionConfig`.                                    |
| `src/reduced-motion.ts`     | `useReducedMotion`.                                                   |
| `src/scroll.ts`             | `createScroll`.                                                       |
| `src/scroll-offset.ts`      | Scroll offset definitions and presets.                                |
| `src/cycle.ts`              | `createCycle`.                                                        |
| `src/page-visibility.ts`    | `createPageInView`.                                                   |
| `src/create-animate.ts`     | `createAnimate`: selectors, sequences, playback controls.             |
| `src/create-will-change.ts` | `createWillChange`.                                                   |
| `src/projection.ts`         | Adapts a `motion-dom` projection node to an element.                  |
| `src/layout-updates.ts`     | Creates layout nodes, and watches DOM changes that move them.         |
| `src/layout-group.tsx`      | `LayoutGroup`.                                                        |

## Boundaries

- Animations start inside `frame.update`, so they read the frame's clock.
- `createMotion` and `createAnimate` share one value store per element, so they
  never bind two `MotionValue`s to the same property.

## Shared state

State that more than one actor reads or writes. Each entry names every state and
the only code allowed to move each transition. Add a state or a mover here
before you add either to the code. How a user sees these is in
[presence](presence.md) and [layout](layout.md).

### A presence item (`PresenceChild`)

Each item a boundary keeps on screen has these fields.

| Field           | Values                                | Moved only by                                                                                                       |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `isPresent`     | present, leaving                      | The boundary sets its own prop. The item also reads leaving when `propagate` is set and the parent item is leaving. |
| `holds`         | 0 or more                             | `scope.hold()` adds one. The function it returns takes it off, once.                                                |
| `parentRelease` | none, or one hold taken on the parent | The item, in the flush where it is leaving because of `propagate`. It drops it on return or on its own removal.     |
| `unpop`         | none, or the undo of a popped layout  | The item. Set when it leaves under `popLayout`. Cleared when it returns.                                            |

Transitions of an item:

1. present to leaving: only the boundary. In that flush the item measures its
   top-level elements (`popLayout`), then writes the popped styles and takes its
   `parentRelease` if `propagate` applies.
2. Each motion element under the item takes a hold when its exit starts. It
   releases the hold on every way the exit can end, including a cancelled one,
   because a cancelled `motion-dom` animation never settles its promise.
3. leaving to removed: only `leaveIfDone`, and only when `holds` is 0 and the
   item is still leaving. It runs when a hold is released and once in a
   microtask after the flush in which the item started to leave. The second call
   covers an item with no exit, which never takes a hold. It drops
   `parentRelease`, then calls `onExitComplete`, once, and the boundary removes
   the item.
4. leaving to present: the boundary sets `isPresent` again. The item runs
   `unpop` and drops `parentRelease`. A removal that was due in the same flush
   does not happen.

`onExitComplete` of a boundary is called when a removal leaves no other item
leaving. That is decided inside the same update that removes the item, because a
signal read after the update still holds the old list.

### Layout updates (`src/layout-updates.ts`)

One set of module state serves every projecting element in the document.

| State         | Values                          | Moved by                                                                                       |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pending`     | elements waiting for a node     | `adoptLayoutNode` adds. `commit` and `dropLayoutNode` remove.                                  |
| `mounted`     | nodes in the document           | `commit` adds, through `mountPending`. `dropLayoutNode` removes.                               |
| `touched`     | nodes a change may have moved   | The mutation watcher, `noteStyleChange` and `invalidateLayout` add. `commit` clears.           |
| `invalidated` | nodes that must re-measure      | `invalidateLayout` adds, for a changed `layoutDependency`. `commit` clears.                    |
| `instantNext` | off, on                         | `instantLayoutTransition` turns it on. Only `commit` turns it off.                             |
| `scheduled`   | no commit queued, commit queued | `scheduleCommit` queues. `commit` clears it first, so a change made during it queues the next. |

`commit` runs in a microtask and is the only code that takes snapshots and
mounts nodes. A node with a `layoutDependency` takes a snapshot only if it is in
`invalidated`. With `instantNext` on, or for a node whose element is under
reduced motion or `skipAnimations`, a node is marked dirty with no snapshot, so
no animation starts. The mutation watcher ignores `style` changes on elements in
`painted`, because those are this package painting a frame. `claimInlineStyle`
and `releaseInlineStyle` are the only movers of `painted`.

Layout options (`layout`, `layoutId`, `layoutScroll`, `layoutRoot`,
`layoutAnchor`, `layoutCrossfade`) are read once, when the node is created. The
callbacks and `layoutDependency` are read at each use.

### Control member sets

`createAnimationControls` and `createDragControls` each keep a set of the
elements they drive.

| Set                          | Added by                                        | Removed by                                                                       | Read by                                      |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------- |
| Animation controls listeners | `attachToControls`, when the element is created | The function it returns, on cleanup                                              | `start`, `set` and `stop` of the controls    |
| Drag controls members        | The drag effect, when `drag` is set             | That effect's cleanup, when `drag` or `dragControls` changes or the element goes | `start`, `stop` and `cancel` of the controls |

The controls never add or remove members themselves. A control used before any
element attaches does nothing, and one used after the last has gone does
nothing. A drag takes `motion-dom`'s global drag lock for its axis at `begin`
and releases it when it ends, so nested draggables on one axis do not move
together. `dragPropagation` skips the lock.
