# Layout

Add `layout` to an element and it animates to its new box when a render moves or
resizes it. You change the DOM or the CSS. The element measures itself before
and after, and animates the difference.

```tsx
import { createSignal } from "solid-js";
import { motion } from "@totallynotdavid/solid-motion";

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
import { createSignal, For } from "solid-js";
import { motion } from "@totallynotdavid/solid-motion";

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

## Reduced motion

Under `reducedMotion` and `skipAnimations` (see
[configuration](configuration.md)), a layout change is applied at once.
