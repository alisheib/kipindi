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
  const h = code(hero);
  const openFigure = h.match(/<span className="kp-proof__num" style=\{\{ color: "([^"]+)" \}\}>\s*<span className="kp-proof__pip"/)?.[1];
  if (!openFigure) d.push("the hero's open-markets figure was not found beside its pip");
  else if (BETTING.test(openFigure)) d.push(`the hero's open-markets figure is ${openFigure}`);
  return d;
}
const css = read(CSS), hero = read(HERO);
ok("§1a time-left, the topic live count, the hero figure and its pip: no betting ink", liveDefects(css, hero).length === 0, liveDefects(css, hero).join("; "));

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
ok("§3a control · every planted copy found its target",
  plantMeta !== css && plantPip !== css && plantHero !== hero && plantPod !== pod && plantCard !== card);
ok("§3b control · YES-green time-left is reported", liveDefects(plantMeta, hero).length > 0, "", liveDefects(plantMeta, hero).join("; "));
ok("§3c control · the YES pip and glow are reported", liveDefects(plantPip, hero).length > 0, "", liveDefects(plantPip, hero).join("; "));
ok("§3d control · a YES-green hero figure is reported", liveDefects(css, plantHero).length > 0, "", liveDefects(css, plantHero).join("; "));
ok("§3e control · rose pod digits are reported", urgencyDefects(plantPod, card).length > 0, "", urgencyDefects(plantPod, card).join("; "));
ok("§3f control · rose card digits are reported", urgencyDefects(pod, plantCard).length > 0, "", urgencyDefects(pod, plantCard).join("; "));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 8) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
