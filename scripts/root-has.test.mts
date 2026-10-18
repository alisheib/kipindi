/**
 * test:root-has — NO `:has()` ON THE ROOT, AND THE SWITCHES THAT REPLACED IT (A21, 2026-10-14).
 *
 *   npm run test:root-has     ·     npm run red:root-has   (--prove-red: every defect below planted IN MEMORY, each caught)
 *
 * WHY. A `:has()` whose subject is `:root`/`html`/`body` made Chrome re-run the page's whole `:has()` invalidation set on
 * that element for every element added anywhere (Blink keys the `:has()` set by the pseudo, not the rule: it is the union
 * of every `:has()` rule's descendant features — `> *`, every `span`, every `[role]`). Opening the bet sheet restyled 307
 * elements, twice, for the ~40 it adds; /live restyled 321–479 elements up to 15 times in its first 3 s at 4× CPU. And
 * `div:has(> .cm-bubble)` as a key selector made every div on the page a `:has()` subject. Four switches replace them:
 *   §1 no root/html/body `:has()` and no `div:has(` — in every stylesheet and every component `<style>` block;
 *   §2 the journey shell: `data-shell="journey"` on <html> from `journeyShellShown` (AppShell draws by the same answer),
 *      read as `:root:is([data-shell="journey"], #kp-journey-shell)` — the id only carries the old rule's specificity;
 *   §3 the hub ghost's guest: `data-viewer="guest"` on #main-content, written exactly when the header shows its pills;
 *   §4 the sort menu: `data-sort-open` on <html>, mirrored by MenuShell's `openFlag`; the bubble's wrapper is `.cm-fab`;
 *   §5 the not-found verdict before the scripts run: the root layout's watcher (journey requests only) raises
 *      `data-not-found`, EXECUTED here from its exact bytes against a controlled document; NotFoundMark lowers it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written (`test:red-anchors` counts the twin as in-process).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NOT_FOUND_WATCH_SCRIPT, NOT_FOUND_FLAG, NOT_FOUND_DIGEST, NOT_FOUND_MARK_ID } from "../src/lib/not-found-watch.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out); else out.push(rel);
  }
  return out;
};
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
/** Every `<style>{`…`}</style>` block in a component, as CSS. */
const styleBlocks = (tsx: string) => [...tsx.matchAll(/<style>\{`([\s\S]*?)`\}<\/style>/g)].map((m) => m[1]);

type World = { css: Map<string, string>; files: Map<string, string> };
const CSS_FILES = ["src/app/globals.css", "src/app/motion.css", "src/app/state-tokens.css", ...walk("src/styles").filter((f) => f.endsWith(".css"))];
const TSX_FILES = walk("src").filter((f) => f.endsWith(".tsx"));
const NAMED = ["src/app/layout.tsx", "src/components/layout/app-shell.tsx", "src/lib/server/journey-preview.ts", "src/components/markets/menu-shell.tsx",
  "src/components/ui/query-bar.tsx", "src/components/chat/ChatRoot.tsx", "src/components/chat/ChatBubble.tsx", "src/components/ui/not-found-mark.tsx",
  "src/lib/not-found-mark.ts", "src/lib/journey/header-state.ts"];
const REAL: World = { css: new Map(CSS_FILES.map((f) => [f, read(f)])), files: new Map([...new Set([...TSX_FILES, ...NAMED])].map((f) => [f, read(f)])) };

