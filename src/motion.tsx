import { Dynamic, type JSX } from "@solidjs/web";
import { createMemo, merge, omit } from "solid-js";

import { createMotion } from "./create-motion";
import { plainStyle } from "./motion-values";
import { motionOptionKeys } from "./option-keys";
import type { MotionComponent, MotionProps, MotionProxy } from "./types";
import { VariantContext } from "./variants";

const motionPropKeys = [...motionOptionKeys, "ref"] as const;

type MotionHost =
  | keyof JSX.IntrinsicElements
  | ((props: Record<string, unknown>) => JSX.Element);

/**
 * `createMotion` plus a component boundary and a prop spread. The component
 * provides the variant scope, because only a component can render descendants
 * inside a provider.
 */
function createMotionComponent<TProps extends object>(host: MotionHost) {
  const tag = typeof host === "string" ? host : undefined;

  return (props: TProps & MotionProps): JSX.Element => {
    const motion = createMotion(() => props, tag);
    const forwarded = omit(props, ...motionPropKeys);
    const style = createMemo(
      () => merge(plainStyle(props.style), motion.style) as JSX.CSSProperties,
    );

    const DynamicComponent = Dynamic as unknown as (
      props: Record<string, unknown>,
    ) => JSX.Element;
    // Render lazily so descendants are created inside the variant provider.
    const renderElement = () => (
      <DynamicComponent
        component={host}
        {...forwarded}
        {...motion.attrs}
        style={style()}
        ref={[motion.ref, props.ref]}
      />
    );

    if (!motion.scope) return renderElement();
    return (
      <VariantContext value={motion.scope}>{renderElement()}</VariantContext>
    );
  };
}

const componentCache = new Map<string, MotionComponent<MotionProps>>();
const createCustomMotion = <TProps extends object>(
  component: MotionComponent<TProps>,
) =>
  createMotionComponent<TProps>(
    component as unknown as (props: Record<string, unknown>) => JSX.Element,
  );

export const motion = new Proxy(
  { create: createCustomMotion },
  {
    get(target, key: string) {
      if (key === "create") return target.create;
      if (!componentCache.has(key)) {
        componentCache.set(
          key,
          createMotionComponent<object>(key as keyof JSX.IntrinsicElements),
        );
      }
      return componentCache.get(key);
    },
  },
) as unknown as MotionProxy;
