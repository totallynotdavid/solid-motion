import { type JSX } from "@solidjs/web";
import { isMotionValue, type PanInfo } from "motion-dom";
import {
  createContext,
  createEffect,
  createSignal,
  omit,
  untrack,
  useContext,
  type Element,
} from "solid-js";

import { createAutoScroll } from "./auto-scroll";
import { motion } from "./motion";
import { createMotionValue, createTransform } from "./motion-values";
import type { LayoutBox } from "./projection";
import {
  checkReorder,
  detectAxis,
  type Offset,
  type ReorderAxis,
} from "./reorder-order";
import type { MotionComponent, MotionProps, MotionValue } from "./types";

type Tag = keyof JSX.IntrinsicElements;

/** The motion component for an element name, which the proxy builds on demand. */
const motionFor = (tag: Tag) =>
  (motion as unknown as Record<string, MotionComponent>)[tag as string];

export interface ReorderGroupProps<V> extends Omit<MotionProps, "ref"> {
  /** The element to render. @default "ul" */
  as?: Tag;
  /** The values in the list, in the order they are shown. */
  values: V[];
  /** Called with the new order as an item is dragged past its neighbours. */
  onReorder: (values: V[]) => void;
  /**
   * The direction items are dragged in. Read from where the items sit when
   * left out: `"x"` side by side, `"y"` stacked, `"xy"` wrapping into rows.
   */
  axis?: ReorderAxis;
  ref?: JSX.Ref<unknown>;
}

export interface ReorderItemProps<V> extends Omit<
  MotionProps,
  "layout" | "ref"
> {
  /** The element to render. @default "li" */
  as?: Tag;
  /** The entry of the group's `values` this item stands for. */
  value: V;
  /** `"position"` moves the item without resizing it. @default true */
  layout?: true | "position";
  ref?: JSX.Ref<unknown>;
}

interface ReorderContextValue<V> {
  axis: () => ReorderAxis;
  registerItem(value: V, layout: LayoutBox): void;
  updateOrder(value: V, offset: Offset, velocity: Offset): void;
  autoScroll(info: PanInfo): void;
  endDrag(): void;
}

const ReorderContext = createContext<ReorderContextValue<never> | null>(null);

/** Hands an element to a `ref` prop, which may be a function or an array of them. */
function assignRef(ref: unknown, element: unknown): void {
  if (typeof ref === "function") ref(element);
  else if (Array.isArray(ref))
    for (const entry of ref) assignRef(entry, element);
}

/**
 * A list whose items the user reorders by dragging them past each other. It
 * holds no state: it reports the new order through `onReorder` and shows
 * whatever `values` it is given next.
 */
