# Motion values

A motion value holds one number or string and writes it to the element on the
animation frame. Nothing re-renders when it changes.

```tsx
import { createMotionValue, motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

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

## Springs and following

A value that follows a source with a spring is `createMotionValue` with a
`transition`. There is no separate spring hook.

```tsx
const x = createMotionValue(targetX, { stiffness: 300, damping: 30 });
```

The default is a spring. Any `Transition` works, so
`{ type: "tween", duration: 0.3 }` follows with a tween.

## Derived values

`createTransform` makes a value from other motion values. It is recomputed on
the animation frame when any of them changes, and destroyed with the owner.

```tsx
import {
  createMotionValue,
  createTransform,
  motion,
} from "@totallynotdavid/solid-motion";

const x = createMotionValue(0);

// Range form: maps x from [-200, 200] to an opacity.
const opacity = createTransform(x, [-200, 0, 200], [0, 1, 0]);

// Function form: reads any number of values with `get()`.
const distance = createTransform(() => Math.abs(x.get()));

<motion.div drag="x" style={{ x, opacity }} />;
```

The range form takes `(input, inputRange, outputRange, options?)`. The output
can be numbers, colors or other strings. The function form tracks every motion
value it reads with `get()`. A Solid signal read inside it is not tracked. Put a
signal in an accessor in `style` instead.

For a value derived from signals only, an accessor is enough. The pure function
`transform(inputRange, outputRange, options?)` maps one range to another, and is
re-exported from `motion-dom`.

```tsx
import { motion, transform } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

const [position, setPosition] = createSignal(100);
const fade = transform([0, 200], [0, 1]);

<motion.div style={{ opacity: () => fade(position()) }} />;
```

## createMotionTemplate

`createMotionTemplate` builds a string value from motion values, for properties
that take a compound value such as `filter` or `box-shadow`. Use it as a tagged
template. Motion values in it are tracked, and plain strings and numbers pass
through.

```tsx
import {
  createMotionTemplate,
  createMotionValue,
  motion,
} from "@totallynotdavid/solid-motion";

const radius = createMotionValue(0);
const filter = createMotionTemplate`blur(${radius}px)`;

<motion.div style={{ filter }} />;
```

## createMotionValueEvent

`createMotionValueEvent(value, event, callback)` calls `callback` whenever the
value raises `event`, until the owner is cleaned up. `"change"` fires on every
update. `"animationStart"`, `"animationComplete"` and `"animationCancel"` fire
as an animation that drives the value starts, completes or is cancelled.

```tsx
createMotionValueEvent(x, "change", (latest) => console.log(latest));
```

## createAnimationFrame

`createAnimationFrame(callback)` calls `callback(time, delta)` on every
animation frame until the owner is cleaned up. `time` is the milliseconds since
the first call, and `delta` since the previous frame.

## createCycle

`createCycle(...items)` returns `[item, cycle]`, an accessor and a function that
steps through the list. `cycle()` goes to the next item and wraps after the
last, and `cycle(index)` jumps to an index.

```tsx
import { createCycle, motion } from "@totallynotdavid/solid-motion";

function Box() {
  const [x, cycleX] = createCycle(0, 50, 100);

  return <motion.div animate={{ x: x() }} onTap={() => cycleX()} />;
}
```

## createPageInView

`createPageInView()` returns an accessor that is `false` while the browser tab
is hidden. Use it to pause a loop that spends frames. It is `true` on the
server.

## isMotionValue

`isMotionValue(value)` tells a motion value from anything else.

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
