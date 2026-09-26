/**
 * ONE JSX open-tag reader, for every guard that has to read a tag's props.   `scripts/lib/jsx-open-tag.mts`
 *
 * ⭐ WHY IT IS SHARED. `endOfOpenTag` was written inside `tap-target.test.mts` (§0 there proves it on
 * the inputs that defeat a regex). `single-save.test.mts` needs the same reader to read every
 * `<PendingChangesBar …>`, and a second copy is the `E-108` shape `lib/decomment.mts` records: one
 * helper, many copies, repaired one at a time. So it moved here on 2026-09-26, byte-for-byte, and
 * `tap-target` imports it back.
 *
 * ⛔ THE OBVIOUS REGEX IS WRONG TWICE OVER (both recorded in `tap-target.test.mts`'s header):
 *   · `<Tag\b([^>]*)>` stops at the FIRST `>`, and `onClick={() => …}` contains one;
 *   · a quote-aware reader still breaks on a template literal whose `${}` holds its own backticks.
 * So this is a small lexer: a stack of `"`, `'`, `` ` `` and `{`, where `${` inside a template opens
 * a new expression scope.
 *
 * ⚠️ ITS ONE KNOWN LIMIT, stated so nobody reads it as more: JSX TEXT nested inside a brace prop is
 * read as code. An apostrophe there (`detail={<>Don't</>}`) opens a string the lexer then looks for
 * the end of. A caller must treat a tag that did not close (`-1`, or an implausible length) and a
 * tag whose props came back `lost` as UNREAD and fail loudly, never as "no finding".
 *
 * ⚠️ Feed it DECOMMENTED source (`lib/decomment.mts`): a quote inside a comment inside a tag is the
 * third input a naive reader loses sync on.
 */

/**
 * Given the index of a tag's `<`, return the index of the `>` that closes the OPEN tag, or -1.
 * Tracks a stack of `"`, `'`, `` ` `` and `{`, and — the part every naive version misses — treats
 * `${` inside a template literal as pushing a new expression scope, so a backtick nested inside an
 * interpolation cannot close the outer template.
 */
export function endOfOpenTag(s: string, from: number): number {
  let i = from + 1;
  while (i < s.length && !/[\s/>]/.test(s[i])) i++;   // skip the tag name
  const stack: string[] = [];
  for (; i < s.length; i++) {
    const c = s[i];
    const top = stack[stack.length - 1];
    if (top === '"' || top === "'") {
      if (c === "\\") { i++; continue; }
      if (c === top) stack.pop();
      continue;
    }
    if (top === "`") {
      if (c === "\\") { i++; continue; }
      if (c === "`") { stack.pop(); continue; }
      if (c === "$" && s[i + 1] === "{") { stack.push("{"); i++; }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { stack.push(c); continue; }
    if (c === "{") { stack.push("{"); continue; }
    if (c === "}") { if (top === "{") stack.pop(); continue; }
    if (c === ">" && stack.length === 0) return i;
  }
  return -1;
}

const CLOSER: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/**
 * Given the index of a `(`, `[` or `{`, return the index of the bracket that closes it, or -1, so a
 * guard can take the extent of a prop value, a call (`new IntersectionObserver(…)`) or a dependency
 * array. The same lexer as `endOfOpenTag`: strings, templates and `${` scopes are skipped.
 * ⚠️ It counts BRACES and the opener's OWN kind only, and a closer that matches nothing open is
 * ignored — exactly `endOfOpenTag`'s discipline. JSX prose inside a prop (`detail={<>1) Save</>}`)
 * carries unpaired brackets, and treating them as code would lose the tag over a sentence.
 */
export function endOfBracket(s: string, from: number): number {
  const open = s[from];
  const close = CLOSER[open];
  if (!close) return -1;
  const stack: string[] = [open];
  for (let i = from + 1; i < s.length; i++) {
    const c = s[i];
    const top = stack[stack.length - 1];
    if (top === '"' || top === "'") {
      if (c === "\\") { i++; continue; }
      if (c === top) stack.pop();
      continue;
    }
    if (top === "`") {
      if (c === "\\") { i++; continue; }
      if (c === "`") { stack.pop(); continue; }
      if (c === "$" && s[i + 1] === "{") { stack.push("{"); i++; }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { stack.push(c); continue; }
    if (c === "{" || c === open) { stack.push(c); continue; }
    if ((c === "}" || c === close) && CLOSER[top] === c) {
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** What one open tag says about its props, read at the TOP LEVEL only. */
export type OpenTagProps = {
  /** the tag name as written — `PendingChangesBar`, `Button`, `button`; `""` for a fragment */
  tag: string;
  /** every top-level prop name, in source order */
  names: string[];
  /** each prop's value exactly as written — `"…"`, `'…'` or `{…}`; `""` for a bare boolean prop */
  values: Map<string, string>;
  /** a `{...x}` spread sits among the props, so what the tag receives cannot be read from source */
  spread: boolean;
  /** the walk met something it could not read — the caller must treat the tag as UNREAD */
  lost: boolean;
};

/**
 * Read an open tag's top-level props. `tag` starts at the `<` — pass `s.slice(at, endOfOpenTag(s, at) + 1)`.
 *
 * ⭐ TOP LEVEL ONLY, which is the whole point: `detail={<b onClick={save}>…</b>}` is ONE prop named
 * `detail`, and the `onClick` inside it belongs to another element. A prop whose value is a
 * condition (`onSave={dirty ? save : undefined}`) is PRESENT — this reports what the source passes,
 * never what it evaluates to.
 */
export function topLevelProps(tag: string): OpenTagProps {
  const n = tag.length;
  let i = 1;
  while (i < n && !/[\s/>]/.test(tag[i])) i++;
  const out: OpenTagProps = { tag: tag.slice(1, i), names: [], values: new Map(), spread: false, lost: false };
  const endOfQuote = (at: number): number => {
    for (let j = at + 1; j < n; j++) {
      if (tag[j] === "\\") { j++; continue; }
      if (tag[j] === tag[at]) return j;
    }
    return -1;
  };
  const NAME = /[A-Za-z_$][\w$.:-]*/y;
  while (i < n) {
    const c = tag[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === ">" || (c === "/" && tag[i + 1] === ">")) return out;
    if (c === "{") {
      const j = endOfBracket(tag, i);
      if (j < 0) { out.lost = true; return out; }
      if (tag.slice(i + 1, j).trim().startsWith("...")) out.spread = true;
      i = j + 1;
      continue;
    }
    NAME.lastIndex = i;
    const m = NAME.exec(tag);
    if (!m) { out.lost = true; return out; }
    const name = m[0];
    i += name.length;
    let k = i;
    while (k < n && /\s/.test(tag[k])) k++;
    let value = "";
    if (tag[k] === "=") {
      k++;
      while (k < n && /\s/.test(tag[k])) k++;
      const q = tag[k];
      const end = q === '"' || q === "'" ? endOfQuote(k) : q === "{" ? endOfBracket(tag, k) : -1;
      if (end < 0) { out.lost = true; return out; }
      value = tag.slice(k, end + 1);
      i = end + 1;
    }
    out.names.push(name);
    out.values.set(name, value);
  }
  // Ran off the end without meeting `>` — the slice was not a whole open tag.
  out.lost = true;
  return out;
}
