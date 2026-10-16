import {
  children as resolveChildren,
  createContext,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  getOwner,
  runWithOwner,
  untrack,
  useContext,
  type Accessor,
  type Element,
} from "solid-js";

import {
  measureForPop,
  pop,
  popAnchorFor,
  type PopAnchor,
  type PopSnapshot,
  type PresenceBehaviour,
} from "./pop-layout";
import type { PresenceScope } from "./types";

const PresenceContext = createContext<PresenceScope | null>(null);

/**
 * The presence boundary this element sits in, or `null` when it sits outside
 * one. Outside a boundary an element is always present and nothing waits on it.
 */
export function usePresence(): PresenceScope | null {
  return useContext(PresenceContext);
}

/**
 * Whether this part of the tree is on screen, as opposed to playing its exit.
 * Outside a boundary it is always `true`.
 */
export function useIsPresent(): Accessor<boolean> {
  const scope = useContext(PresenceContext);
  return () => (scope ? scope.isPresent() : true);
}

/**
 * The boundary's `custom` value. It is how data reaches a subtree that has
 * already left its owner's props, which is when an exit has to know where to
 * go.
 */
export function usePresenceData<T = unknown>(): Accessor<T | undefined> {
  const scope = useContext(PresenceContext);
  return () => scope?.custom() as T | undefined;
}

interface PresenceChildProps {
  children: Element;
  isPresent: boolean;
  initial?: boolean;
  custom?: unknown;
  /** Take the subtree's top-level elements out of flow when it starts to leave. */
  pop?: PopAnchor;
  /** Leave when the enclosing boundary leaves, and keep it waiting meanwhile. */
  propagate?: boolean;
  onExitComplete: () => void;
}

/**
 * Owns one item's exit. Elements underneath announce that they are animating
 * out by taking a hold; the item leaves when the last one is released.
 *
 * A hold is not a promise. A cancelled motion animation's `finished` never
 * resolves and never rejects, so a protocol built on promises hangs the moment
 * an exit is interrupted. Releasing is something the element does on every
 * terminal path, including the one where it lost.
 */
export function PresenceChild(props: PresenceChildProps) {
  const parent = useContext(PresenceContext);
  let holds = 0;
  let parentRelease: VoidFunction | undefined;
  let nodes: ReturnType<typeof resolveChildren> | undefined;
  let unpop: VoidFunction | undefined;

  const isPresent = () =>
    props.isPresent && !(props.propagate && parent && !parent.isPresent());

  const leaveIfDone = () => {
    if (holds !== 0) return;
    // The item can come back inside the same flush that its exit started in.
    if (untrack(isPresent)) return;
    parentRelease?.();
    parentRelease = undefined;
    props.onExitComplete();
  };

  const scope: PresenceScope = {
    isPresent,
    initial: () => props.initial,
    custom: () => props.custom,
    hold: () => {
      holds += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds -= 1;
        leaveIfDone();
      };
    },
  };

  let wasPresent = true;
  createEffect(
    () => {
      const present = isPresent();
      // The measurement has to precede whatever this same update does to the
      // document, such as a sibling entering. Effect computes all run before
      // any DOM write of the flush, which an apply step does not.
      let snapshots: PopSnapshot[] = [];
      if (!present && wasPresent && props.pop) {
        snapshots = untrack(() => nodes?.toArray() ?? [])
          .filter((node): node is HTMLElement => node instanceof HTMLElement)
          .map(measureForPop);
      }
      wasPresent = present;
      return {
        present,
        snapshots,
        anchor: props.pop,
        followsParent: !!(props.propagate && parent && !parent.isPresent()),
      };
    },
    ({ present, snapshots, anchor, followsParent }) => {
      if (present) {
        unpop?.();
        unpop = undefined;
        parentRelease?.();
        parentRelease = undefined;
        return;
      }

      if (anchor && snapshots.length > 0) {
        const undo = snapshots.map((snapshot) => pop(snapshot, anchor));
        unpop = () => undo.forEach((restore) => restore());
      }

      // Taken in the flush the parent started leaving in, so the parent's own
      // count is final by the time it checks.
      if (followsParent && parent && !parentRelease) {
        parentRelease = parent.hold();
      }

      // Anything with an exit to play takes its hold in this same flush, so by
      // the next microtask the count is final. Still zero means nothing under
      // this item had an exit at all, and it can leave now.
      queueMicrotask(leaveIfDone);
    },
  );

  const Body = () => {
    nodes = resolveChildren(() => props.children);
    return <>{nodes()}</>;
  };

  return (
    <PresenceContext value={scope}>
      <Body />
    </PresenceContext>
  );
}

