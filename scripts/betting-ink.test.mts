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
 *   · A PRICE MOVE (§5, 2026-09-27, the landing v3 WP3+WP4 review, R8) — the grid card inked its 24h move
 *     "+5pt" green-up / rose-down while the featured card on the same page printed the same move "▲5 · 24h ago"
 *     in neutral ink. A move of the YES price is not a side, and a green-up move invites chasing.
 *   · A FORM ERROR (§6, 2026-09-30, the Vodacom plan S2 design panel) — the market wizard's and the AI poll form's
 *     validation lines wore `text-no-300` / `border-no-700` while the counter above them wore `text-danger-fg`: two
 *     reds stacked on one field, and the betting NO pair spent on an app state. A form error is the danger ink.
 *
 * ⛔ SCOPED TO THE NAMED SITES, and the scope is the point: these files use the betting pair correctly elsewhere
 * (Up/Down price arrows, split labels, the YES/NO buttons). Each check is a function returning defects, run on the
 * real files and on planted copies carrying the shipped defect — so a check that stopped matching goes red (§3).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
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

/* §5 · A PRICE MOVE IS NOT A SIDE (landing v3 WP3+WP4 review, R8, 2026-09-27) ───────────────────────────────
   DESIGN_AUTHORITY §B2 / §B2a keep the YES/NO pair for the sides. The 24h move of the YES price is ONE reading
   on every card — "▲5 · 24h ago", neutral ink, the featured card's since WP3 — drawn by ONE component
   (`DayAgoMove`); the grid card's own renderer, which inked "+5pt" in the betting pair, is gone. The
   component is the only surface that prints a 24h move (`t.market.h24Ago` is read by the card alone). */
console.log("\n§5 · the 24h move wears neutral ink, one reading on every card");
const MCARD = "src/components/markets/market-card.tsx";
const DICT = "src/lib/i18n-dict.ts";
function moveDefects(sheet: string, cardSrc: string): string[] {
  const d: string[] = [];
  const k = code(cardSrc);
  const at = k.indexOf("function DayAgoMove(");
  const fn = at < 0 ? "" : (k.slice(at).match(/^[\s\S]*?\r?\n\}\r?\n/)?.[0] ?? "");
  if (!fn) d.push("the one move component (`DayAgoMove`) was not found in market-card.tsx");
  else {
    if (BETTING.test(fn)) d.push("the move component paints the betting pair");
    if (/\bstyle=/.test(fn)) d.push("the move component sets an inline style (its ink is the stylesheet's)");
    if (!/className="mcardp-h24"/.test(fn)) d.push("the move component does not wear .mcardp-h24");
  }
  if (/\bMoveText\b|"mcardp-move"/.test(k)) d.push("a second move renderer is back in market-card.tsx");
  if (!/<DayAgoMove move=\{yesPct - dayAgo\} label=\{t\.market\.h24Ago\} keyed \/>/.test(k)) d.push("the featured card does not print its move through the one component");
  if (!/<DayAgoMove move=\{move24h\} label=\{t\.market\.h24Ago\} keyed=\{false\} \/>/.test(k)) d.push("the grid card does not print its move through the one component");
  const r = code(sheet).match(/\.mcardp-h24\s*\{([^}]*)\}/)?.[1];
  if (r === undefined) d.push(".mcardp-h24 is missing from globals.css");
  else if (BETTING.test(r)) d.push(".mcardp-h24 paints the betting pair");
  else if (!/color:\s*var\(--text-subtle\)/.test(r)) d.push(".mcardp-h24 is not the neutral --text-subtle");
  if (/\.mcardp-move\b/.test(code(sheet))) d.push("the retired .mcardp-move rule is back in globals.css");
  return d;
}
const mcard = read(MCARD);
ok("§5a the featured and the grid card print the 24h move through ONE neutral component",
  moveDefects(css, mcard).length === 0, moveDefects(css, mcard).join("; "));
