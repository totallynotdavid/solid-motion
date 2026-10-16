export type ParamValue = number | string | boolean;
export type Params = { [name: string]: ParamValue };

interface Base<P> {
  key: keyof P & string;
  label: string;
  /** Hides the control while it does not apply, such as spring options on a tween. */
  show?: (values: P) => boolean;
}

export type Control<P> =
  | (Base<P> & {
      kind: "range";
      min: number;
      max: number;
      step: number;
      unit?: string;
    })
  | (Base<P> & { kind: "select"; options: readonly string[] })
  | (Base<P> & { kind: "toggle" });

export const eases = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "circOut",
  "backOut",
  "anticipate",
] as const;
export type Ease = (typeof eases)[number];

/** The transition options that every demo exposes. */
export type TransitionParams = {
  type: "spring" | "tween";
  stiffness: number;
  damping: number;
  mass: number;
  duration: number;
  ease: Ease;
  delay: number;
};

export const springDefaults: TransitionParams = {
  type: "spring",
  stiffness: 220,
  damping: 18,
  mass: 1,
  duration: 0.6,
  ease: "easeOut",
  delay: 0,
};

export const tweenDefaults: TransitionParams = {
  ...springDefaults,
  type: "tween",
};

type WithTransition = Params & TransitionParams;

/** Spring and tween controls. Only the set that applies to `type` shows. */
export function transitionControls<P extends WithTransition>(
  options: { delay?: boolean } = {},
): Control<P>[] {
  const spring = (values: P) => values.type === "spring";
  const tween = (values: P) => values.type === "tween";
  const controls: Control<P>[] = [
    {
      key: "type",
      label: "Type",
      kind: "select",
      options: ["spring", "tween"],
    },
    {
      key: "stiffness",
      label: "Stiffness",
      kind: "range",
      min: 20,
      max: 800,
      step: 10,
      show: spring,
    },
    {
      key: "damping",
      label: "Damping",
      kind: "range",
      min: 1,
      max: 60,
      step: 1,
      show: spring,
    },
    {
      key: "mass",
      label: "Mass",
      kind: "range",
      min: 0.2,
      max: 5,
      step: 0.1,
      show: spring,
    },
    {
      key: "duration",
      label: "Duration",
      kind: "range",
      min: 0.1,
      max: 4,
      step: 0.1,
      unit: "s",
      show: tween,
    },
    {
      key: "ease",
      label: "Easing",
      kind: "select",
      options: eases,
      show: tween,
    },
  ];
  if (options.delay !== false) {
    controls.push({
      key: "delay",
      label: "Delay",
      kind: "range",
      min: 0,
      max: 2,
      step: 0.1,
      unit: "s",
    });
  }
  return controls;
}

/** Plain enough that both libraries accept it as their `transition` prop. */
export type TransitionProp =
  | {
      type: "spring";
      stiffness: number;
      damping: number;
      mass?: number | undefined;
      delay?: number | undefined;
    }
  | {
      type: "tween";
      duration: number;
      ease: Ease;
      delay?: number | undefined;
    };

/**
 * The `transition` prop for these controls. Defaults are left out, so the
 * code on the page shows only what the reader changed.
 */
export function transitionOf(values: TransitionParams): TransitionProp {
  if (values.type === "spring") {
    return {
      type: "spring",
      stiffness: values.stiffness,
      damping: values.damping,
      mass: values.mass === 1 ? undefined : values.mass,
      delay: values.delay === 0 ? undefined : values.delay,
    };
  }
  return {
    type: "tween",
    duration: values.duration,
    ease: values.ease,
    delay: values.delay === 0 ? undefined : values.delay,
  };
}
