import {
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  merge,
  onCleanup,
  runWithOwner,
  untrack,
} from "solid-js";

import {
  attachToControls,
  isAnimationControls,
  type ControlledAnimation,
} from "./animation-controls";
import { useMotionConfig, useReducedMotionConfig } from "./config";
import { createMotionController, type MotionPass } from "./controller";
import { watchDrag } from "./drag";
import { gestureNames, watchGestures } from "./gestures";
import { buildInitialRender, toInitialValues } from "./initial";
import { useLayoutGroupId } from "./layout-group";
import { noteStyleChange } from "./layout-updates";
import { readStyleValues, resolveStyle } from "./motion-values";
import { watchPan, type Point } from "./pan";
import { usePresence } from "./presence";
import type { LayoutOptions } from "./projection";
import { resolveDefinition, resolveInitialDefinition } from "./resolve";
import { mergeLayers, withoutMovement } from "./target";
import type {
  MotionOptions,
  ResolvedMotionOptions,
  TargetAndTransition,
  Transition,
} from "./types";
import type { TemplateSource } from "./values";
import {
  createVariantScope,
  sequencePass,
  useVariants,
  type VariantLayer,
  type VariantScope,
} from "./variants";

/**
 * What `createMotion` hands back: an inline style to render the element with and
 * a ref to attach to it. Everything after the first paint is written straight to
 * the node by motion-dom, so neither of these is a reactive value the consumer
 * has to keep re-reading.
 */
export interface MotionHandle {
  /**
   * The style the element must be born carrying, on the server and in the
   * client's first render alike. Merge it over any style of your own; the
   * motion target has to win, or the first frame paints the wrong picture.
   */
  style: Record<string, string | number>;
  /**
   * The attributes it must be born carrying, for the same reason. Always empty
   * unless the element is an SVG child, where geometry like `x1` and `r` is an
   * attribute and setting it as style does nothing at all.
   */
  attrs: Record<string, string | number>;
  ref: (element: HTMLElement | SVGElement) => void;
  /**
   * The variant scope this element offers its descendants, or `null` when it
   * names no variant labels.
   *
   * Returned rather than provided, because Solid has no imperative context
   * setter: a value reaches descendants only by rendering them inside the
   * provider component. A ref runs after its own subtree already exists, so a
   * primitive cannot do it. Leaf animations, which is nearly all of them, never
   * need this; `<motion.div>` provides it for the parents that do.
   */
  scope: VariantScope | null;
}

/**
 * Animation for an element you render yourself.
 *
 * Options arrive as a thunk so they stay reactive. A fresh object on every read
 * is fine and costs nothing: values are diffed one at a time, so an unchanged
 * `opacity` in a rebuilt target is not an animation to restart.
 */
