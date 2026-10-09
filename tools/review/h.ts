// Shared harness: React from the repo, render + text extraction + key checks.
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-vis/package.json");
export const React = req("react") as typeof import("react");
export const Server = req("react-dom/server") as typeof import("react-dom/server");
export const h = React.createElement;

export function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
/** Markup of a node inside a div. */
export function markup(node: unknown): string {
  return Server.renderToStaticMarkup(h("div", null, node as never));
}
export function markupStr(node: unknown): string {
  return Server.renderToString(h("div", null, node as never));
}
/** Text a copy would carry (all text nodes). */
export function textOf(html: string): string {
  return decode(html.replace(/<!-- -->/g, "").replace(/<[^>]*>/g, ""));
}
/** Text with aria-hidden spans removed (what a screen reader reads, roughly). */
export function a11yTextOf(html: string): string {
  return textOf(html.replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g, ""));
}

/** Captured console.error / console.warn output while running fn. */
export function captureWarnings<T>(fn: () => T): { value: T; warnings: string[] } {
  const warnings: string[] = [];
  const oe = console.error;
  const ow = console.warn;
  console.error = (...a: unknown[]) => { warnings.push(a.map(String).join(" ")); };
  console.warn = (...a: unknown[]) => { warnings.push(a.map(String).join(" ")); };
  try {
    return { value: fn(), warnings };
  } finally {
    console.error = oe;
    console.warn = ow;
  }
}

/** Every DYNAMIC array (one a function built; React freezes JSX's static sibling arrays in dev) needs unique keys on its elements. */
export function keyIssues(node: unknown, path = 'root'): string[] {
  const out: string[] = [];
  const visit = (n: unknown, p: string) => {
    if (Array.isArray(n)) {
      const dynamic = !Object.isFrozen(n);
      const seen = new Map<string, number>();
      n.forEach((c, i) => {
        if (dynamic && React.isValidElement(c)) {
          if (c.key == null) out.push(p + '[' + i + '] missing key');
          else if (seen.has(c.key)) out.push(p + '[' + i + '] duplicate key ' + c.key);
          else seen.set(c.key, i);
        }
        visit(c, p + '[' + i + ']');
      });
      return;
    }
    if (React.isValidElement(n)) {
      const ch = (n.props as { children?: unknown }).children;
      if (ch !== undefined) visit(ch, p + '>' + String(typeof n.type === 'string' ? n.type : (n.type as {name?: string})?.name ?? 'el'));
    }
  };
  visit(node, path);
  return out;
}

export function show(s: string): string {
  return JSON.stringify(s).replace(/[\u0080-\uffff]/g, (c) => {
    const cp = c.codePointAt(0)!;
    // keep CJK and common letters readable; escape invisibles
    if (/[\u00a0\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff\u3000]/.test(c)) return "\\u" + cp.toString(16).padStart(4, "0");
    return c;
  });
}
