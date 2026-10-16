# Variants

A variant is a named target. Define a `variants` map, then use its names where a
target goes: in `initial`, `animate`, `exit` and the `while*` props.

```tsx
import { motion, type VariantMap } from "@totallynotdavid/solid-motion";

const variants: VariantMap = {
  hidden: { opacity: 0 },
  visible: (custom) => ({
    opacity: 1,
    transition: { delay: (custom as number) * 0.05 },
  }),
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  custom={2}
/>;
```

A variant is a target, or a function that receives `custom` and returns one. A
name that is not in the map is ignored.

A list of names, `animate={["hidden", "visible"]}`, is merged from left to
right. The later name wins for each key. A list holds names only, not inline
targets.

## Passing names down

An element that names a variant offers that name to the motion elements inside
it. A child with its own `variants` map and no `animate` prop uses the parent's
name.

```tsx
const list = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const item = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

<motion.ul variants={list} initial="hidden" animate="visible">
  <motion.li variants={item} />
  <motion.li variants={item} />
</motion.ul>;
```

The children have no `initial` or `animate`. They read `"hidden"` and
`"visible"` from the `ul`, and look them up in `item`.

- A prop on the child wins over the name it would inherit.
- An inline target is never inherited. Only names are, because a name means
  something only next to its own `variants` map.
- `custom` is inherited the same way. An element uses its own `custom`, then the
  nearest parent's, then the one from an enclosing
  [`AnimatePresence`](presence.md).

## Stagger

Put the timing on the parent's `transition`.

```tsx
<motion.ul
  variants={list}
  initial="hidden"
  animate="visible"
  transition={{ staggerChildren: 0.1 }}
>
  <motion.li variants={item} />
  <motion.li variants={item} />
  <motion.li variants={item} />
</motion.ul>
```

| Option             | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `delayChildren`    | Seconds added to every child's start. A number or `stagger()`. |
| `staggerChildren`  | Seconds added per position. The first child adds none.         |
| `staggerDirection` | `1` starts with the first child. `-1` starts with the last.    |
| `when`             | `"beforeChildren"` or `"afterChildren"`. See below.            |

The position of a child is its place in document order among the parent's motion
children, read when the delay is needed. A keyed list that reorders rows keeps
the right order.

`delayChildren` also takes `stagger()`, which is re-exported from `motion-dom`.
A function replaces `staggerChildren` and `staggerDirection`. The base delay is
not added to its result.

```tsx
import { motion, stagger } from "@totallynotdavid/solid-motion";

<motion.ul
  variants={list}
  initial="hidden"
  animate="visible"
  transition={{ delayChildren: stagger(0.1) }}
>
  <motion.li variants={item} />
  <motion.li variants={item} />
</motion.ul>;
```

## Ordering a parent and its children

`when` makes the parent and its children take turns.

```tsx
transition={{ duration: 0.2, when: "beforeChildren" }}
```

- `"beforeChildren"`: children wait until the parent's own animation ends.
- `"afterChildren"`: the parent waits until every child's animation ends.

Any other value of `when` is ignored.

## Types

`motion.*` types the argument of a variant function as `unknown`, so
`custom as number` needs a cast. [`createMotion<TCustom>`](create-motion.md)
carries the type, and checks `custom` and the map together.
