export type ScrollParams = {
  offset: "enter" | "any" | "exit" | "contain";
};

export const scrollDefaults: ScrollParams = { offset: "any" };

type Point = "start end" | "end end" | "start start" | "end start";

/** Where the card is when progress is 0, and where it is when progress is 1. */
export function offsetOf(name: ScrollParams["offset"]): [Point, Point] {
  switch (name) {
    case "enter":
      return ["start end", "end end"];
    case "exit":
      return ["start start", "end start"];
    case "any":
      return ["start end", "end start"];
    case "contain":
      return ["start start", "end end"];
  }
}
