# createAnimate

`createAnimate` animates elements that you do not render with `motion.*`: nodes
that a chart library creates, or elements that you pick by selector.

```tsx
import { createAnimate } from "@totallynotdavid/solid-motion";

function Toolbar() {
  const [scope, animate] = createAnimate();

  return (
    <div ref={scope}>
      <button
        onClick={() =>
          animate(".dot", {
            scale: [1, 1.5, 1],
            transition: { duration: 0.4 },
          })
        }
      >
        Pulse
      </button>
      <span class="dot" />
    </div>
  );
}
```

`createAnimate()` returns `[scope, animate]`.

- `scope` is a ref. Put it on the root element. `scope.current` is that element,
  or `undefined` before it mounts.
- `animate(target, definition)` animates the target and returns the playback
  controls.

`target` is an element, an array of elements, or a CSS selector. A selector is
searched inside `scope.current`. Before the scope mounts, a selector matches
nothing.

`definition` is a target as in `animate={...}`: values, an optional `transition`
and an optional `transitionEnd`.

## Controls

The return value of `animate` has `stop()`, `pause()`, `play()`, `complete()`,
`cancel()`, `time`, `speed`, `duration`, `state` and `finished`. It is also
awaitable.

```tsx
await animate(".dot", { opacity: 0 });
```

`finished` also settles when you call `stop()`. A call that you make before the
first frame runs, such as `pause()`, is applied once the animation starts.

## Sequences

Pass a list of `[target, definition]` steps to run them one after another. Each
step starts when the one before it ends.

```tsx
await animate([
  [".title", { opacity: 1 }],
  [".body", { opacity: 1 }],
]);
```

## Rules

- Animations stop when the owner of `createAnimate` is cleaned up.
- `MotionConfig` applies: its `transition` is the default, `skipAnimations`
  jumps to the target, and `reducedMotion` makes movement jump.
- If a `motion.*` element and `animate` target the same property of one element,
  the later call takes over, and the earlier one settles.
