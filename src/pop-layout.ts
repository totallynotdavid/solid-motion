export interface PopAnchor {
  x: "left" | "right";
  y: "top" | "bottom";
}

/**
 * What an element occupies inside its containing block, read while it is still
 * in flow. Taking the measurement and applying it are separate steps because
 * the measurement has to happen before a sibling enters and moves the element.
 */
export interface PopSnapshot {
  element: HTMLElement;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function measureForPop(element: HTMLElement): PopSnapshot {
  const rect = element.getBoundingClientRect();
  const computed = getComputedStyle(element);
  // The computed size is the untransformed box. The rect would include a scale
  // the element is mid-way through, and the popped box must not carry it twice.
  const width = parseFloat(computed.width) || rect.width;
  const height = parseFloat(computed.height) || rect.height;

  const parent = element.offsetParent;
  if (!(parent instanceof HTMLElement)) {
    // No offset parent means a fixed element or one against the initial
    // containing block, and both measure from the viewport.
    const viewport = document.documentElement;
    return {
      element,
      width,
      height,
      top: rect.top,
      left: rect.left,
      right: viewport.clientWidth - width - rect.left,
      bottom: viewport.clientHeight - height - rect.top,
    };
  }

  const parentRect = parent.getBoundingClientRect();
  const top = rect.top - parentRect.top - parent.clientTop + parent.scrollTop;
  const left =
    rect.left - parentRect.left - parent.clientLeft + parent.scrollLeft;
  return {
    element,
    width,
    height,
    top,
    left,
    right: parent.clientWidth - width - left,
    bottom: parent.clientHeight - height - top,
  };
}

const popped = [
  "position",
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
];

/**
 * Takes the element out of flow at the place it was measured, so siblings
 * close the gap at once while it plays its exit. Returns the undo, which puts
 * back whatever inline value each property had.
 */
export function pop(snapshot: PopSnapshot, anchor: PopAnchor): VoidFunction {
  const { element } = snapshot;
  const style = element.style;
  const before = popped.map((name) => [
    name,
    style.getPropertyValue(name),
    style.getPropertyPriority(name),
  ]);

  const set = (name: string, value: string) =>
    style.setProperty(name, value, "important");

  set("position", "absolute");
  set("width", `${snapshot.width}px`);
  set("height", `${snapshot.height}px`);
  for (const name of ["top", "left", "right", "bottom"]) {
    style.removeProperty(name);
  }
  set(anchor.y, `${snapshot[anchor.y]}px`);
  set(anchor.x, `${snapshot[anchor.x]}px`);

  return () => {
    for (const [name, value, priority] of before) {
      if (value) style.setProperty(name, value, priority);
      else style.removeProperty(name);
    }
  };
}

/** The presence props that decide how an exiting subtree is held. */
export interface PresenceBehaviour {
  /**
   * `sync` plays exits and entrances together. `wait` holds the newcomer back
   * until the outgoing subtree is gone. `popLayout` takes the outgoing
   * subtree's top-level elements out of flow, so siblings close the gap while
   * it plays its exit.
   */
  mode?: "sync" | "wait" | "popLayout";
  /** Which side a popped element stays pinned to. Defaults to `"left"`. */
  anchorX?: PopAnchor["x"];
  /** Which side a popped element stays pinned to. Defaults to `"top"`. */
  anchorY?: PopAnchor["y"];
  /** Exit when an enclosing boundary exits, and hold that boundary open. */
  propagate?: boolean;
}

export function popAnchorFor(
  behaviour: PresenceBehaviour,
): PopAnchor | undefined {
  return behaviour.mode === "popLayout"
    ? { x: behaviour.anchorX ?? "left", y: behaviour.anchorY ?? "top" }
    : undefined;
}