export function createMotion<TCustom = unknown>(
  requested: () => MotionOptions<TCustom>,
  /**
   * The tag being rendered, when the caller knows it. It only decides whether
   * the initial target is painted as style or as attributes; everything after
   * the first frame reads the element itself.
   */
  tag?: string,
): MotionHandle {
  const reducedMotionActive = useReducedMotionConfig();
  const config = useMotionConfig();
  const presence = usePresence();
  const layoutGroup = useLayoutGroupId();

  // Captured before `ref` fires: a ref callback runs outside any reactive
  // owner, so `onCleanup` called from inside it is silently never scheduled.
  // Registering a child's cleanup needs this owner handed back in explicitly.
  const owner = getOwner();

  // What `animate={controls}` was last told to do. Everything below reads the
  // options through `options`, where the controls have already been replaced by
  // that definition, so a controlled element is an ordinary element whose
  // `animate` happens to be written by a method call instead of a signal.
  const [controlled, setControlled] = createSignal<ControlledAnimation>();
  const options = (): ResolvedMotionOptions<TCustom> => {
    const current = requested();
    // An empty list rather than `undefined`: a controlled element offers
    // variant labels to its children from the first frame, before any call.
    // `merge`, not a spread: the options are the component's props, and
    // spreading them would read every getter, `children` included.
    return (
      isAnimationControls(current.animate)
        ? merge(current, { animate: controlled()?.definition ?? [] })
        : current
    ) as ResolvedMotionOptions<TCustom>;
  };

  // The gestures need the node inside a tracking scope, so it lives in a signal
  // rather than a plain `let` the effects could never observe.
  const [element, setElement] = createSignal<HTMLElement | SVGElement>();
  const { states: gestures, setDragging } = watchGestures(options, element);
  // Read on every event, so a `MotionConfig` that changes it is followed.
  const transformPagePoint = (point: Point) =>
    config.transformPagePoint ? config.transformPagePoint(point) : point;
  watchPan(options, element, transformPagePoint);

  const parentVariants = useVariants();
  // Read once: whether an element joins its parent's variant tree is part of
  // how it is built, like `initial`.
  const inherited =
    untrack(() => requested().inherit) === false ? null : parentVariants;
  // Only this element's own `custom` is typed. An ancestor's variant scope or a
  // presence boundary knows nothing about this element's variant map, so what
  // they carry is `unknown` and this is where it gets read as the local type.
  const custom = (): TCustom | undefined =>
    (options().custom ?? inherited?.custom() ?? presence?.custom()) as
      | TCustom
      | undefined;

  // A layer falls back to the ancestor's label only when this element says
  // nothing about it, matching Motion. An inline target is never inherited: it
  // means nothing to a child resolving against a different variants map.
  const definitionFor = (layer: VariantLayer) => {
    const own = options()[layer];
    return own !== undefined ? own : inherited?.label(layer);
  };

  const resolveLayer = (layer: VariantLayer) => {
    const target = resolveDefinition(
      definitionFor(layer),
      options().variants,
      custom(),
    );
    const override = layer === "animate" ? controlled()?.transition : undefined;
    return target && override ? { ...target, transition: override } : target;
  };

  // The initial target is resolved exactly once. It describes the element the
  // browser is handed, so re-resolving it later would describe a paint that
  // already happened. A boundary-level `initial={false}` wins over the
  // element's own option: it means "this subtree was already on screen".
  const initialTarget = untrack(() =>
    resolveInitialDefinition({
      initial: presence?.initial() === false ? false : definitionFor("initial"),
      animate: definitionFor("animate"),
      variants: options().variants,
      custom: custom(),
    }),
  );

  // Read once, like the initial target: which keys motion drives describes the
  // element, and only their values are expected to change afterwards.
  const bound = untrack(() => readStyleValues(options().style));

  // Whether the element has a template decides how it paints, so that is fixed
  // at mount. Which template it is stays a live read.
  const template: TemplateSource | undefined = untrack(
    () => options().transformTemplate,
  )
    ? () => {
        const own = options().transformTemplate;
        // Motion spells "no transform" as "none", which is no operand for
        // `${generated} rotate(5deg)`: the whole value would be invalid CSS and
        // the browser would keep the previous one.
        return (
          own &&
          ((values, generated) =>
            own(values, generated === "none" ? "" : generated))
        );
      }
    : undefined;

  // `layout`/`layoutId` describe the node, so capture them with the initial
  // target; `style` stays a live read, since projection calls it on every
  // paint rather than once at mount.
  const layout = untrack((): LayoutOptions | undefined => {
    const current = options();
    const projecting =
      current.layout ||
      current.layoutId !== undefined ||
      current.layoutScroll ||
      current.layoutRoot;
    if (!projecting) return undefined;
    const group = layoutGroup();
    return {
      layout: current.layout,
      layoutId:
        group && current.layoutId !== undefined
          ? `${group}-${current.layoutId}`
          : current.layoutId,
      scroll: current.layoutScroll,
      root: current.layoutRoot,
      anchor: current.layoutAnchor,
      crossfade: current.layoutCrossfade,
      dependency: () => options().layoutDependency,
      callbacks: () => {
        const latest = options();
        return {
          onBeforeLayoutMeasure: latest.onBeforeLayoutMeasure,
          onLayoutMeasure: latest.onLayoutMeasure,
          onLayoutAnimationStart: latest.onLayoutAnimationStart,
          onLayoutAnimationComplete: latest.onLayoutAnimationComplete,
        };
      },
      template,
      style: () => resolveStyle(options().style),
    };
  });

  // The caller's plain CSS reaches the element through Solid's own reactivity,
  // so the inline-style claim reads it as paint. Report its changes to the
  // layout watcher here. Deferred because mounting schedules its own commit.
  createEffect(
    () => {
      // `resolveStyle`, not `plainStyle`: only it calls accessor entries, so
      // their signals are subscribed in this tracking scope.
      resolveStyle(options().style);
      // Read here, in the tracking compute phase, not in the untracked apply
      // callback below.
      return element();
    },
    (node) => {
      if (node) noteStyleChange(node);
    },
    { defer: true },
  );

  const controller = createMotionController(
    toInitialValues(initialTarget),
    bound.values,
    layout,
    template,
  );
  onCleanup(controller.dispose);

  // The dependency is the caller's word that layout changed. Deferred because
  // mounting takes the first measurement itself.
  createEffect(
    () => options().layoutDependency,
    () => controller.store?.projection?.invalidate(),
    { defer: true },
  );

  // `controls.start()` promises, resolved as the pass that answers them
  // settles, or as a later one takes over.
  let epoch = 0;
  let waiting: Array<{ epoch: number; resolve: VoidFunction }> = [];
  const answerControls = (through: number) => {
    const answered = waiting.filter((call) => call.epoch <= through);
    waiting = waiting.filter((call) => call.epoch > through);
    for (const call of answered) call.resolve();
  };
  onCleanup(() => answerControls(Infinity));

  const request = (
    definition: ControlledAnimation["definition"],
    transition?: Transition,
  ) => {
    epoch += 1;
    setControlled({ definition, transition, epoch });
    return epoch;
  };

  createEffect(
    () => {
      const animate = requested().animate;
      return isAnimationControls(animate) ? animate : undefined;
    },
    (controls) =>
      controls &&
      attachToControls(controls, {
        start: (definition, transition) =>
          new Promise<void>((resolve) => {
            waiting.push({ epoch: request(definition, transition), resolve });
          }),
        set: (definition) => {
          request(definition);
          controller.set(
            toInitialValues(
              resolveDefinition(
                definition,
                untrack(options).variants,
                untrack(custom),
              ),
            ),
          );
        },
        stop: () => controller.stop(),
      }),
  );

  watchDrag(options, element, {
    store: () => controller.store,
    isPresent: () => (presence ? presence.isPresent() : true),
    setDragging,
    transformPagePoint,
  });

  const fallbackTransition = createMemo(
    () => options().transition ?? config.transition,
  );

  // An exit layer only replaces keys it defines; other animate values remain.
  const merged = createMemo(() =>
    mergeLayers(
      [
        { target: resolveLayer("animate"), active: true },
        ...gestureNames.map((name) => ({
          target: resolveLayer(name),
          active: gestures[name](),
        })),
        {
          target: resolveLayer("exit"),
          active: presence ? !presence.isPresent() : false,
        },
      ],
      fallbackTransition(),
    ),
  );

  // Create the scope before the pass effect so children can wait on this element.
  const scope = createVariantScope(options, custom, () => merged().transition);

  createEffect(
    () => {
      const present = presence ? presence.isPresent() : true;
      const reducedMotion = reducedMotionActive();

      const target = merged();
      const node = element();
      const current = options();

      // Resolved here, not in the apply step below: `sequencePass` reads
      // `orchestration()` on both scopes, which reads a `transition()` memo,
      // and a memo read from outside a tracking scope is exactly what Solid's
      // `STRICT_READ_UNTRACKED` warns about. `apply` is not a tracking scope;
      // this compute function is, so the read belongs here regardless of
      // whether the resulting object turns out to gate anything.
      const sequence = sequencePass(inherited, scope);

      return {
        present,
        definition: present ? definitionFor("animate") : definitionFor("exit"),
        target: reducedMotion ? withoutMovement(target) : target,
        fallbackTransition: fallbackTransition(),
        skipAnimations: config.skipAnimations ?? false,
        instantLayout: reducedMotion || (config.skipAnimations ?? false),
        // Read in the pass so sibling entry and exit changes restagger the row.
        delay: node && inherited ? inherited.delayFor(node) : 0,
        sequence,
        onAnimationStart: current.onAnimationStart,
        onAnimationComplete: current.onAnimationComplete,
        onUpdate: current.onUpdate,
        // Which `controls.start()` calls this pass answers.
        epoch: controlled()?.epoch ?? 0,
      };
    },
    (next) => {
      const pass: MotionPass = {
        target: next.target,
        delay: next.delay,
        skipAnimations: next.skipAnimations,
        instantLayout: next.instantLayout,
        fallbackTransition: next.fallbackTransition,
        definition: next.definition,
        sequence: next.sequence?.begin,
        onAnimationStart: next.onAnimationStart,
        onAnimationComplete: next.onAnimationComplete,
        onUpdate: next.onUpdate,
      };

      if (next.present) {
        // Superseding an exit pass releases its presence hold.
        controller.run(pass, () => {
          next.sequence?.settled();
          answerControls(next.epoch);
        });
        return;
      }

      // Take the new hold before `run`, which synchronously releases a superseded
      // pass and prevents the presence count from reaching zero between exits.
      const release = presence?.hold();
      controller.run(pass, () => {
        release?.();
        next.sequence?.settled();
        answerControls(next.epoch);
      });
    },
  );

  // Bound values stay under the caller's control when a pass stops naming them.
  const painted = buildInitialRender(
    paintTarget(bound.painted, initialTarget),
    tag,
    untrack(() => template?.()),
  );

  return {
    style: painted.style,
    attrs: painted.attrs,
    ref: (node) => {
      controller.mount(node);

      // Register during the render walk, not from an effect watching the node.
      // Solid runs every effect's compute before committing any apply, so a
      // sibling registering from an apply is too late for another sibling's
      // compute in the same mount. Registering here gives every sibling a
      // position before any of them asks for its delay.
      //
      // Refs run outside an owner, so cleanup runs under the captured owner.
      if (inherited) {
        const unregister = inherited.register(node);
        runWithOwner(owner, () => onCleanup(unregister));
      }

      setElement(node);
    },
    scope,
  };
}

/**
 * What the element is painted with on its first render: the values the caller
 * bound through `style`, with the initial target over the top.
 *
 * `undefined` when there is nothing to paint, so an element with neither keeps
 * an empty style object rather than picking up whatever an empty target builds.
 */
function paintTarget(
  painted: Record<string, string | number>,
  initialTarget: TargetAndTransition | undefined,
): TargetAndTransition | undefined {
  const hasBound = Object.keys(painted).length > 0;
  if (!hasBound) return initialTarget;
  return { ...painted, ...initialTarget };
}
