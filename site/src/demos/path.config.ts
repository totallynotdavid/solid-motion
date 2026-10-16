export type PathParams = {
  distance: number;
  strength: number;
  direction: "auto" | "cw" | "ccw";
  rotate: boolean;
  duration: number;
};

export const pathDefaults: PathParams = {
  distance: 180,
  strength: 0.5,
  direction: "auto",
  rotate: false,
  duration: 1.2,
};

/** How far the box rises while it travels. */
export const rise = 70;
