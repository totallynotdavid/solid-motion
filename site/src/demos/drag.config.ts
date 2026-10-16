export type DragParams = {
  axis: "both" | "x" | "y";
  constraint: number;
  elastic: number;
  snapBack: boolean;
};

export const dragDefaults: DragParams = {
  axis: "both",
  constraint: 90,
  elastic: 0.35,
  snapBack: false,
};

export function dragProps(p: DragParams): {
  drag: true | "x" | "y";
  dragConstraints: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  dragElastic: number;
  dragMomentum: false;
  dragSnapToOrigin: boolean;
  whileDrag: { scale: number };
} {
  return {
    drag: p.axis === "both" ? true : p.axis,
    dragConstraints: {
      left: -p.constraint,
      right: p.constraint,
      top: -p.constraint / 2,
      bottom: p.constraint / 2,
    },
    dragElastic: p.elastic,
    dragMomentum: false,
    dragSnapToOrigin: p.snapBack,
    whileDrag: { scale: 1.1 },
  };
}

/** The dashed box the constraints draw, so the limit is visible. */
export function areaSize(p: DragParams): { width: number; height: number } {
  const box = 56;
  return { width: 2 * p.constraint + box, height: p.constraint + box };
}
