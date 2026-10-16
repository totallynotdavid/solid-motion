# Layout

Add `layout` to an element and it animates to its new box when a render moves or
resizes it. You change the DOM or the CSS. The element measures itself before
and after, and animates the difference.

```tsx
import { motion } from "@totallynotdavid/solid-motion";
import { createSignal } from "solid-js";

function Switch() {
  const [on, setOn] = createSignal(false);

  return (
    <div
      class={on() ? "track on" : "track"}
      onClick={() => setOn((value) => !value)}
    >
      <motion.div
        class="knob"
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </div>
  );
}
```

```css
.track {
  display: flex;
  width: 60px;
  padding: 4px;
  background: #ccc;
}
.track.on {
  justify-content: flex-end;
}
.knob {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
}
```

The `.on` class moves the knob to the other end. The knob slides there instead
of jumping.

## layout

| Value               | Animates                                                |
| ------------------- | ------------------------------------------------------- |
| `true`              | Position and size.                                      |
| `"position"`        | Position only.                                          |
| `"size"`            | Size only.                                              |
| `"x"` or `"y"`      | That axis only.                                         |
| `"preserve-aspect"` | Position only when the aspect ratio changes, else both. |

`transition` sets the timing. To give the layout its own timing, add a `layout`
key to the transition:

```tsx
<motion.div layout transition={{ duration: 0.4, layout: { duration: 0.2 } }} />
```

Layout works on HTML elements.

An element is re-measured after a DOM change that can move it. These count:
adding or removing nodes, changing text, and changing `class`, `hidden`, a
`data-*` attribute or the inline `style` of the element, an ancestor or a
descendant. A move with another cause, such as a window resize or a media query,
is not animated.

## layoutId

Give two elements the same `layoutId`. When one replaces the other, the new
element animates from the box the old one had, and the two crossfade.

```tsx
import { motion } from "@totallynotdavid/solid-motion";
import { createSignal, For } from "solid-js";

const tabs = ["Home", "Docs", "Blog"];

function Tabs() {
  const [active, setActive] = createSignal("Home");

  return (
    <nav>
      <For each={tabs}>
        {(tab) => (
          <button onClick={() => setActive(tab)}>
            {tab}
            {active() === tab ? (
              <motion.div class="underline" layoutId="underline" />
            ) : null}
          </button>
        )}
      </For>
    </nav>
  );
}
```

The underline moves from one tab to the next. `layoutId` also works across an
[`AnimatePresence`](presence.md) boundary, where the old element is still
exiting while the new one enters.

`layoutId` alone turns layout animation on. You do not need `layout` as well.

By default the two elements crossfade. `layoutCrossfade={false}` on an element
stops it fading and leaves it at its own opacity.

## LayoutGroup

Two copies of a component that use the same `layoutId` would animate between
each other. `LayoutGroup` prefixes the `layoutId` of everything inside it, so
each copy keeps its own.

```tsx
import { LayoutGroup, motion } from "@totallynotdavid/solid-motion";

function TabBar(props: { id: string }) {
  return (
    <LayoutGroup id={props.id}>
      <nav>
        <motion.div layoutId="underline" />
      </nav>
    </LayoutGroup>
  );
}
```

| Prop      | Meaning                                                                |
| --------- | ---------------------------------------------------------------------- |
| `id`      | The prefix, added as `id-layoutId`.                                    |
| `inherit` | `false` starts a namespace of its own instead of nesting inside above. |

Groups inside groups join their ids, so `a` inside `b` gives `b-a-layoutId`.

## Other layout props

| Prop                                                  | Meaning                                                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layoutDependency`                                    | Re-measure the element when this value changes. See below.                                                                                                                      |
| `layoutScroll`                                        | The element scrolls. Its children are measured inside its scroll.                                                                                                               |
| `layoutRoot`                                          | The element is fixed in place. Ancestors animating do not move it.                                                                                                              |
| `layoutAnchor`                                        | The point on the parent a child is placed against, as `{ x, y }` from 0 to 1. Default top left. `{ x: 0.5, y: 0.5 }` keeps a centred child from drifting. `false` turns it off. |
| `onBeforeLayoutMeasure`                               | Called before each measurement.                                                                                                                                                 |
| `onLayoutMeasure`                                     | Called with each new box and the one before it.                                                                                                                                 |
| `onLayoutAnimationStart`, `onLayoutAnimationComplete` | Called when the move begins and when it lands.                                                                                                                                  |

`layout`, `layoutId`, `layoutScroll`, `layoutRoot`, `layoutAnchor` and
`layoutCrossfade` are read once, when the element is created. The callbacks and
`layoutDependency` follow changes.

An element normally re-measures after any DOM change near it. Once you set
`layoutDependency`, it re-measures only when that value changes. Use it for a
list with many layout elements, or for a layout change that no DOM change
announces:

```tsx
<motion.div
  layout
  layoutDependency={open()}
  class={open() ? "wide" : "narrow"}
/>
```

Put `layoutScroll` on a scrolling container. Without it, scrolling is read as
the children moving, and they animate.

## Instant changes

`instantLayoutTransition(update)` runs `update` and applies the layout changes
it makes at once, without animating them. The next change animates as usual.

`resetLayout()` forgets every measurement, so the next layout is a fresh
baseline and not the end of an animation. Call it when the DOM is replaced
wholesale, such as on a page change.

```tsx
import { instantLayoutTransition } from "@totallynotdavid/solid-motion";

instantLayoutTransition(() => setSorted(true));
```

## Reduced motion

Under `reducedMotion` and `skipAnimations` (see
[configuration](configuration.md)), a layout change is applied at once.
