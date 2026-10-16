export type StaggerParams = {
  variant: "hidden" | "visible" | "raised";
  stagger: number;
  delayChildren: number;
  direction: "first" | "last";
  when: "none" | "beforeChildren" | "afterChildren";
  duration: number;
};

export const staggerDefaults: StaggerParams = {
  variant: "visible",
  stagger: 0.1,
  delayChildren: 0,
  direction: "first",
  when: "none",
  duration: 0.4,
};

export const labels = ["One", "Two", "Three", "Four", "Five"];

/** The parent's variants. Its own state is a plain fade. */
export const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  raised: { opacity: 1 },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  raised: { opacity: 1, y: -14, scale: 1.12 },
};

export function listTransition(p: StaggerParams): {
  staggerChildren: number;
  delayChildren?: number | undefined;
  staggerDirection?: -1 | undefined;
  when?: "beforeChildren" | "afterChildren" | undefined;
  duration: number;
} {
  return {
    staggerChildren: p.stagger,
    delayChildren: p.delayChildren === 0 ? undefined : p.delayChildren,
    staggerDirection: p.direction === "last" ? -1 : undefined,
    when: p.when === "none" ? undefined : p.when,
    duration: p.duration,
  };
}

export function itemTransition(p: StaggerParams): { duration: number } {
  return { duration: p.duration };
}
