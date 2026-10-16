# Reorder

`Reorder.Group` and `Reorder.Item` make a list the user can reorder by dragging.
The group owns no state. It calls `onReorder` with the new order, and you store
it.

```tsx
import { createSignal, For } from "solid-js";
import { Reorder } from "@totallynotdavid/solid-motion";

function Todo() {
  const [items, setItems] = createSignal(["Write", "Test", "Ship"]);

  return (
    <Reorder.Group values={items()} onReorder={setItems}>
      <For each={items()}>
        {(item) => <Reorder.Item value={item}>{item}</Reorder.Item>}
      </For>
    </Reorder.Group>
  );
}
```

`values` is the list in the order it is shown. Each `Reorder.Item` gets one
entry as its `value`, so entries must be unique. Render the items from the same
list, in the same order.

While an item is dragged, it follows the pointer and lifts above its siblings.
When it is past the middle of a neighbour, `onReorder` is called with the new
order, the neighbour animates into the gap, and the item keeps following the
pointer. On release the item settles into its slot.

## Reorder.Group

| Prop        | Meaning                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `values`    | The entries, in the order they are shown.                                 |
| `onReorder` | Called with the new order. It is not called again until `values` changes. |
| `axis`      | `"x"`, `"y"` or `"xy"`. Measured from the items when left out.            |
| `as`        | The element to render. Default `"ul"`.                                    |

The group takes the other props of `motion.ul` as well.

The axis is read from where the items sit: side by side is `"x"`, stacked is
`"y"`, and a list that wraps into rows is `"xy"`, where an item moves between
rows as well as within one. Set `axis` to override it. A group with
`direction: rtl` reorders a row from the right.

When the group sits in a scrolling container, dragging an item to its edge
scrolls the container.

A press that ends a drag that reordered the list does not produce a click on the
item or its ancestors. An ordinary click goes through.

## Reorder.Item

| Prop     | Meaning                                                                     |
| -------- | --------------------------------------------------------------------------- |
| `value`  | The entry of `values` this item stands for.                                 |
| `as`     | The element to render. Default `"li"`.                                      |
| `layout` | `true` (default) or `"position"`, which moves the item without resizing it. |

An item is a `motion` element with `drag` on the group's axis. It takes the
props of `motion.li`. Your `onDrag`, `onDragEnd` and `onLayoutMeasure` are
called as well as the group's own handling. It must be inside a `Reorder.Group`;
otherwise it throws.

Pass your own `style` motion values to read the item's position:

```tsx
const y = createMotionValue(0);

<Reorder.Item value={item} style={{ y }} />;
```

An item that is not in the group's DOM yet, or has not been measured, keeps its
place in the list.
