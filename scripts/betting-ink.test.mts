/**
 * THE BETTING PAIR NAMES A SIDE — NEVER TIME, NEVER LIVENESS. `npm run test:betting-ink` (in `predeploy`).
 *
 * ⭐ WHY (2026-09-14, session 96, register E-405 and E-406). DESIGN_AUTHORITY §B2a reserves `--yes-*` / `--no-*` for the
 * side a stake is on. The visual pass of 2026-09-14 found two families still borrowing them:
 *   · LIVE — a live card's time-left (`.mcardp-meta .live`, `--yes-300`, directly under the YES/NO buttons), a topic
 *     tile's live count (`.kp-topic__live`, `--yes-400`), and the hero's open-markets figure and pip (`--yes-400`).
 *     The player's LIVE signal is the broadcast red of §B11.
 *   · URGENCY — the Up & Down countdown's final 30 s painted the digits `--no-300`, beside the round's Down side,
 *     where rose reads as "price going down". The pulse (`ud-count-pulse`) carries the urgency.
 *
 * ⛔ SCOPED TO THE NAMED SITES, and the scope is the point: these files use the betting pair correctly elsewhere
 * (Up/Down price arrows, split labels, the YES/NO buttons). Each check is a function returning defects, run on the
 * real files and on planted copies carrying the shipped defect — so a check that stopped matching goes red (§3).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "", evidence = "") => {
  cond ? pass++ : fail++;
  const tail = evidence ? ` — ${evidence}` : (!cond && why ? ` — ${why}` : "");
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail}`);
};
const code = (src: string) => src.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const BETTING = /var\(--(?:yes|no)-\d{3}\)/;

const CSS = "src/app/globals.css";
const HERO = "src/components/home/landing-hero.tsx";
const POD = "src/components/updown/round-countdown.tsx";
const CARD = "src/components/updown/updown-card.tsx";

/* §1 · LIVE ─────────────────────────────────────────────────────────────── */
console.log("\n§1 · the LIVE signal wears neutral ink and the broadcast red");
function liveDefects(css: string, hero: string): string[] {
  const d: string[] = [];
  const c = code(css);
  const rule = (sel: string) => c.match(new RegExp(`${sel.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`))?.[1];
  const meta = rule(".mcardp-meta .live"), topic = rule(".kp-topic__live"), pip = rule(".kp-proof__pip");
  if (meta === undefined || topic === undefined || pip === undefined) d.push("a LIVE rule is missing from globals.css");
  if (meta && BETTING.test(meta)) d.push(".mcardp-meta .live paints the betting pair");
  if (meta && !/color:\s*var\(--text-muted\)/.test(meta)) d.push(".mcardp-meta .live is not the neutral --text-muted");
  if (topic && BETTING.test(topic)) d.push(".kp-topic__live paints the betting pair");
  if (pip && (BETTING.test(pip) || /--bar-glow-yes/.test(pip))) d.push(".kp-proof__pip wears the YES ink or glow");
  if (pip && !/background:\s*var\(--live-400\)/.test(pip)) d.push(".kp-proof__pip is not the broadcast --live-400");
  // landing v3 · WP3/WP4 — the featured card's top-right time and a board row's time left are TIME, not a
  // side: the neutral `--text`, never the betting pair (§B2a, E-405).
  for (const sel of [".mcardp-closes", ".kp-qrow__left"]) {
    const r = rule(sel);
    if (r === undefined) d.push(`${sel} is missing from globals.css`);
    else if (BETTING.test(r)) d.push(`${sel} paints the betting pair`);
    else if (!/color:\s*var\(--text\)/.test(r)) d.push(`${sel} is not the neutral --text`);
  }
  const h = code(hero);
  // 🔴 D51 (mobile-visual) MOVED THE PIP AFTER THE FIGURE and this matcher still demanded it lead,
  // so §1a failed on main — a guard reading "not found" about markup that was there. Found by the
  // landing v3 build, 2026-09-26. The figure's ink is the claim; the pip may sit either side of the
  // count, so both orders are accepted, and anything else between them is still a miss.
  const openFigure = h.match(/<span className="kp-proof__num" style=\{\{ color: "([^"]+)" \}\}>\s*(?:\{formatNumber\(figures\.openCount\)\}\s*)?<span className="kp-proof__pip"/)?.[1];
  if (!openFigure) d.push("the hero's open-markets figure was not found beside its pip");
  else if (BETTING.test(openFigure)) d.push(`the hero's open-markets figure is ${openFigure}`);
  return d;
}
const css = read(CSS), hero = read(HERO);
ok("§1a time-left (card, featured top-right, board row), the topic live count, the hero figure and its pip: no betting ink", liveDefects(css, hero).length === 0, liveDefects(css, hero).join("; "));

/* §2 · URGENCY ───────────────────────────────────────────────────────────── */
console.log("\n§2 · a countdown's last seconds pulse; they do not turn rose");
function urgencyDefects(pod: string, card: string): string[] {
  const d: string[] = [];
  const p = code(pod), k = code(card);
  for (const [name, src] of [["round-countdown.tsx", p], ["updown-card.tsx", k]] as const) {
    if (/urgent\s*\?\s*"var\(--(?:yes|no)-\d{3}\)"/.test(src)) d.push(`${name}: an urgent branch paints the betting pair`);
  }
  // The urgency is still carried — by the pulse, on all three readouts.
  if (!/className=\{urgent \? "m-tick ud-count-pulse" : "m-tick"\}/.test(p)) d.push("the round pod lost its final-30 s pulse");
  if (!/className=\{urgent \? "ud-count-pulse" : undefined\}/.test(p)) d.push("the board panel lost its final-30 s pulse");
  if (!/urgent && "ud-count-pulse"/.test(k)) d.push("the card lost its final-30 s pulse");
  if (!/const urgent = !inResult && isOpen && left != null && left > 0 && left <= 30;/.test(p)) d.push("the pod's 30 s threshold moved");
  if (!/color: tone,/.test(k)) d.push("the card's digits do not take the phase tone");
  return d;
}
const pod = read(POD), card = read(CARD);
ok("§2a the pod, the board panel and the card pulse in the final 30 s without rose digits", urgencyDefects(pod, card).length === 0, urgencyDefects(pod, card).join("; "));

/* §3 · PLANTED CONTROLS — the shipped defects, re-planted into copies. ────── */
console.log("\n§3 · planted controls");
const plantMeta = css.replace(".mcardp-meta .live { color: var(--text-muted);", ".mcardp-meta .live { color: var(--yes-300);");
const plantPip = css.replace("  background: var(--live-400);\n  flex: none;", "  background: var(--yes-400);\n  box-shadow: var(--bar-glow-yes);\n  flex: none;")
  .replace("  background: var(--live-400);\r\n  flex: none;", "  background: var(--yes-400);\r\n  box-shadow: var(--bar-glow-yes);\r\n  flex: none;");
const plantHero = hero.replace('<span className="kp-proof__num" style={{ color: "var(--text)" }}>', '<span className="kp-proof__num" style={{ color: "var(--yes-400)" }}>');
const plantPod = pod.replace('color: urgent ? "var(--text)"', 'color: urgent ? "var(--no-300)"');
const plantCard = card.replace("color: tone,", 'color: urgent ? "var(--no-300)" : tone,');
const plantRowLeft = css.replace(/(\.kp-qrow__left \{[^}]*?)color: var\(--text\);/, "$1color: var(--yes-300);");
const plantCloses = css.replace(/(\.mcardp-closes \{[^}]*?)color: var\(--text\);/, "$1color: var(--yes-300);");
ok("§3a control · every planted copy found its target",
  plantMeta !== css && plantPip !== css && plantHero !== hero && plantPod !== pod && plantCard !== card
  && plantRowLeft !== css && plantCloses !== css);
ok("§3b control · YES-green time-left is reported", liveDefects(plantMeta, hero).length > 0, "", liveDefects(plantMeta, hero).join("; "));
ok("§3c control · the YES pip and glow are reported", liveDefects(plantPip, hero).length > 0, "", liveDefects(plantPip, hero).join("; "));
ok("§3d control · a YES-green hero figure is reported", liveDefects(css, plantHero).length > 0, "", liveDefects(css, plantHero).join("; "));
ok("§3e control · rose pod digits are reported", urgencyDefects(plantPod, card).length > 0, "", urgencyDefects(plantPod, card).join("; "));
ok("§3f control · rose card digits are reported", urgencyDefects(pod, plantCard).length > 0, "", urgencyDefects(pod, plantCard).join("; "));
ok("§3g control · a YES-green board-row time left is reported", liveDefects(plantRowLeft, hero).length > 0, "", liveDefects(plantRowLeft, hero).join("; "));
ok("§3h control · a YES-green featured top-right time is reported", liveDefects(plantCloses, hero).length > 0, "", liveDefects(plantCloses, hero).join("; "));

/* §4 · THE MATCH'S TIME IS NEUTRAL (landing v3, R5 · spec updown-band-v2 §15.1) ──────────────────────
   The landing's Up & Down band draws TIME — its clock row, the match track's rail, locked stretch, posts,
   lane marks and label, the playhead and the played stretch — beside two sides that DO wear the betting
   pair (the verdict, the picks, the stems). Time in green or rose would read as a side winning; the
   digits in rose beside the Down pick would read as "price going down" (E-406's exact defect). */
console.log("\n§4 · the Up & Down match: the clock, the rail and the playhead never wear a side's ink");
const DIGITS = "src/components/home/updown-match-digits.tsx";
const TIME_SELECTORS = /^\.kp-udclock|^\.kp-udtrack__(?:rail|locked|post|mark|open|now|elapsed)\b/;
function matchTimeDefects(sheet: string, digits: string): string[] {
  const d: string[] = [];
  // Media wrappers are unwrapped so a rule inside `@media (min-width: 768px) { … }` is read as its own rule.
  const c = code(sheet).replace(/@media[^{]*\{/g, "");
  let seen = 0;
  for (const m of c.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sels = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const hit = sels.filter((s) => TIME_SELECTORS.test(s));
    if (!hit.length) continue;
    seen++;
    if (BETTING.test(m[2])) d.push(`${hit.join(", ")} paints the betting pair`);
  }
  if (seen < 8) d.push(`only ${seen} match-time rules were found in globals.css — the selectors moved`);
  if (BETTING.test(code(digits))) d.push("updown-match-digits.tsx paints the betting pair");
  return d;
}
const digits = read(DIGITS);
ok("§4a the clock row, the rail, the posts, the lane and the playhead: no betting ink",
  matchTimeDefects(css, digits).length === 0, matchTimeDefects(css, digits).join("; "));
const plantDigitsCss = css.replace(/(\.kp-udclock__digits \{[^}]*?)color: var\(--text\);/, "$1color: var(--no-300);");
const plantDigitsTsx = digits.replace('className="kp-udclock__digits"', 'className="kp-udclock__digits" style={{ color: "var(--no-300)" }}');
ok("§4b control · every planted copy found its target", plantDigitsCss !== css && plantDigitsTsx !== digits);
ok("§4c control · rose digits in the stylesheet are reported", matchTimeDefects(plantDigitsCss, digits).length > 0, "", matchTimeDefects(plantDigitsCss, digits).join("; "));
ok("§4d control · rose digits inline in the leaf are reported", matchTimeDefects(css, plantDigitsTsx).length > 0, "", matchTimeDefects(css, plantDigitsTsx).join("; "));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 8) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
