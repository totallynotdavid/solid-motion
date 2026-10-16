# Architecture

The package starts `motion-dom` animations directly, one per value. Solid
signals decide what the target is. Motion's `VisualElement`, with its props
model and variant tree, is not used. Two small adapters in `src/values.ts` and
`src/projection.ts` give `motion-dom` the few members it reads from one.

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
| `src/motion.tsx`            | `motion.*` and `motion.create`: `createMotion` plus a component.      |
| `src/create-motion.ts`      | `createMotion`. Wires every other module for one element.             |
| `src/resolve.ts`            | Variant labels and arrays to a target. The target of the first paint. |
| `src/target.ts`             | Merging layers. The reduced-motion rule.                              |
| `src/initial.ts`            | Target to inline style and attributes.                                |
| `src/svg.ts`                | Which tags are SVG. Attribute names.                                  |
| `src/controller.ts`         | One element's passes: diff, start, complete, supersede.               |
| `src/values.ts`             | Per-element `MotionValue` store, shared with `createAnimate`.         |
| `src/motion-values.ts`      | `createMotionValue`, `createVelocity`, `createTime`, style binding.   |
| `src/gestures.ts`           | Hover, press, focus and in-view state. `createInView`.                |
| `src/variants.ts`           | Label inheritance, stagger delays, `when` ordering.                   |
| `src/presence.tsx`          | `AnimatePresence`, the hold protocol, `usePresence`.                  |
| `src/presence-list.tsx`     | `AnimatePresenceList`.                                                |
| `src/config.tsx`            | `MotionConfig`, `useMotionConfig`.                                    |
| `src/reduced-motion.ts`     | `useReducedMotion`.                                                   |
| `src/scroll.ts`             | `createScroll`.                                                       |
| `src/create-animate.ts`     | `createAnimate`: selectors, sequences, playback controls.             |
| `src/create-will-change.ts` | `createWillChange`.                                                   |
| `src/projection.ts`         | Adapts a `motion-dom` projection node to an element.                  |
| `src/layout-updates.ts`     | Creates layout nodes, and watches DOM changes that move them.         |

## Boundaries

- Presence works by holds, not promises. A cancelled `motion-dom` animation
  never settles its `finished` promise, so each leaving element takes a hold and
  releases it on every path. See `PresenceChild` in `src/presence.tsx`.
- Animations start inside `frame.update`, so they read the frame's clock.
- `createMotion` and `createAnimate` share one value store per element, so they
  never bind two `MotionValue`s to the same property.

## Tests

`tests/` runs on jsdom with a fake clock (`tests/clock.ts`). jsdom does no
layout, so `tests/layout.test.tsx` supplies element boxes.