// Every other surface: the move's words are read by the card alone, and the retired second wording is gone.
const moveReaders: string[] = [];
(function scan(dir: string) {
  for (const e of readdirSync(join(ROOT, dir))) {
    const p = `${dir}/${e}`;
    if (statSync(join(ROOT, p)).isDirectory()) scan(p);
    else if (/\.tsx?$/.test(e) && p !== DICT && /\bh24Ago\b/.test(code(read(p)))) moveReaders.push(p);
  }
})("src");
ok("§5b the card is the only surface that prints a 24h move, and the retired `twentyFourHourMove` is gone",
  moveReaders.length === 1 && moveReaders[0] === MCARD && !/\btwentyFourHourMove\b/.test(code(read(DICT))),
  moveReaders.join(", "));
const plantMoveInline = mcard.replace('<span className="mcardp-h24">', '<span className="mcardp-h24" style={{ color: move > 0 ? "var(--yes-400)" : "var(--no-400)" }}>');
const plantMoveSheet = css.replace(/(\.mcardp-h24 \{[^}]*?)color: var\(--text-subtle\);/, "$1color: var(--yes-400);");
const plantMoveGrid = mcard.replace("<DayAgoMove move={move24h} label={t.market.h24Ago} keyed={false} />", "<MoveText move={move24h} label={t.market.h24Ago} />");
ok("§5c control · every planted copy found its target", plantMoveInline !== mcard && plantMoveSheet !== css && plantMoveGrid !== mcard);
ok("§5d control · a YES/NO-inked move (inline, the retired grid spelling) is reported", moveDefects(css, plantMoveInline).length > 0, "", moveDefects(css, plantMoveInline).join("; "));
ok("§5e control · a YES-green move in the stylesheet is reported", moveDefects(plantMoveSheet, mcard).length > 0, "", moveDefects(plantMoveSheet, mcard).join("; "));
ok("§5f control · a grid card with its own move renderer again is reported", moveDefects(css, plantMoveGrid).length > 0, "", moveDefects(css, plantMoveGrid).join("; "));

/* §6 · A FORM ERROR IS NOT A SIDE (the Vodacom plan S2 design panel, 2026-09-30) ──────────────────────────────── */
console.log("\n§6 · a form's validation line wears the danger ink, never the betting NO pair");
const WIZARD = "src/app/admin/markets/new/wizard.tsx";
const SHORT_SURFACES = ["src/app/admin/markets/short-title-control.tsx", "src/app/admin/ai-polls/short-title-drafts.tsx"];
const POLL_FORM = "src/app/admin/ai-polls/poll-actions.tsx";
/** The market wizard and the short-title surfaces name no side at all: ANY betting class there is a defect. */
const anySide = (src: string) => (code(src).match(/\b(?:text|border|bg)-(?:yes|no)-\d{3}\b/g) ?? []);
/** The AI poll form does name sides (its result icons, its reject chips); a betting class on a FORM-ERROR line does not. */
const errorLineSides = (src: string) => code(src).split("\n").filter((l) =>
  /\b(?:text|border)-no-\d{3}\b/.test(l) && /role="alert"|formErrors\.|\b(?:sel|date)Error\b|\b(?:sw|zh)Issue\b/.test(l));
const wizard = read(WIZARD);
ok("§6a the market wizard's errors wear the danger ink — no betting class anywhere in it", anySide(wizard).length === 0, anySide(wizard).join(", "));
for (const f of SHORT_SURFACES) ok(`§6b ${f.split("/").pop()} names no side — no betting class`, anySide(read(f)).length === 0, anySide(read(f)).join(", "));
const pollForm = read(POLL_FORM);
ok("§6c the AI poll form's validation lines wear the danger ink", errorLineSides(pollForm).length === 0, errorLineSides(pollForm).slice(0, 3).join(" | "));
const plantWizard = wizard.replace('leading-snug text-danger-fg">{refused}</p>', 'leading-snug text-no-300">{refused}</p>');
const plantPoll = pollForm.replace('{dateError && <p className="mt-1 text-body-sm text-danger-fg">{dateError}</p>}', '{dateError && <p className="mt-1 text-body-sm text-no-300">{dateError}</p>}');
ok("§6d control · every planted copy found its target", plantWizard !== wizard && plantPoll !== pollForm);
ok("§6e control · a wizard refusal in the NO ink is reported", anySide(plantWizard).length > 0, "", anySide(plantWizard).join(", "));
ok("§6f control · an AI poll form error in the NO ink is reported", errorLineSides(plantPoll).length > 0, "", errorLineSides(plantPoll).join(" | ").slice(0, 160));

