/** Source text of an expression that is not data, such as `stagger(0.1)`. */
export class Raw {
  constructor(readonly source: string) {}
}

export function raw(source: string): Raw {
  return new Raw(source);
}

const key = /^[A-Za-z_$][\w$]*$/;

/** Rounds away float noise such as 0.30000000000000004. */
export function num(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * Prints a value the way a person would write it: unquoted keys, double
 * quotes, one line when it fits and one entry per line when it does not.
 */
export function literal(value: unknown, indent = 0, width = 64): string {
  if (value instanceof Raw) return value.source;
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return num(value);
  if (typeof value === "boolean" || value === null) return String(value);
  if (value === undefined) return "undefined";
  const pad = "  ".repeat(indent + 1);
  const close = "  ".repeat(indent);
  if (Array.isArray(value)) {
    const items = value.map((item) => literal(item, indent + 1, width));
    const inline = `[${items.join(", ")}]`;
    if (inline.length <= width && !inline.includes("\n")) return inline;
    return `[\n${items.map((item) => `${pad}${item},`).join("\n")}\n${close}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(
        ([name, entry]) =>
          `${key.test(name) ? name : JSON.stringify(name)}: ${literal(entry, indent + 1, width)}`,
      );
    if (entries.length === 0) return "{}";
    const inline = `{ ${entries.join(", ")} }`;
    if (inline.length <= width && !inline.includes("\n")) return inline;
    return `{\n${entries.map((entry) => `${pad}${entry},`).join("\n")}\n${close}}`;
  }
  return String(value);
}

/** One JSX attribute: `x="a"`, `x={1}`, `x={{ a: 1 }}`, or `x` for `true`. */
function attribute(name: string, value: unknown, indent = 0): string {
  if (value === true) return name;
  if (typeof value === "string") return `${name}="${value}"`;
  return `${name}={${literal(value, indent)}}`;
}

export type Props = Record<string, unknown>;

/**
 * Prints an opening tag. Attributes sit on one line when there are few and
 * short, and one per line otherwise.
 */
export function openTag(
  tag: string,
  props: Props,
  options: { indent?: number; selfClose?: boolean } = {},
): string {
  const { indent = 0, selfClose = false } = options;
  const attrs = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) => attribute(name, value, indent + 1));
  const end = selfClose ? " />" : ">";
  const inline = `<${tag}${attrs.map((attr) => ` ${attr}`).join("")}${end}`;
  if (attrs.length === 0) return `<${tag}${end}`;
  if (inline.length + indent * 2 <= 72 && !inline.includes("\n")) return inline;
  const pad = "  ".repeat(indent + 1);
  const close = "  ".repeat(indent);
  return `<${tag}\n${attrs.map((attr) => `${pad}${attr}`).join("\n")}\n${close}${selfClose ? "/>" : ">"}`;
}

export type Library = "solid" | "react";

const packages: Record<Library, string> = {
  solid: "@totallynotdavid/solid-motion",
  react: "motion/react",
};

/** The import line for a library, then a blank line, then `body`. */
export function withImport(
  library: Library,
  names: string[],
  body: string,
): string {
  return `import { ${names.join(", ")} } from "${packages[library]}";\n\n${body}`;
}
