import { markup, textOf } from "./h.ts";
/** A rendered fragment as text segments: each nowrap span whole, the rest plain. */
export function segments(node: unknown): Array<{ text: string; nowrap: boolean }> {
  const html = markup(node).replace(/^<div>|<\/div>$/g, "");
  const out: Array<{ text: string; nowrap: boolean }> = [];
  for (const m of html.matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>|([^<]+)/g)) {
    if (m[1] !== undefined) out.push({ text: textOf(m[1]), nowrap: true });
    else out.push({ text: textOf(m[2]), nowrap: false });
  }
  return out;
}
