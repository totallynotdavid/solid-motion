const threshold = 50;
const maxSpeed = 25;

type Axis = "x" | "y";
type Edge = "start" | "end";

interface Active {
  edge: Edge;
  /** How far the container could scroll when this edge engaged. */
  limit: number;
}

const isDocumentScroll = (element: HTMLElement) =>
  element === document.body || element === document.documentElement;

function findScrollableAncestor(
  element: Element,
  axis: Axis,
): HTMLElement | null {
  let current = element.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    const overflow = axis === "x" ? style.overflowX : style.overflowY;
    if (
      overflow === "auto" ||
      overflow === "scroll" ||
      isDocumentScroll(current)
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function edgeSpeed(
  pointer: number,
  container: HTMLElement,
  axis: Axis,
): { amount: number; edge: Edge | null } {
  const rect = container.getBoundingClientRect();
  const start = Math.max(0, axis === "x" ? rect.left : rect.top);
  const end = Math.min(
    axis === "x" ? window.innerWidth : window.innerHeight,
    axis === "x" ? rect.right : rect.bottom,
  );

  const fromStart = pointer - start;
  const fromEnd = end - pointer;

  if (fromStart < threshold) {
    const intensity = 1 - fromStart / threshold;
    return { amount: -maxSpeed * intensity * intensity, edge: "start" };
  }
  if (fromEnd < threshold) {
    const intensity = 1 - fromEnd / threshold;
    return { amount: maxSpeed * intensity * intensity, edge: "end" };
  }
  return { amount: 0, edge: null };
}

/**
 * Scrolls the nearest scrollable ancestor of a dragged list while the pointer
 * is near its edge. Each drag owns one, so two lists dragged at once do not
 * share state.
 */
export interface AutoScroll {
  /**
   * `pointer` is the page coordinate on `axis` and `velocity` its speed there.
   * Scrolling starts only once the pointer is moving towards the edge, and
   * stops at the extent the container had then, so dragging past the end of a
   * list that grows as it scrolls does not run away.
   */
  update(list: Element, pointer: number, axis: Axis, velocity: number): void;
  reset(): void;
}

export function createAutoScroll(): AutoScroll {
  const active = new Map<HTMLElement, Active>();

  return {
    update(list, pointer, axis, velocity) {
      const container = findScrollableAncestor(list, axis);
      if (!container) return;

      // Pointer events report page coordinates; the container's box is in the
      // viewport.
      const viewportPointer =
        pointer - (axis === "x" ? window.scrollX : window.scrollY);
      const { amount, edge } = edgeSpeed(viewportPointer, container, axis);

      if (edge === null) {
        active.delete(container);
        return;
      }

      const onDocument = isDocumentScroll(container);
      if (active.get(container)?.edge !== edge) {
        const towardsEdge = edge === "start" ? velocity < 0 : velocity > 0;
        if (!towardsEdge) return;

        const limit =
          axis === "x"
            ? container.scrollWidth -
              (onDocument ? window.innerWidth : container.clientWidth)
            : container.scrollHeight -
              (onDocument ? window.innerHeight : container.clientHeight);
        active.set(container, { edge, limit });
      }

      if (amount > 0) {
        const position =
          axis === "x"
            ? onDocument
              ? window.scrollX
              : container.scrollLeft
            : onDocument
              ? window.scrollY
              : container.scrollTop;
        if (position >= active.get(container)!.limit) return;
      }

      if (onDocument) {
        window.scrollBy(axis === "x" ? { left: amount } : { top: amount });
      } else if (axis === "x") {
        container.scrollLeft += amount;
      } else {
        container.scrollTop += amount;
      }
    },

    reset() {
      active.clear();
    },
  };
}
