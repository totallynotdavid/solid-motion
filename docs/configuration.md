# Configuration

`MotionConfig` sets defaults for every motion element inside it.

```tsx
import { MotionConfig, motion } from "@totallynotdavid/solid-motion";

<MotionConfig reducedMotion="user" transition={{ duration: 0.2 }}>
  <motion.div animate={{ opacity: 1 }} />
</MotionConfig>;
```

| Prop                 | Default   | Meaning                                                   |
| -------------------- | --------- | --------------------------------------------------------- |
| `transition`         | none      | The transition for any element that sets none of its own. |
| `reducedMotion`      | `"never"` | `"never"`, `"always"` or `"user"`. See below.             |
| `skipAnimations`     | `false`   | Jump every animation to its target.                       |
| `transformPagePoint` | none      | Maps pointer coordinates. See below.                      |

A `MotionConfig` inside another one overrides the props it sets and inherits the
rest. `useMotionConfig()` returns the current values.

The settings also apply to animations started with
[`createAnimate`](create-animate.md).

## Reduced motion

`reducedMotion` decides what happens for people who ask their system for less
motion.

- `"never"`: animate normally.
- `"always"`: reduce motion for everyone.
- `"user"`: reduce motion when the `prefers-reduced-motion: reduce` media query
  matches.

Reduced motion does not stop every animation. Properties that move or resize an
element jump to their target: `x`, `y`, `scale`, `rotate` and the other
transform properties, `width`, `height`, `top`, `left`, `right` and `bottom`,
and layout animations. Other properties, such as `opacity` and colors, still
animate.

## skipAnimations

`skipAnimations` removes all animation. Every value jumps to its target, even if
the element or target sets its own `transition`.

```tsx
<MotionConfig skipAnimations>
  <App />
</MotionConfig>
```

## transformPagePoint

`transformPagePoint` receives a pointer position in page coordinates and returns
the position in the space the element lives in. [Drag](drag.md) and
[pan](gestures.md#pan) read the pointer through it. Set it when a container is
scaled or rotated by a CSS transform, so the element follows the pointer.

```tsx
<MotionConfig transformPagePoint={({ x, y }) => ({ x: x / 2, y: y / 2 })}>
  <motion.div drag />
</MotionConfig>
```

## useReducedMotionConfig

`useReducedMotionConfig()` returns an accessor that is `true` while reduced
motion is in effect for this part of the tree: the nearest `MotionConfig`'s
`reducedMotion`, resolved against the device preference when it is `"user"`.
Unlike `useReducedMotion`, it follows `"always"` and `"never"`.

```tsx
import { useReducedMotionConfig } from "@totallynotdavid/solid-motion";

function Parallax() {
  const reduced = useReducedMotionConfig();
  return <p>{reduced() ? "Still" : "Moving"}</p>;
}
```

## useReducedMotion

`useReducedMotion()` returns an accessor that is `true` while the
`prefers-reduced-motion: reduce` query matches. Use it for your own logic. The
package listens to the query once, not once per element. On the server it is
`false`.

```tsx
import { useReducedMotion } from "@totallynotdavid/solid-motion";

function Hero() {
  const reduced = useReducedMotion();
  return <p>{reduced() ? "Motion is reduced" : "Motion is on"}</p>;
}
```
