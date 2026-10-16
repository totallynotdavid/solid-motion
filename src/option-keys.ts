import type { MotionOptions } from "./types";

/**
 * Every key of `MotionOptions`, as a record so the compiler rejects a new
 * option that is not listed. `<motion.div>` strips these from the props it
 * forwards to the element; an unlisted one would be written to the DOM as an
 * attribute.
 */
const optionKeys: Record<keyof MotionOptions, true> = {
  animate: true,
  custom: true,
  drag: true,
  dragConstraints: true,
  dragControls: true,
  dragDirectionLock: true,
  dragElastic: true,
  dragListener: true,
  dragMomentum: true,
  dragPropagation: true,
  dragSnapToOrigin: true,
  dragTransition: true,
  exit: true,
  globalTapTarget: true,
  inherit: true,
  initial: true,
  layout: true,
  layoutAnchor: true,
  layoutCrossfade: true,
  layoutDependency: true,
  layoutId: true,
  layoutRoot: true,
  layoutScroll: true,
  onAnimationComplete: true,
  onAnimationStart: true,
  onBeforeLayoutMeasure: true,
  onDirectionLock: true,
  onDrag: true,
  onDragEnd: true,
  onDragStart: true,
  onDragTransitionEnd: true,
  onHoverEnd: true,
  onHoverStart: true,
  onLayoutAnimationComplete: true,
  onLayoutAnimationStart: true,
  onLayoutMeasure: true,
  onMeasureDragConstraints: true,
  onPan: true,
  onPanEnd: true,
  onPanSessionStart: true,
  onPanStart: true,
  onTap: true,
  onTapCancel: true,
  onTapStart: true,
  onUpdate: true,
  onViewportEnter: true,
  onViewportLeave: true,
  propagate: true,
  style: true,
  transformTemplate: true,
  transition: true,
  variants: true,
  viewport: true,
  whileDrag: true,
  whileFocus: true,
  whileHover: true,
  whileInView: true,
  whileTap: true,
};

export const motionOptionKeys = Object.keys(optionKeys) as Array<
  keyof MotionOptions
>;
