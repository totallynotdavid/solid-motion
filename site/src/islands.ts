import "./styles.css";

/**
 * The islands a page can mount. A `<!-- island NAME -->` marker in `docs/`
 * mounts the demo, and the home page mounts `landing`.
 */
export default {
  "animate-value": () => import("./demos/animate-value"),
  config: () => import("./demos/config"),
  drag: () => import("./demos/drag"),
  draw: () => import("./demos/draw"),
  entrance: () => import("./demos/entrance"),
  follow: () => import("./demos/follow"),
  "hover-tap": () => import("./demos/hover-tap"),
  keyframes: () => import("./demos/keyframes"),
  landing: () => import("./pages/landing"),
  path: () => import("./demos/path"),
  presence: () => import("./demos/presence"),
  rows: () => import("./demos/rows"),
  "scroll-progress": () => import("./demos/scroll-progress"),
  sequence: () => import("./demos/sequence"),
  "sequence-at": () => import("./demos/sequence-at"),
  stagger: () => import("./demos/stagger"),
  switch: () => import("./demos/switch"),
  tabs: () => import("./demos/tabs"),
};
