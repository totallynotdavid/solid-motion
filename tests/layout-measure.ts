import { advance } from "./clock";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Supplies layout measurements because jsdom does not perform layout. */
export function stubBox(element: HTMLElement, box: () => Box) {
  element.getBoundingClientRect = () => {
    const { left, top, width, height } = box();
    return {
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

/** Returns the element's laid-out box after its projection transform. */
export function projectedBox(element: HTMLElement): Box {
  const { left, top, width, height } = element.getBoundingClientRect();
  const transform = element.style.transform;

  const translate = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(transform);
  const scale = /scale\((-?[\d.]+), (-?[\d.]+)\)/.exec(transform);
  const origin = /(-?[\d.]+)% (-?[\d.]+)%/.exec(element.style.transformOrigin);

  const [scaleX, scaleY] = scale
    ? [Number(scale[1]), Number(scale[2])]
    : [1, 1];
  const [shiftX, shiftY] = translate
    ? [Number(translate[1]), Number(translate[2])]
    : [0, 0];
  const [originX, originY] = origin
    ? [Number(origin[1]) / 100, Number(origin[2]) / 100]
    : [0.5, 0.5];

  const anchorX = left + originX * width;
  const anchorY = top + originY * height;

  return {
    left: anchorX + (left - anchorX) * scaleX + shiftX,
    top: anchorY + (top - anchorY) * scaleY + shiftY,
    width: width * scaleX,
    height: height * scaleY,
  };
}

/** Samples projected boxes across an animation. */
export async function sample(
  element: HTMLElement,
  duration: number,
): Promise<Box[]> {
  const boxes: Box[] = [];
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    boxes.push(projectedBox(element));
    await advance(16);
  }
  return boxes;
}

export const settle = () => advance(500);

export const between = (value: number, low: number, high: number) =>
  value > low && value < high;
