/**
 * test:tab-anchors — §K rule 7d ③, "nothing load-bearing behind a click", ACROSS PAGES.
 *
 * ⛔ THE DEFECT THIS EXISTS FOR SHIPPED TWICE, AND NEITHER TIME DID ANYTHING GO RED.
 *
 * Railing a page moves cards onto tabs. Any link that pointed at one of those cards — by `#id`,
 * or just by intent — keeps resolving, keeps returning HTTP 200, and quietly shows the WRONG
 * SECTION. `tsc` cannot see it: an href is a string. A rendering sweep cannot see it: the page
 * it lands on is perfectly well rendered. It fails by showing an officer a screen that does not
 * contain the control the sentence they clicked promised them.
 *
 *   · `/admin/system` took a rail in wave 1, moving the audit-chain verify control to
 *     `diagnostics`. `/admin/compliance`'s "verify now →" kept pointing at the bare route and
 *     landed on `platform` — no verify control anywhere on it — for as long as that rail existed.
 *   · `aiBudgetRefusal`'s "Open Credit budget" pointed at `#ai-credit-budget` the day that card
 *     moved onto `?tab=settings`.
 *
 * ⭐ WHAT IS MECHANICAL IS THE ANCHOR, and that is what this gate holds. For every link in the
 * source that carries `/admin/<route>…#anchor`, the id must be rendered on the tab the href
 * actually selects. INTENT — "does this link mean the section it lands on?" — is not mechanical
 * and is not claimed here; §3 states that limit out loud rather than implying coverage it has not
 * got, and the inbound-link audit that found the `/admin/system` defect is a human step recorded
 * in `DESIGN-BASELINE.md` §3b.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decomment } from "./lib/decomment.mts";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.KP_SRC || join(here, "..", "src");

let fail = 0;
const ok = (name: string, pass: boolean, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
  if (!pass) fail++;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (e.endsWith(".tsx") || e.endsWith(".ts")) out.push(full);
  }
  return out;
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("§K rule 7d ③ · TAB ANCHORS — a link must land on the section it names");
console.log("──────────────────────────────────────────────────────────────────────");

const files = walk(SRC);
const bodies = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, "/");

/* ── §1 the population: every anchored admin link in the source ───────────── */
type Link = { from: string; href: string; route: string; tab: string | null; anchor: string };
const links: Link[] = [];
for (const [f, raw] of bodies) {
  const src = decomment(raw);
  for (const m of src.matchAll(/["'`](\/admin\/[a-z0-9/_[\]-]*)(\?[^"'`#]*)?#([a-z0-9-]+)["'`]/gi)) {
    const q = new URLSearchParams((m[2] || "").replace(/^\?/, ""));
    links.push({ from: rel(f), href: m[0].slice(1, -1), route: m[1], tab: q.get("tab"), anchor: m[3] });
  }
}
console.log(`\n§1 · ${links.length} anchored admin link(s) found`);
/* ⛔ THE VACUITY FLOOR. If the link idiom changes, this gate would sweep an empty set and report
   a serene pass. Re-derived 2026-09-02: two anchored admin links exist, both in ai-usage.ts. */
const FLOOR = 2;
ok(`1.0 at least ${FLOOR} anchored link(s) — the scanner still finds them`, links.length >= FLOOR,
   `${links.length} — the link idiom moved and this gate went blind`);
for (const l of links) console.log(`      · ${l.from} → ${l.href}`);

/* ── §2 each anchor is rendered on the tab its href selects ───────────────── */
console.log("\n§2 · the anchor is rendered on the tab the href selects");
for (const l of links) {
  const page = join(SRC, "app", l.route.replace(/^\/admin/, "admin"), "page.tsx");
  let pageSrc: string;
  try { pageSrc = decomment(readFileSync(page, "utf8")); } catch {
    ok(`2.x ${l.href} → its page exists`, false, `no page.tsx at ${rel(page)}`);
    continue;
  }

  const idAt = pageSrc.indexOf(`id="${l.anchor}"`);
  ok(`2.x ${l.href} → #${l.anchor} is rendered`, idAt >= 0,
     "the anchor does not exist on that page — the button scrolls nowhere");
  if (idAt < 0) continue;

  /**
   * ⭐ WHICH TAB OWNS THE ANCHOR, read off the page's own source. Groups are written
   * `{tab === "x" && (<>` … `</>)}`, so the owning group is the LAST such opener before the id
   * with no matching close between them. An anchor with no opener before it is ABOVE the rail —
   * always rendered — which is the strongest answer and needs no `?tab=`.
   */
  const openers = [...pageSrc.matchAll(/\{tab === "([a-z-]+)" && \(<>/g)];
  const closers = [...pageSrc.matchAll(/<\/>\)\}/g)].map((m) => m.index!);
  const before = openers.filter((m) => m.index! < idAt);
  const owner = before.length ? before[before.length - 1] : null;
  const ownerTab = owner && !closers.some((c) => c > owner.index! && c < idAt) ? owner[1] : null;

  if (ownerTab === null) {
    ok(`2.x ${l.href} → #${l.anchor} is above the rail (every tab)`, true);
    continue;
  }
  /* The href selects a tab explicitly, or falls to the page's default. */
  const defaultTab = (pageSrc.match(/\?\s*\(tabRaw as[^)]*\)\s*:\s*"([a-z-]+)"/) ||
                      pageSrc.match(/:\s*"([a-z-]+)";\s*$/m) || [])[1] ?? null;
  const selected = l.tab ?? defaultTab;
  ok(`2.x ${l.href} → #${l.anchor} lives on "${ownerTab}", href selects "${selected ?? "?"}"`,
     selected === ownerTab,
     `add ?tab=${ownerTab} to the href, or the operator lands on a section without that control`);
}

/* ── §3 the limit, stated ─────────────────────────────────────────────────── */
console.log("\n§3 · what this gate does NOT prove");
console.log("      An UNANCHORED link's INTENT. `/admin/system` was broken for a whole wave by a");
console.log("      link that resolved fine and simply meant a different section. No regex reads");
console.log("      intent; auditing inbound links after railing a page is a HUMAN step, and it");
console.log("      is written into DESIGN-BASELINE.md §3b rather than implied by a green run.");

console.log(`\n${fail ? `🔴 ${fail} failing` : "✅ every anchored admin link lands on the section that holds its anchor"}`);
process.exit(fail ? 1 : 0);
