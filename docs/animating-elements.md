# Animating elements

`motion.div` is a `div` that animates. Any intrinsic tag works: `motion.button`,
`motion.li`, `motion.path`. Props that motion does not know, such as `class`,
`onClick` and `children`, go to the element.

```tsx
import { createSignal } from "solid-js";
import { motion } from "@totallynotdavid/solid-motion";

function Panel() {
  const [wide, setWide] = createSignal(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0, width: wide() ? 300 : 150 }}
      transition={{ duration: 0.3 }}
      onClick={() => setWide((value) => !value)}
    >
      Click to resize
    </motion.div>
  );
}
```

The element is painted at `initial`, then animates to `animate`. `animate` is
read in a tracking scope, so a signal inside it re-runs the animation. Only the
values that changed start a new animation.

## Props

| Prop                                                    | Meaning                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `initial`                                               | Where the element starts. `false` starts it at `animate`.                   |
| `animate`                                               | The target while the element is present.                                    |
| `exit`                                                  | The target while a [presence](presence.md) boundary removes the element.    |
| `transition`                                            | How to get to a target. Falls back to the `transition` of a `MotionConfig`. |
| `whileHover`, `whilePress`, `whileFocus`, `whileInView` | Targets that apply while a [gesture](gestures.md) is active.                |
| `variants`, `custom`                                    | Named targets. See [variants](variants.md).                                 |
| `style`                                                 | CSS, where an entry may also be a [motion value](motion-values.md).         |
| `layout`, `layoutId`                                    | See [layout](layout.md).                                                    |
| `onAnimationStart`, `onAnimationComplete`               | Called with the definition that was animated.                               |
| `onUpdate`                                              | Called on every frame with the latest values.                               |

`initial` is read once, because it describes the first paint. Every other prop
is read again when its signals change.

## Targets

A target maps a property to its end value.

```tsx
<motion.div
  animate={{
    x: [0, 100, 0],
    backgroundColor: "#ff0080",
    height: "auto",
    transition: { duration: 0.5 },
    transitionEnd: { display: "none" },
  }}
/>
```

- An array is a list of keyframes. `null` in the first slot starts from the
  current value.
- `x`, `y`, `scale`, `rotate` and the other transform shorthands are composed
  into one `transform`.
- `height`, `width` and similar properties can go between units, for example `0`
  to `"auto"`. The element is measured and the two numbers are animated. This
  works for HTML elements. SVG uses [attributes](svg.md).
- `transition` inside a target applies to that target only.
- `transitionEnd` is applied when the animation finishes.

A target can also be a variant label or a list of labels. See
[variants](variants.md).

## Layers

An element can be in several states at once. Each state has a target, and the
higher state wins for the keys it sets. From lowest to highest:

1. `animate`
2. `whileInView`
3. `whileFocus`
4. `whileHover`
5. `whilePress`
6. `exit`

When a state ends, the keys it set return to the next layer down. A key that no
layer sets goes back to the value it had before it was first animated. An `exit`
target sets only the keys it names. Other keys keep their `animate` value while
the element leaves.

## Skipping the entrance

`initial={false}` paints the element at its `animate` target. There is nothing
left to animate on mount, and the element is not touched until a later change.

```tsx
<motion.div initial={false} animate={{ opacity: open() ? 1 : 0 }} />
```

An enclosing [`AnimatePresence`](presence.md) can set `initial={false}` for
every element inside it.

## Callbacks

```tsx
<motion.div
  animate={{ x: 100 }}
  onAnimationStart={(definition) => console.log("start", definition)}
  onAnimationComplete={(definition) => console.log("done", definition)}
  onUpdate={(latest) => console.log(latest.x)}
/>
```

`definition` is the value you passed to `animate` (or `exit`): a target, a
label, or a list of labels. When a pass changes nothing, for example on mount
with `initial={false}`, only `onAnimationComplete` is called.

## Transitions

`transition` is a `Transition` from `motion-dom`. It takes `duration`, `ease`,
`delay`, `type: "spring"` with `stiffness` and `damping`, and the other options
in the [Motion documentation](https://motion.dev/docs/react-transitions).

## Custom components

`motion.create(Component)` returns an animated version of your own component.
See [createMotion](create-motion.md#custom-components).
