# Motion values

A motion value holds one number or string and writes it to the element on the
animation frame. Nothing re-renders when it changes.

```tsx
import { createSignal } from "solid-js";
import { createMotionValue, motion } from "@totallynotdavid/solid-motion";

function Ball() {
  const [targetX, setTargetX] = createSignal(0);

  // Follows targetX with a spring.
  const x = createMotionValue(targetX, { stiffness: 300, damping: 30 });

  return (
    <>
      <button onClick={() => setTargetX((value) => value + 100)}>Move</button>
      <motion.div style={{ x }} />
    </>
  );
}
```

## createMotionValue

`createMotionValue(source, transition?)` returns a `MotionValue`.

`source` is one of:

- a constant: the initial value.
- a Solid accessor: the value follows it.
- another `MotionValue`: the value follows that.

Without a `transition`, the value jumps to every new source value. With one, the
value moves there with that transition. A change that arrives mid-flight starts
from the current position and velocity.

Read the current value with `get()`. The value is destroyed when the owner that
created it is cleaned up, so call `createMotionValue` in a component or another
reactive owner.

## In `style`

An entry of `style` can be a `MotionValue` or an accessor. Both are bound to the
element and written on the frame. Other entries are plain CSS and stay reactive
through Solid.

```tsx
<motion.div style={{ x, opacity: () => 1 - progress(), color: color() }} />
```

- Names like `x`, `scale` and `rotate` are composed into one `transform`.
- Which keys are bound is fixed when the element is created. The values stay
  live.
- If `animate`, `whileHover` or another target names a bound key, it animates
  the value you passed in, so `x.get()` reads the current position.
- An accessor has no value you can read back. The package makes a private one.

## Derived values

A value derived from signals is an accessor. Solid has no `useTransform`.

`transform(inputRange, outputRange, options?)` maps one range to another. It is
re-exported from `motion-dom`.

```tsx
import { createSignal } from "solid-js";
import { motion, transform } from "@totallynotdavid/solid-motion";

const [position, setPosition] = createSignal(100);
const fade = transform([0, 200], [0, 1]);

<motion.div style={{ opacity: () => fade(position()) }} />;
```

## createVelocity

`createVelocity(source)` returns a value that holds the rate of change of a
numeric motion value. It falls to zero when the source stops changing.

```tsx
import {
  createMotionValue,
  createVelocity,
} from "@totallynotdavid/solid-motion";

const x = createMotionValue(0);
const speed = createVelocity(x);
```

## createTime

`createTime()` returns a value with the milliseconds since its first animation
frame. It updates on every frame.

```tsx
import { createTime, motion } from "@totallynotdavid/solid-motion";

function Slider() {
  // Moves one pixel per millisecond.
  const time = createTime();
  return <motion.div style={{ x: time }} />;
}
```

## createWillChange

`createWillChange()` returns a `will-change` value. Call `add(property)` and it
adds the property to the list, once.

```tsx
import { createWillChange, motion } from "@totallynotdavid/solid-motion";

function Card() {
  const willChange = createWillChange();
  willChange.add("transform");
  willChange.add("opacity");

  return <motion.div style={{ willChange }} />;
}
```
