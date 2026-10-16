# Configuration

`MotionConfig` sets defaults for every motion element inside it.

```tsx
import { MotionConfig, motion } from "@totallynotdavid/solid-motion";

<MotionConfig reducedMotion="user" transition={{ duration: 0.2 }}>
  <motion.div animate={{ opacity: 1 }} />
</MotionConfig>;
```

| Prop             | Default   | Meaning                                                   |
| ---------------- | --------- | --------------------------------------------------------- |
| `transition`     | none      | The transition for any element that sets none of its own. |
| `reducedMotion`  | `"never"` | `"never"`, `"always"` or `"user"`. See below.             |
| `skipAnimations` | `false`   | Jump every animation to its target.                       |

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