function Group<V>(props: ReorderGroupProps<V>): Element {
  const Component = motionFor(untrack(() => props.as ?? "ul"));
  const layouts = new Map<V, LayoutBox>();
  const autoScroll = createAutoScroll();
  const [detected, setDetected] = createSignal<ReorderAxis>("y");
  const axis = () => props.axis ?? detected();

  let list: HTMLElement | undefined;
  // Set from the moment a reorder is reported until the new `values` arrive, so
  // one drag does not report the same swap again from stale measurements.
  let reordering = false;
  // Whether the pointer press now in progress has moved an item.
  let reordered = false;

  const measured = () => {
    const present = new Set(props.values);
    for (const value of layouts.keys()) {
      if (!present.has(value)) layouts.delete(value);
    }
    return props.values.flatMap((value) => {
      const layout = layouts.get(value);
      return layout ? [{ value, layout }] : [];
    });
  };

  const context: ReorderContextValue<V> = {
    axis,
    registerItem(value, layout) {
      layouts.set(value, layout);
      // Measurements arrive from the layout engine, not from a tracking scope.
      untrack(() => {
        if (!props.axis) {
          setDetected(detectAxis(measured().map((item) => item.layout)));
        }
      });
    },
    updateOrder(value, offset, velocity) {
      if (reordering) return;

      const order = measured();
      const direction =
        list && getComputedStyle(list).direction === "rtl" ? "rtl" : "ltr";
      const next = checkReorder(
        order,
        value,
        offset,
        velocity,
        axis(),
        direction,
      );
      if (next === order) return;

      reordering = true;
      reordered = true;

      // Items that have not been measured keep their place in the list.
      const values = [...props.values];
      const slots = order.map((item) => values.indexOf(item.value));
      next.forEach((item, index) => {
        values[slots[index]] = item.value;
      });
      props.onReorder(values);
    },
    autoScroll({ point, velocity }) {
      if (!list) return;
      const current = axis();
      const along =
        current === "xy"
          ? Math.abs(velocity.x) > Math.abs(velocity.y)
            ? "x"
            : "y"
          : current;
      autoScroll.update(list, point[along], along, velocity[along]);
    },
    endDrag() {
      reordered = false;
      autoScroll.reset();
    },
  };

  createEffect(
    () => props.values,
    () => {
      reordering = false;
    },
  );

  return (
    <Component
      {...omit(
        props,
        "as",
        "axis",
        "values",
        "onReorder",
        "style",
        "ref",
        "children",
      )}
      // Scroll anchoring would shift the page under a drag as items move.
      style={{ "overflow-anchor": "none", ...(props.style as object) }}
      ref={(element: HTMLElement) => {
        list = element;
        // A release that ends a reordering drag is not a click, but the browser
        // would still deliver one to whichever ancestor held both the press and
        // the release, which depends on the direction of the drag. It is
        // swallowed above every item. Clicks with no press behind them (detail
        // 0, from a keyboard) are left alone.
        element.addEventListener(
          "pointerdown",
          () => {
            reordered = false;
          },
          true,
        );
        element.addEventListener(
          "click",
          (event) => {
            if (!reordered || !event.detail) return;
            reordered = false;
            event.stopPropagation();
            event.preventDefault();
          },
          true,
        );
        assignRef(props.ref, element);
      }}
    >
      <ReorderContext value={context as ReorderContextValue<never>}>
        {props.children}
      </ReorderContext>
    </Component>
  );
}

/**
 * One draggable entry of a `Reorder.Group`. It follows the pointer on the
 * group's axis, lets go back into its slot on release, and lifts above its
 * siblings while it is away from it.
 */
function Item<V>(props: ReorderItemProps<V>): Element {
  const found = useContext(ReorderContext);
  if (!found)
    throw new Error("Reorder.Item must be rendered inside Reorder.Group.");
  const context = found as unknown as ReorderContextValue<V>;
  const Component = motionFor(untrack(() => props.as ?? "li"));

  const style = untrack(() => props.style) as
    | Record<string, unknown>
    | undefined;
  const x = isMotionValue(style?.x)
    ? (style.x as MotionValue<number>)
    : createMotionValue(0);
  const y = isMotionValue(style?.y)
    ? (style.y as MotionValue<number>)
    : createMotionValue(0);
  const zIndex = createTransform(() => (x.get() || y.get() ? 1 : "unset"));

  return (
    <Component
      drag={context.axis() === "xy" ? true : context.axis()}
      {...omit(
        props,
        "as",
        "value",
        "layout",
        "style",
        "ref",
        "onDrag",
        "onDragEnd",
        "onLayoutMeasure",
      )}
      dragSnapToOrigin
      style={{ ...style, x, y, zIndex }}
      layout={props.layout ?? true}
      onDrag={(event: PointerEvent, info: PanInfo) => {
        context.updateOrder(
          props.value,
          { x: x.get(), y: y.get() },
          info.velocity,
        );
        context.autoScroll(info);
        props.onDrag?.(event, info);
      }}
      onDragEnd={(event: PointerEvent, info: PanInfo) => {
        context.endDrag();
        props.onDragEnd?.(event, info);
      }}
      onLayoutMeasure={(box: LayoutBox, previous: LayoutBox | undefined) => {
        context.registerItem(props.value, box);
        props.onLayoutMeasure?.(box, previous);
      }}
      ref={props.ref}
    >
      {props.children}
    </Component>
  );
}

export const Reorder = { Group, Item };
