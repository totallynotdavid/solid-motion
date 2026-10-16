import {
  createContext,
  createMemo,
  useContext,
  type Accessor,
  type Element,
  type ParentProps,
} from "solid-js";

export interface LayoutGroupProps {
  /** Prefixes the `layoutId` of every element inside, as `id-layoutId`. */
  id?: string;
  /**
   * Whether the ids of the groups above are kept in front of this group's own.
   * `false` starts a namespace of its own.
   * @default true
   */
  inherit?: boolean;
}

const LayoutGroupContext = createContext<Accessor<string | undefined>>(
  () => undefined,
);

/**
 * Namespaces the `layoutId`s inside it, so two copies of a component that use
 * the same `layoutId` do not animate between each other.
 */
export function LayoutGroup(props: ParentProps<LayoutGroupProps>): Element {
  const upstream = useContext(LayoutGroupContext);

  const id = createMemo(() => {
    const above = props.inherit === false ? undefined : upstream();
    return above && props.id ? `${above}-${props.id}` : (above ?? props.id);
  });

  return <LayoutGroupContext value={id}>{props.children}</LayoutGroupContext>;
}

/** Reads the enclosing group's id, which prefixes this element's `layoutId`. */
export function useLayoutGroupId(): Accessor<string | undefined> {
  return useContext(LayoutGroupContext);
}
