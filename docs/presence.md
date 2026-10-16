# Presence

A presence boundary keeps a subtree mounted while its `exit` animation plays.
The subtree unmounts when every motion element inside it has finished leaving.

There are two boundaries. `AnimatePresence` shows one subtree at a time.
`AnimatePresenceList` shows a keyed list.

## AnimatePresence

```tsx
import { createSignal } from "solid-js";
import { AnimatePresence, motion } from "@totallynotdavid/solid-motion";

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
| `mode`           | `"sync"` (default) or `"wait"`. See below.                     |
| `onExitComplete` | Called when no subtree is still leaving.                       |

`mode="wait"` holds a new subtree back until the old one has gone.

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

`AnimatePresenceList` takes the same `initial`, `custom`, `mode` and
`onExitComplete` props. With `mode="wait"`, only the rows that are leaving are
rendered until the last one has gone. The other rows are removed and created
again after that, so use `"wait"` for a list that shows one row at a time.

## How an exit finishes

Each motion element inside a boundary takes a hold when it starts to leave and
releases it when its exit ends or is cancelled. The boundary removes the subtree
when the last hold is released. An element with no `exit` releases at once.

## Nested boundaries

A boundary covers the elements between it and the next boundary below. If an
outer subtree leaves while an inner boundary inside it is still animating out,
the outer boundary does not wait for the inner one, and the inner exit is cut
short. Put the boundary at the level that has to wait.

## usePresence

`usePresence()` returns the boundary around the current component, or `null` if
there is none. You rarely need it. The object has:

- `isPresent()`: `false` while the subtree is leaving.
- `hold()`: takes a hold and returns the function that releases it. Release it
  on every path, including when the exit is interrupted.
- `initial()` and `custom()`: the boundary's props.

This component keeps its boundary open for 500 ms after it starts to leave:

```tsx
import { createEffect } from "solid-js";
import { usePresence } from "@totallynotdavid/solid-motion";

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