/* §7 · AN APP STATE IS NOT A SIDE (R5-I, the visual pass's round 5, 2026-10-09) ─────────────────────────────────────────
   §B2a, read on every player surface that names no side: success, failure, destruction, a field's error, a wait, a
   balance's move — the app-state families (`--success-*`, `--danger-*`, royal, the text's ink), never the betting pair.
   R5-I found them in a result dialog's crests, the crash page's mark, four destructive controls, six field errors, five
   success marks, the auth eyebrow, the RG page's hero and art, a net, a rate, a balance's ±delta, the placed pulse, the
   bell's journey count, a loader's glyphs. The census of every remaining use, each ruled, is test:visual-pass-r5i §1. */
console.log("\n§7 · an app state wears the app-state family — success, failure, destruction, a field's error — never a side's");
const N = (s: string) => s.replace(/\r\n/g, "\n");
/** Any betting ink: a utility, a token, the side buttons, a hand-typed oklch at the pair's hues. */
const sideInk = (src: string) => (code(N(src)).match(/\b(?:[a-z-]+:)*(?:text|bg|border|ring|fill|stroke)-(?:yes|no)-\d{3}\b|var\(--(?:yes|no)-\d{3}\)|\bbtn-(?:yes|no)\b|oklch\([\d.]+%\s+[\d.]+\s+(?:22|152)\b/g) ?? []);
/** Surfaces that name NO side at all: any betting ink in them is an app state wearing a side's colour. */
const SIDELESS = [
  "src/components/profile/avatar-uploader.tsx", "src/app/notifications/row-actions.tsx", "src/app/profile/sessions/page.tsx",
  "src/app/profile/security/security-client.tsx", "src/components/markets/resolution-panel.tsx", "src/components/markets/sell-confirm-modal.tsx",
  "src/components/auth/password-pair.tsx", "src/app/proposals/new/create-form.tsx", "src/components/auth/auth-panel.tsx",
  "src/app/auth/verify-email/page.tsx", "src/app/auth/reset-password/page.tsx", "src/components/ui/page-header.tsx",
  "src/components/ui/page-hero.tsx", "src/components/rg/self-care-art.tsx", "src/app/profile/responsible-gambling/page.tsx",
  "src/app/profile/activity/page.tsx", "src/app/profile/page.tsx", "src/components/wallet/payout-status-notice.tsx",
  "src/components/layout/page-ribbon.tsx", "src/app/leaderboard/page.tsx", "src/lib/i18n.tsx", "src/app/agent/apply/apply-client.tsx",
  "src/app/wallet/wallet-client.tsx", "src/app/profile/source-of-funds/page.tsx",
];
const sideless = SIDELESS.map((f) => [f, sideInk(read(f))] as const).filter(([, hits]) => hits.length > 0);
ok(`§7a ${SIDELESS.length} surfaces that name no side carry no betting ink`, sideless.length === 0, sideless.map(([f, x]) => `${f}: ${x.join(" ")}`).join(" | "));
/** The places that DO name a side, read only where they say an app state. */
function appStateDefects(orm: string, css: string, bell: string, dial: string, stakeCtl: string): string[] {
  const d: string[] = [];
  const o = code(N(orm));
  const tone = o.slice(o.indexOf("const TONE: Record<OperationVariant"), o.indexOf("function CrestIcon"));
  if (!tone) d.push("the result dialog's TONE map was not found");
  if (sideInk(tone).length) d.push(`the result dialog's crests wear the betting pair: ${sideInk(tone).join(" ")}`);
  if (/btn-no/.test(tone)) d.push("the failure's way out is the NO side's stake button");
  if (!/crest\("var\(--success\)", "var\(--success-fg\)"\)/.test(tone) || !/crest\("var\(--danger\)", "var\(--danger-fg\)"\)/.test(tone)) d.push("the crests are not the app-state families");
  const c = code(N(css));
  const pulse = c.slice(c.indexOf("@keyframes ud-place-pulse"), c.indexOf(".ud-place-pulse"));
  if (!pulse || sideInk(pulse).length) d.push("the placed pulse is missing or wears a side's ink");
  const delta = (c.match(/\.kp-jbal__delta[^{]*\{[^}]*\}/g) ?? []).join("\n");
  if (!delta || sideInk(delta).length) d.push("the journey balance's ±delta is missing or wears a side's ink");
  const b = code(N(bell));
  if (!/const countTone = journey \? "brand" : "rose";/.test(b) || !/const clearAllHover = journey \? "hover:text-danger-fg" : "hover:text-no-300";/.test(b)) d.push("the journey bell's count or Clear-all borrows the NO rose");
  const k = code(N(dial));
  const chips = k.match(/<span className="mt-1 inline-flex items-center gap-1 rounded-pill border [^"]*">/g) ?? [];
  if (chips.length !== 2 || chips.some((x) => sideInk(x).length)) d.push("the dial's out-of-range chips are missing or wear the NO rose");
  if (/border-no-700|bg-no-500\/10/.test(k)) d.push("the dial's short-balance line is a NO-rose box");
  if (!/customInvalid \? "text-danger-fg"/.test(code(N(stakeCtl)))) d.push("Up & Down's out-of-range amount is not the field-error ink");
  return d;
}
const ORM = read("src/components/markets/operation-result-modal.tsx"), BELL = read("src/components/layout/notifications-panel.tsx");
const DIAL = read("src/components/markets/conviction-dial.tsx"), STAKE = read("src/components/updown/updown-stake-controls.tsx");
ok("§7b the result's crests, the placed pulse, the balance's ±delta, the journey bell, the dial's chips, a stake out of range: app-state inks",
  appStateDefects(ORM, css, BELL, DIAL, STAKE).length === 0, appStateDefects(ORM, css, BELL, DIAL, STAKE).join("; "));
const plantCrest = N(ORM).replace('...crest("var(--success)", "var(--success-fg)"),', '...crest("var(--yes-400)", "var(--yes-300)"),');
const plantNoBtn = N(ORM).replace(/(danger: \{\s*\.\.\.crest\("var\(--danger\)", "var\(--danger-fg\)"\),[\s\S]*?)primaryBtn: "btn-primary",/, '$1primaryBtn: "btn-no",');
const plantPulse = N(css).replace("color-mix(in oklab, var(--success-500) 55%, transparent)", "color-mix(in oklab, var(--yes-500) 55%, transparent)");
const plantDelta = N(css).replace(".kp-jbal__delta[data-sign] { color: var(--text); }", '.kp-jbal__delta[data-sign="up"] { color: var(--yes-300); }');
const plantBell = N(BELL).replace('const countTone = journey ? "brand" : "rose";', 'const countTone = "rose";');
const plantHover = N(read("src/components/profile/avatar-uploader.tsx")).replace("group-hover:border-danger-border group-hover:text-danger-fg", "group-hover:border-no-700 group-hover:text-no-300");
ok("§7c control · every planted copy found its target",
  plantCrest !== N(ORM) && plantNoBtn !== N(ORM) && plantPulse !== N(css) && plantDelta !== N(css) && plantBell !== N(BELL) && plantHover !== N(read("src/components/profile/avatar-uploader.tsx")));
ok("§7d control · a YES-green success crest is reported", appStateDefects(plantCrest, css, BELL, DIAL, STAKE).length > 0);
ok("§7e control · the NO side's button as a refusal's way out is reported", appStateDefects(plantNoBtn, css, BELL, DIAL, STAKE).length > 0);
ok("§7f control · a YES-green placed pulse and a YES-green balance move are reported", appStateDefects(ORM, plantPulse, BELL, DIAL, STAKE).length > 0 && appStateDefects(ORM, plantDelta, BELL, DIAL, STAKE).length > 0);
ok("§7g control · the journey bell's count back in the NO rose is reported", appStateDefects(ORM, css, plantBell, DIAL, STAKE).length > 0);
ok("§7h control · a destructive hover in the NO rose is reported", sideInk(plantHover).length === 2, "", sideInk(plantHover).join(" "));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 8) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
