/**
 * THE CLIENT ELEMENTS A PAGE'S PAYLOAD HANDS THE BROWSER, READ OUT OF ITS FLIGHT (MASWALI-BUILD S5-DESIGN-DOORS round 2).
 * `qa:maswali-door-dark` reads, for each client element in a served payload, the module its reference names and the props
 * the server handed it — the bytes the dark-safety rule is about (a prop handed to client code is written into the
 * payload; a server component's never is).
 *
 *   flightOfDocument(html)  the Flight text a document carries: its inline pushes, decoded as the browser decodes them;
 *   clientElements(flight)  every `["$","$L<row>",key,{props},…]` whose row is a client reference (`<row>:I[…]`), with the
 *                           module it names and its props parsed (null when they are not plain JSON).
 * ⚠️ React 19.2's Flight writes a repeated string once, as its own row (`126:"[project]/src/…/markets-ghost.tsx …"`), and a
 *    reference row names its module through it (`128:I["$126",[…],"default"]`): a name is resolved through those rows.
 */

/** The Flight text a document carries: its inline pushes (`self.__next_f.push([1,"…"])`), each a JSON string, joined. */
export function flightOfDocument(html) {
  let out = "";
  for (const m of String(html).matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) out += JSON.parse(m[1]);
  return out;
}

/** The object literal that opens at `s[at]` ("{"), through its balanced close, strings respected; null if unbalanced. */
function objectAt(s, at) {
  let depth = 0, inStr = false;
  for (let i = at; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "\\") i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return s.slice(at, i + 1);
  }
  return null;
}

/** Every client element in a Flight text: `{ module, name, props, text }` — the module its reference row names and the
 *  export it takes (both resolved through the string rows: one file may hand the browser two exports, as markets-ghost.tsx
 *  hands the board's loading picture, `default`, and the page's fallback, `MarketsBoardGhost`), the props handed to it
 *  (parsed, or null), and their text as written. */
export function clientElements(flight) {
  const s = String(flight);
  const strings = new Map();
  for (const m of s.matchAll(/(?:^|\n)([0-9a-f]+):("(?:[^"\\]|\\.)*")(?=\n|$)/g)) strings.set(m[1], JSON.parse(m[2]));
  const named = (v) => (typeof v === "string" && /^\$[0-9a-f]+$/.test(v) ? strings.get(v.slice(1)) ?? v : v);
  const refs = new Map();
  for (const m of s.matchAll(/(?:^|\n)([0-9a-f]+):I(\[[^\n]*\])(?=\n|$)/g)) {
    let row = null;
    try { row = JSON.parse(m[2]); } catch { row = null; }
    if (Array.isArray(row)) refs.set(m[1], { module: String(named(row[0])), name: String(named(row[2] ?? "")) });
  }
  const out = [];
  for (const m of s.matchAll(/\["\$","\$L([0-9a-f]+)",(?:null|"(?:[^"\\]|\\.)*"),\{/g)) {
    const ref = refs.get(m[1]);
    if (ref === undefined) continue;
    const text = objectAt(s, m.index + m[0].length - 1);
    let props = null;
    try { props = text === null ? null : JSON.parse(text); } catch { props = null; }
    out.push({ ...ref, props, text });
  }
  return out;
}
