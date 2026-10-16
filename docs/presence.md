# Presence

A presence boundary keeps a subtree mounted while its `exit` animation plays.
The subtree unmounts when every motion element inside it has finished leaving.

There are two boundaries. `AnimatePresence` shows one subtree at a time.
`AnimatePresenceList` shows a keyed list.

## AnimatePresence

```tsx
import { AnimatePresence, motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

function Modal() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <button onClick={() => setOpen((value) => !value)}>Toggle</button>
      <AnimatePresence when={open()}>
        {() => (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Hello
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

Pass what is on screen as `when`, not as a conditional child. Solid removes a
conditional branch the moment its condition changes, before the boundary can
hold it. The boundary builds the subtree itself so it can keep it.

`when` is also the identity of the subtree:

- A falsy value renders nothing.
- Changing to a different truthy value swaps the subtree. The old one exits
  while the new one enters.
- Changing back to a value that is still exiting brings that subtree back
  instead of building a second one.

The children are a function. It receives the truthy `when` value.

```tsx
<AnimatePresence when={selectedId()}>
  {(id) => <motion.div exit={{ opacity: 0 }}>{id}</motion.div>}
</AnimatePresence>
```

| Prop             | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| `when`           | What is on screen. Also the key.                               |
| `initial`        | `false` skips the entrance of everything the boundary renders. |
| `custom`         | Passed to the variant functions of the elements inside.        |
| `mode`           | `"sync"` (default), `"wait"` or `"popLayout"`. See below.      |
| `anchorX`        | With `popLayout`, `"left"` (default) or `"right"`.             |
| `anchorY`        | With `popLayout`, `"top"` (default) or `"bottom"`.             |
| `propagate`      | Exit when an enclosing boundary exits. See below.              |
| `onExitComplete` | Called when no subtree is still leaving.                       |

`mode="wait"` holds a new subtree back until the old one has gone.

`mode="popLayout"` takes the leaving elements out of the flow as they start to
leave, so their siblings move into the gap at once while the exit plays. The
element keeps its size and place. Use `anchorX="right"` or `anchorY="bottom"`
for an element that is positioned from that side. If the subtree comes back
before it has gone, the element goes back into the flow. Combine it with
[`layout`](layout.md) on the siblings to animate them into the gap.

```tsx
<AnimatePresenceList each={items()} getKey={(item) => item.id} mode="popLayout">
  {(item) => (
    <motion.li layout exit={{ opacity: 0, scale: 0.8 }}>
      {item().label}
    </motion.li>
  )}
</AnimatePresenceList>
```

`onExitComplete` is called once, after the last leaving subtree has gone. For a
list, that is after the last leaving row.

## AnimatePresenceList

```tsx
import { AnimatePresenceList, motion } from "@totallynotdavid/solid-motion";

<AnimatePresenceList each={items()} getKey={(item) => item.id}>
  {(item) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {item().label}
    </motion.div>
  )}
</AnimatePresenceList>;
```

`getKey` returns a string. Give each item a unique key. If two items share a
key, the first one is used and the others are skipped with a `console.error`.

The children function receives an accessor. Call `item()` so a row that stays
picks up new data without being rebuilt.

A removed row stays at its old position until its exit ends. It does not drop to
the end of the list.

`AnimatePresenceList` takes the same `initial`, `custom`, `mode`, `anchorX`,
`anchorY`, `propagate` and `onExitComplete` props. With `mode="wait"`, only the
rows that are leaving are rendered until the last one has gone. The other rows
are removed and created again after that, so use `"wait"` for a list that shows
one row at a time.

## How an exit finishes

Each motion element inside a boundary takes a hold when it starts to leave and
releases it when its exit ends or is cancelled. The boundary removes the subtree
when the last hold is released. An element with no `exit` releases at once.

## Nested boundaries

A boundary covers the elements between it and the next boundary below. If an
outer subtree leaves while an inner boundary inside it is still animating out,
the outer boundary does not wait for the inner one, and the inner exit is cut
short. Put the boundary at the level that has to wait.

An inner boundary with `propagate` leaves when the outer one does, and holds the
outer one open until its own exit has finished.

## useIsPresent and usePresenceData

`useIsPresent()` returns an accessor that is `false` while the current subtree
is leaving, and `true` outside a boundary. Use it to stop work or disable a
button in a row that is on its way out.

`usePresenceData()` returns an accessor for the boundary's `custom`. A subtree
that has left its owner no longer receives new props, so this is how an exit
learns where to go.

```tsx
import {
  AnimatePresence,
  motion,
  usePresenceData,
} from "@totallynotdavid/solid-motion";

function Slide() {
  const direction = usePresenceData<number>();

  return (
    <motion.div
      initial={{ x: 100 }}
      animate={{ x: 0 }}
      exit={{ x: (direction() ?? 1) * -100 }}
    />
  );
}

<AnimatePresence when={page()} custom={step()}>
  {() => <Slide />}
</AnimatePresence>;
```

## usePresence

`usePresence()` returns the boundary around the current component, or `null` if
there is none. You rarely need it;
[`useIsPresent`](#useispresent-and-usepresencedata) covers the common case. The
object has:

- `isPresent()`: `false` while the subtree is leaving.
- `hold()`: takes a hold and returns the function that releases it. Release it
  on every path, including when the exit is interrupted.
- `initial()` and `custom()`: the boundary's props.

This component keeps its boundary open for 500 ms after it starts to leave:

```tsx
import { usePresence } from "@totallynotdavid/solid-motion";
import { createEffect } from "solid-js";

function Toast() {
  const presence = usePresence();

  createEffect(
    () => presence?.isPresent(),
    (present) => {
      if (present !== false) return;
      const release = presence!.hold();
      setTimeout(release, 500);
    },
  );

  return <div>Saved</div>;
}
```
