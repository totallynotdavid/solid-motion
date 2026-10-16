import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { motion } from "../src";
import { advance, useFakeClock } from "./clock";
import { projectedBox, settle, stubBox } from "./layout-measure";

useFakeClock();

describe("transformTemplate", () => {
  afterEach(() => document.body.replaceChildren());

  it("composes the transform from the element's initial values", () => {
    const { container } = render(() => (
      <motion.div
        initial={{ x: 20 }}
        transformTemplate={(_, generated) => `perspective(500px) ${generated}`}
      />
    ));

    expect(container.querySelector("div")!.style.transform).toBe(
      "perspective(500px) translateX(20px)",
    );
  });

  it("hands the template the transform values as they animate", async () => {
    const seen: Array<number | string | undefined> = [];
    const { container } = render(() => (
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: 100 }}
        transition={{ duration: 0.2, ease: "linear" }}
        transformTemplate={({ x }, generated) => {
          seen.push(x);
          return `${generated} rotate(5deg)`;
        }}
      />
    ));
    const element = container.querySelector("div") as HTMLElement;
    flush();

    await advance(100);
    const midway = element.style.transform;
    await settle();

    expect(midway).toMatch(
      /^translateX\((?!0px|100px)[\d.]+px\) rotate\(5deg\)$/,
    );
    expect(element.style.transform).toBe("translateX(100px) rotate(5deg)");
    expect(seen.some((x) => !["0px", "100px"].includes(String(x)))).toBe(true);
  });

  it("keeps the template while the element animates its layout", async () => {
    const [wide, setWide] = createSignal(false);
    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout
          transition={{ duration: 0.2 }}
          transformTemplate={(_, generated) => `${generated} rotate(5deg)`}
        />
      </div>
    ));
    const element = container.querySelector(".box") as HTMLElement;
    stubBox(element, () =>
      wide()
        ? { left: 200, top: 0, width: 100, height: 100 }
        : { left: 0, top: 0, width: 100, height: 100 },
    );
    await advance(50);

    setWide(true);
    flush();
    await advance(100);
    expect(element.style.transform).toContain("rotate(5deg)");

    await settle();
    expect(element.style.transform).toContain("rotate(5deg)");
    expect(projectedBox(element).left).toBe(200);
  });
});