/** One subtree the boundary is keeping on screen, entering or on its way out. */
interface Rendering {
  /** The `when` value it was built for; identity decides whether it survives. */
  key: unknown;
  nodes: Element;
  present: Accessor<boolean>;
  setPresent: (present: boolean) => void;
  dispose: VoidFunction;
}

export interface AnimatePresenceProps<T> extends PresenceBehaviour {
  /**
   * What is on screen, and its identity in one value. Falsy renders nothing;
   * changing it to a different truthy value swaps, with the outgoing subtree
   * animating out while the incoming one animates in.
   */
  when: T;
  children: (value: NonNullable<T>) => Element;
  /** `false` skips the entrance on first render, for a subtree already on screen. */
  initial?: boolean;
  custom?: unknown;
  onExitComplete?: () => void;
}

/**
 * Keeps a subtree mounted while it animates out.
 *
 * `when` rather than a conditional child, because Solid disposes a branch the
 * moment its condition flips: by the time a boundary could notice the child had
 * gone, the motion element's cleanup has already run and there is nothing left
 * to animate. React can hold a removed child because it re-renders and diffs;
 * Solid gives no such window. So the boundary builds the subtree itself, in a
 * root parented to this component, and decides when that root is torn down.
 *
 * That is also why `when` doubles as the key. It is the one value the caller
 * already has, and Motion's own `key` prop on the child says the same thing.
 */
export function AnimatePresence<T>(props: AnimatePresenceProps<T>): Element {
  const owner = getOwner();

  const remove = (rendering: Rendering) => {
    // Dropped from the list first: Solid takes the nodes out of the document,
    // and only then is it safe to tear down the reactivity behind them.
    //
    // Decided inside the updater: a signal read still returns the old list
    // until the next flush, so reading it afterwards would count the subtree
    // that has just left as still leaving, and the callback would never fire.
    let stillLeaving = false;
    setRenderings((current) => {
      const remaining = current.filter((entry) => entry !== rendering);
      stillLeaving = remaining.some((entry) => !untrack(entry.present));
      return remaining;
    });
    rendering.dispose();

    if (!stillLeaving) props.onExitComplete?.();
  };

  const build = (key: NonNullable<T>): Rendering =>
    runWithOwner(owner, () =>
      createRoot((dispose) => {
        const [present, setPresent] = createSignal(true);
        // Assigned below and read only from the callback, which cannot fire
        // before the subtree it belongs to exists.
        let rendering: Rendering;

        const nodes = (
          <PresenceChild
            isPresent={present()}
            initial={props.initial}
            custom={props.custom}
            pop={popAnchorFor(props)}
            propagate={props.propagate}
            onExitComplete={() => remove(rendering)}
          >
            {props.children(key)}
          </PresenceChild>
        );

        rendering = { key, nodes, present, setPresent, dispose };
        return rendering;
      }),
    ) as Rendering;

  // Built during render rather than from the effect below, so the server emits
  // the subtree and the first client paint carries it. An effect would leave
  // both empty. It seeds the signal instead of writing to it, because Solid 2
  // rejects a write from inside a component body.
  const [renderings, setRenderings] = createSignal<Rendering[]>(
    untrack(() => (props.when ? [build(props.when as NonNullable<T>)] : [])),
  );

  createEffect(
    () => props.when,
    (when) => {
      const current = untrack(renderings);
      const newest = current.at(-1);
      if (newest && newest.key === when && untrack(newest.present)) return;

      for (const rendering of current) rendering.setPresent(false);

      if (!when) return;

      // Coming back to a key that is still animating out revives that subtree
      // instead of building a second one beside it.
      const returning = current.find((entry) => entry.key === when);
      if (returning) {
        returning.setPresent(true);
        return;
      }

      setRenderings([...current, build(when as NonNullable<T>)]);
    },
  );

  const rendered = createMemo(() => {
    const all = renderings();
    if (props.mode !== "wait") return all;
    const leaving = all.filter((entry) => !entry.present());
    return leaving.length > 0 ? leaving : all;
  });

  return <>{rendered().map((entry) => entry.nodes)}</>;
}