/** The compound selector a `:has(` at `at` belongs to: back to the last combinator, comma, brace or line start. */
function subjectBefore(text: string, at: number): string {
  let i = at, depth = 0;
  while (i > 0) {
    const c = text[i - 1];
    if (c === ")" || c === "]") depth++;
    else if (c === "(" || c === "[") { if (depth === 0) break; depth--; }
    else if (depth === 0 && /[\s>+~,{};]/.test(c)) break;
    i--;
  }
  return text.slice(i, at);
}
type Hit = { file: string; line: number; selector: string };
function rootHasHits(w: World): Hit[] {
  const hits: Hit[] = [];
  const scan = (file: string, css: string) => {
    const text = stripComments(css);
    for (const m of text.matchAll(/:has\(/g)) {
      const subject = subjectBefore(text, m.index!).trim();
      const type = /^[a-z][a-z0-9-]*/i.exec(subject)?.[0]?.toLowerCase() ?? "";
      if (/:root\b/.test(subject) || type === "html" || type === "body" || type === "div") {
        const line = text.slice(0, m.index).split("\n").length;
        hits.push({ file, line, selector: `${subject}:has(…` });
      }
    }
  };
  for (const [f, css] of w.css) scan(f, css);
  for (const [f, src] of w.files) if (f.endsWith(".tsx")) styleBlocks(src).forEach((css) => scan(`${f} <style>`, css));
  return hits;
}

/** Execute the REAL watcher bytes against a controlled document and MutationObserver. */
function watcherRun(script: string, initial: "none" | "mark" | "template", events: (fire: (r: object[]) => void, el: (tag: string, attrs?: Record<string, string>, kids?: object[]) => object, loaded: () => void) => void) {
  type El = { nodeType: 1; nodeName: string; id: string; attrs: Record<string, string>; kids: El[]; getAttribute(n: string): string | null; matches(q: string): boolean; querySelector(q: string): El | null };
  const query = `#${NOT_FOUND_MARK_ID}, template[data-dgst="${NOT_FOUND_DIGEST}"]`;
  const el = (tag: string, attrs: Record<string, string> = {}, kids: object[] = []): El => {
    const node: El = { nodeType: 1, nodeName: tag.toUpperCase(), id: attrs.id ?? "", attrs, kids: kids as El[],
      getAttribute: (n) => (n in node.attrs ? node.attrs[n] : null),
      matches: (q) => q === query && (node.id === NOT_FOUND_MARK_ID || (node.nodeName === "TEMPLATE" && node.attrs["data-dgst"] === NOT_FOUND_DIGEST)),
      querySelector: (q) => { for (const k of node.kids) { if (k.matches(q)) return k; const d = k.querySelector(q); if (d) return d; } return null; } };
    return node;
  };
  const rootAttrs: Record<string, string> = {};
  const body = el("body", {}, initial === "mark" ? [el("span", { id: NOT_FOUND_MARK_ID })] : initial === "template" ? [el("template", { "data-dgst": NOT_FOUND_DIGEST })] : []);
  let observer: { cb: (r: object[]) => void; options: Record<string, unknown> | null; disconnected: boolean } | null = null;
  const listeners: Record<string, () => void> = {};
  class FakeObserver { constructor(cb: (r: object[]) => void) { observer = { cb, options: null, disconnected: false }; }
    observe(_t: unknown, o: Record<string, unknown>) { observer!.options = o; } disconnect() { observer!.disconnected = true; } }
  const document = { documentElement: { setAttribute: (n: string, v: string) => { rootAttrs[n] = v; } },
    querySelector: (q: string) => body.querySelector(q) ?? (body.matches(q) ? body : null),
    addEventListener: (t: string, fn: () => void) => { listeners[t] = fn; } };
  try { new Function("document", "MutationObserver", script)(document, FakeObserver); } catch { return null; }
  const fire = (records: object[]) => { if (observer && !observer.disconnected) observer.cb(records); };
  events(fire, el, () => listeners.DOMContentLoaded?.());
  return { flagged: NOT_FOUND_FLAG in rootAttrs, observer: observer as null | { options: Record<string, unknown> | null; disconnected: boolean } };
}

type Check = { name: string; pass: boolean; detail?: string };
function checks(w: World, script: string): Check[] {
  const out: Check[] = [];
  const ok = (name: string, pass: boolean, detail?: unknown) => out.push({ name, pass, detail: detail === undefined ? undefined : JSON.stringify(detail).slice(0, 400) });
  const f = (p: string) => w.files.get(p) ?? "";
  const globals = stripComments(w.css.get("src/app/globals.css") ?? "");

  // §1
  const hits = rootHasHits(w);
  ok("1.no-root-has · no stylesheet and no component <style> block gives :root, html, body or div a :has() (Blink would re-run the page's whole :has() set there for every element added)", hits.length === 0, hits);
  ok("1.population · the scan read the three app stylesheets and the component <style> blocks", w.css.size >= 3 && [...w.files.keys()].filter((p) => p.endsWith(".tsx")).length > 100);

  // §2
  const layout = f("src/app/layout.tsx"), shell = f("src/components/layout/app-shell.tsx"), preview = f("src/lib/server/journey-preview.ts");
  ok("2.shell-switch · the root layout writes data-shell=\"journey\" from journeyShellShown(), read beside the chatbot switch; AppShell draws by the same answer",
    layout.includes(`data-shell={journeyShell ? "journey" : undefined}`) && /Promise\.all\(\[isChatbotEnabled\(\)\.catch\(\(\) => true\), journeyShellShown\(\)\]\)/.test(layout)
      && shell.includes("const journeyShown = await journeyShellShown();")
      && /export async function journeyShellShown\(\)[\s\S]*?path\.startsWith\("\/admin"\) \|\| isOptOutPath\(path\)\) return false;[\s\S]*?return \(await resolveSimpleJourney\(\)\)\.journey;/.test(preview));
  const CARRIER = ':root:is([data-shell="journey"], #kp-journey-shell)';
  // Each occurrence of the id, and each of the attribute, read back as the whole carrier around it.
  const around = (re: RegExp, offset: number) => [...globals.matchAll(re)].map((m) => globals.slice(m.index! - offset, m.index! - offset + CARRIER.length));
  const shellIds = around(/#kp-journey-shell/g, CARRIER.indexOf("#kp-journey-shell"));
  const shellAttrs = around(/\[data-shell=/g, CARRIER.indexOf("[data-shell="));
  ok("2.shell-weight · every journey-shell rule reads the switch through the specificity carrier (the old rule's ID weight, so the cascade is unchanged), and no rule reads the switch without it",
    shellIds.length >= 20 && shellIds.every((s) => s === CARRIER) && shellAttrs.length === shellIds.length && shellAttrs.every((s) => s === CARRIER),
    { ids: shellIds.length, attrs: shellAttrs.length, odd: [...shellIds, ...shellAttrs].filter((s) => s !== CARRIER).slice(0, 3) });

  // §3
  ok("3.guest-switch · #main-content carries data-viewer=\"guest\" exactly when the journey header shows its sign-in pills; the hub ghost reads it at the old rule's weight",
    shell.includes('<MainLandmark viewer={journeyShown && !session ? "guest" : undefined}>') && shell.includes('<main id="main-content" className="flex-1" data-viewer={viewer}>')
      && f("src/lib/journey/header-state.ts").includes("authPills: !i.isAuthed")
      && globals.includes(':root [data-viewer="guest"] .kp-hubghost--member { display: none; }')
      && globals.includes(':root [data-viewer="guest"] p.kp-hubghost--guest { display: block; }')
      && globals.includes(':root [data-viewer="guest"] .kp-hub__grid.kp-hubghost--guest { display: grid; }'));

  // §4
  const menu = f("src/components/markets/menu-shell.tsx"), bar = f("src/components/ui/query-bar.tsx"), chat = f("src/components/chat/ChatRoot.tsx"), bubble = f("src/components/chat/ChatBubble.tsx");
  ok("4.sort-flag · the sort menu mirrors its open state on <html> (a mutation record, before the next frame) and drops it when it goes; the bubble and its .cm-fab wrapper yield to it",
    bar.includes('openFlag="data-sort-open"') && /const watch = new MutationObserver\(mirror\);\s*watch\.observe\(el, \{ attributes: true, attributeFilter: \["open"\] \}\);/.test(menu)
      && menu.includes("const mirror = () => root.toggleAttribute(openFlag, el.open);") && menu.includes("return () => { watch.disconnect(); root.removeAttribute(openFlag); };")
      && globals.includes("html[data-sort-open] :is(.cm-bubble, .cm-fab) {")
      && chat.includes('className={open ? "cm-fab cm-fab--open" : "cm-fab"}') && /className=\{`cm-bubble /.test(bubble));

  // §5
  const mark = f("src/components/ui/not-found-mark.tsx"), markLib = f("src/lib/not-found-mark.ts");
  ok("5.wiring · the watcher is rendered for a journey request only, above AppShell; NotFoundMark lowers the flag where it announces itself; the mark's id is the watcher's",
    layout.includes("{journeyShell && <script dangerouslySetInnerHTML={{ __html: NOT_FOUND_WATCH_SCRIPT }} />}")
      && layout.indexOf("NOT_FOUND_WATCH_SCRIPT }}") < layout.indexOf("<AppShell>")
      && mark.includes("useLayoutEffect(() => { announceNotFound(); document.documentElement.removeAttribute(NOT_FOUND_FLAG); }, [path]);")
      && markLib.includes(`export const NOT_FOUND_MARK = "${NOT_FOUND_MARK_ID}";`)
      && globals.includes(":root:is([data-not-found], #kp-not-found) .kp-rail--journey .kp-rail__item[data-on] {"));
  const already = watcherRun(script, "mark", () => {});
  const alreadyTpl = watcherRun(script, "template", () => {});
  ok("5.at-start · a mark or a 404 template already in the document raises the flag at once, and no observer is left watching",
    already?.flagged === true && already.observer === null && alreadyTpl?.flagged === true && alreadyTpl.observer === null);
  const markLater = watcherRun(script, "none", (fire, el) => { fire([{ type: "childList", addedNodes: [el("div")] }]); fire([{ type: "childList", addedNodes: [el("span", { id: NOT_FOUND_MARK_ID })] }]); });
  const nothing = watcherRun(script, "none", (fire, el) => { fire([{ type: "childList", addedNodes: [el("div", {}, [el("span", { id: "other" })])] }]); });
  ok("5.mark-arrives · the mark parsed later raises the flag and stops the watch; an ordinary insertion raises nothing",
    markLater?.flagged === true && markLater.observer?.disconnected === true && nothing?.flagged === false && nothing.observer?.disconnected === false);
  const nested = watcherRun(script, "none", (fire, el) => { fire([{ type: "childList", addedNodes: [el("div", {}, [el("template", { "data-dgst": NOT_FOUND_DIGEST })])] }]); });
  ok("5.template-inserted · a 404 template arriving inside streamed content (the server's early verdict) raises the flag", nested?.flagged === true);
  const rx = watcherRun(script, "none", (fire, el) => { fire([{ type: "attributes", target: el("template", { "data-dgst": NOT_FOUND_DIGEST }), addedNodes: [] }]); });
  const rxOther = watcherRun(script, "none", (fire, el) => { fire([{ type: "attributes", target: el("template", { "data-dgst": "SOMETHING_ELSE" }), addedNodes: [] }]); });
  ok("5.rx-attribute · React's $RX setting the 404 digest on an existing template raises the flag; another digest does not",
    rx?.flagged === true && rxOther?.flagged === false);
  const after = watcherRun(script, "none", (fire, el, loaded) => { loaded(); fire([{ type: "childList", addedNodes: [el("span", { id: NOT_FOUND_MARK_ID })] }]); });
  ok("5.load-ends-watch · the watch stops at DOMContentLoaded (nothing costs anything once the page is loaded), and watches childList+subtree and only data-dgst",
    after?.flagged === false && after.observer?.disconnected === true
      && JSON.stringify(after.observer?.options) === JSON.stringify({ childList: true, subtree: true, attributes: true, attributeFilter: ["data-dgst"] }));
  return out;
}

const results = checks(REAL, NOT_FOUND_WATCH_SCRIPT);
for (const c of results) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}${c.pass || !c.detail ? "" : ` — ${c.detail}`}`);
let failures = results.filter((c) => !c.pass).length;

if (process.argv.includes("--prove-red")) {
  const css = (from: string, to: string) => { const g = REAL.css.get("src/app/globals.css")!; if (!g.includes(from)) throw new Error(`stale CSS plant: ${from}`); return { ...REAL, css: new Map([...REAL.css, ["src/app/globals.css", g.replace(from, to)]]) }; };
  const file = (p: string, from: string, to: string) => { const s = REAL.files.get(p)!; if (!s.includes(from)) throw new Error(`stale plant in ${p}: ${from}`); return { ...REAL, files: new Map([...REAL.files, [p, s.replace(from, to)]]) }; };
  const script = (from: string, to: string) => { if (!NOT_FOUND_WATCH_SCRIPT.includes(from)) throw new Error(`stale watcher plant: ${from}`); return NOT_FOUND_WATCH_SCRIPT.replace(from, to); };
  const mutants: { name: string; check: string; world?: World; script?: string }[] = [
    { name: "a root :has() returns", check: "1.no-root-has", world: css(".kp-hubghost--guest { display: none; }", ".kp-hubghost--guest { display: none; }\n:root:has(.kp-x) .kp-y { color: red; }") },
    { name: "a body :has() appears", check: "1.no-root-has", world: css(".kp-hubghost--guest { display: none; }", ".kp-hubghost--guest { display: none; }\nbody:has(dialog[open]) { overflow: hidden; }") },
    { name: "the bubble's wrapper read as div:has() again", check: "1.no-root-has", world: css("html[data-sort-open] :is(.cm-bubble, .cm-fab) {", "html[data-sort-open] :is(.cm-bubble, div:has(> .cm-bubble)) {") },
    { name: "a component <style> block reads the root with :has()", check: "1.no-root-has", world: file("src/components/markets/operation-result-modal.tsx", "@keyframes orm-pop {", "html:has(.kp-x) .orm-x { color: red; } @keyframes orm-pop {") },
    { name: "the root layout stops writing the shell's switch", check: "2.shell-switch", world: file("src/app/layout.tsx", ` data-shell={journeyShell ? "journey" : undefined}`, "") },
    { name: "AppShell answers by its own read again", check: "2.shell-switch", world: file("src/components/layout/app-shell.tsx", "const journeyShown = await journeyShellShown();", "const journeyShown = (await journeyRead).journey;") },
    { name: "the switch shows the journey on the console", check: "2.shell-switch", world: file("src/lib/server/journey-preview.ts", `if (path.startsWith("/admin") || isOptOutPath(path)) return false;`, "if (isOptOutPath(path)) return false;") },
    { name: "a journey rule loses the old ID weight", check: "2.shell-weight", world: css(':root:is([data-shell="journey"], #kp-journey-shell) .ticker-item {', ':root[data-shell="journey"] .ticker-item {') },
    { name: "the main landmark drops the guest switch", check: "3.guest-switch", world: file("src/components/layout/app-shell.tsx", " data-viewer={viewer}", "") },
    { name: "the guest switch written for a signed-in reader", check: "3.guest-switch", world: file("src/components/layout/app-shell.tsx", 'journeyShown && !session ? "guest"', 'journeyShown && session ? "guest"') },
    { name: "the sort menu stops raising its flag", check: "4.sort-flag", world: file("src/components/ui/query-bar.tsx", 'openFlag="data-sort-open"', "") },
    { name: "the menu watches the wrong attribute", check: "4.sort-flag", world: file("src/components/markets/menu-shell.tsx", 'attributeFilter: ["open"]', 'attributeFilter: ["class"]') },
    { name: "the menu leaves its flag up when it goes", check: "4.sort-flag", world: file("src/components/markets/menu-shell.tsx", "watch.disconnect(); root.removeAttribute(openFlag);", "watch.disconnect();") },
    { name: "the watcher is served to classic requests too", check: "5.wiring", world: file("src/app/layout.tsx", "{journeyShell && <script dangerouslySetInnerHTML", "{<script dangerouslySetInnerHTML") },
    { name: "NotFoundMark leaves the flag up", check: "5.wiring", world: file("src/components/ui/not-found-mark.tsx", " document.documentElement.removeAttribute(NOT_FOUND_FLAG);", "") },
    { name: "the watcher reads only new nodes, not streamed subtrees", check: "5.template-inserted", script: script("(n.matches(q)||n.querySelector(q))", "n.matches(q)") },
    { name: "the watcher ignores $RX's attribute", check: "5.rx-attribute", script: script(`if(x.type==="attributes"){var t=x.target;if(t.nodeName==="TEMPLATE"&&t.getAttribute("data-dgst")===g){r.setAttribute(f,"");w.disconnect();return;}continue;}`, `if(x.type==="attributes")continue;`) },
    { name: "the watcher never stops", check: "5.load-ends-watch", script: script(`d.addEventListener("DOMContentLoaded",function(){w.disconnect();},{once:true});`, "") },
    { name: "the watcher does not look at what is already there", check: "5.at-start", script: script(`if(d.querySelector(q)){r.setAttribute(f,"");return;}`, "") },
  ];
  for (const m of mutants) {
    const caught = checks(m.world ?? REAL, m.script ?? NOT_FOUND_WATCH_SCRIPT).some((c) => c.name.startsWith(m.check) && !c.pass);
    console.log(`${caught ? "PASS" : "FAIL"} PLANT ${m.name}`);
    if (!caught) failures++;
  }
  console.log(`${mutants.length} in-process controls executed`);
}
console.log(`${results.length} checks; ${failures} failures`);
process.exitCode = failures ? 1 : 0;
