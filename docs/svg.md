# SVG

Use `motion.line`, `motion.path`, `motion.circle` and the other SVG tags the
same way as `motion.div`. Geometry such as `x1`, `x2` and `viewBox` is written
as attributes.

```tsx
import { motion } from "@totallynotdavid/solid-motion";

<svg viewBox="0 0 100 100">
  <motion.line
    x1="0"
    y1="50"
    y2="50"
    stroke="black"
    initial={{ x2: 0 }}
    animate={{ x2: 100 }}
    transition={{ duration: 0.3 }}
  />
</svg>;
```

The first paint puts `x2="0"` on the element, in the server HTML as well as on
the client.

## Drawing a path

`pathLength` animates from 0 to 1 and draws the stroke. The package sets the
`pathLength` attribute to 1 and animates `stroke-dasharray` for you.

```tsx
<motion.path
  d="M0 0 L100 100"
  stroke="black"
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 0.3 }}
/>
```

## Style and attributes

CSS properties such as `opacity`, `transform` and `fill` go through `style`, as
on HTML elements.

The tags that paint their first frame as SVG attributes are: `animate`,
`circle`, `defs`, `desc`, `ellipse`, `filter`, `g`, `image`, `line`, `marker`,
`mask`, `metadata`, `path`, `pattern`, `polygon`, `polyline`, `rect`, `stop`,
`svg`, `switch`, `symbol`, `text`, `tspan`, `use` and `view`. For any other tag,
such as `foreignObject`, `clipPath` or `linearGradient`, the initial target is
painted as inline style instead.

`motion.create(Component)` always paints as HTML, because only a tag name says
what an element will be.

Sizes that go between units, such as `"auto"`, are measured for HTML elements
only.
