# createMotion and custom components

`createMotion` is the primitive behind `motion.div`. It animates an element that
you render yourself.

```tsx
import { createMotion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

function CollapsibleRow() {
  const [open, setOpen] = createSignal(false);

  const handle = createMotion(() => ({
    initial: false,
    animate: { height: open() ? "auto" : 0 },
    transition: { duration: 0.2 },
  }));

  return (
    <div
      class="row"
      style={handle.style}
      ref={handle.ref}
      onClick={() => setOpen((value) => !value)}
    />
  );
}
```

`createMotion(options, tag?)` takes a function that returns the same options as
`motion.div` takes as props: `initial`, `animate`, `exit`, `transition`,
`variants`, `custom`, the `while*` props, `viewport`, `layout`, `layoutId`,
`style` and the callbacks. It returns a handle:

| Field   | Meaning                                                                  |
| ------- | ------------------------------------------------------------------------ |
| `ref`   | Attach it to the element. Animation starts when the ref runs.            |
| `style` | The inline style the element must be born with.                          |
| `attrs` | The attributes the element must be born with. Empty unless `tag` is SVG. |

Apply `style` and `attrs` to the element. Together they are the first paint, on
the server and on the client. If you also set a `style`, merge the handle's
style over yours so the motion target wins.

```tsx
<div style={{ color: "red", ...handle.style }} ref={handle.ref} />
```

`tag` is the name of the element you render. Pass it for an SVG tag, so the
first paint uses attributes, and spread `attrs`:

```tsx
const handle = createMotion(
  () => ({ initial: { x2: 0 }, animate: { x2: 100 } }),
  "line",
);

<line y1="50" y2="50" stroke="black" {...handle.attrs} ref={handle.ref} />;
```

## Why use it

`motion.div` adds a component and spreads all props at runtime. With
`createMotion` your own element keeps Solid's compiled setters for `class`,
`onClick` and the rest. The difference matters for a leaf element in a long
list. Elsewhere, `motion.div` is shorter.

An element made with `createMotion` reads variant names from the motion element
above it, but it cannot pass names to its own children. Only `motion.*` does
that.

`createMotion<TCustom>` types `custom` and the variant functions in `variants`
together.

## Custom components

`motion.create(Component)` returns an animated version of your own component. It
takes the same props as `motion.div`, plus the props of your component.

```tsx
import type { JSX } from "@solidjs/web";
import { motion } from "@totallynotdavid/solid-motion";

const Card = (props: {
  title: string;
  style?: JSX.CSSProperties;
  ref?: JSX.Ref<HTMLDivElement>;
}) => (
  <div ref={props.ref} style={props.style}>
    {props.title}
  </div>
);

const MotionCard = motion.create(Card);

<MotionCard title="Hello" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />;
```

The wrapper passes `style` and `ref` to your component. Forward both to the node
that should animate.

- Without `ref`, the element never animates.
- Without `style`, the element is not painted at `initial`. It animates from its
  CSS value. With `initial={false}`, it stays at its CSS value until a later
  change.

The first paint of a custom component is always HTML style, even if it renders
an SVG element.
