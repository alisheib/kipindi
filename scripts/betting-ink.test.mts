/**
 * THE BETTING PAIR NAMES A SIDE — NEVER TIME, NEVER LIVENESS. `npm run test:betting-ink` (in `predeploy`).
 *
 * ⭐ WHY (2026-09-14, session 96, register E-405 and E-406). DESIGN_AUTHORITY §B2a reserves `--yes-*` / `--no-*` for the
 * side a stake is on. The visual pass of 2026-09-14 found two families still borrowing them:
 *   · LIVE — a live card's time-left (`.mcardp-meta .live`, `--yes-300`, directly under the YES/NO buttons), a topic
 *     tile's live count (`.kp-topic__live`, `--yes-400`), and the hero's open-markets figure and pip (`--yes-400`).
 *     The player's LIVE signal is neutral under Ali's 2026-10-19 U43 ruling (§B11).
 *   · URGENCY — the Up & Down countdown's final 30 s painted the digits `--no-300`, beside the round's Down side,
 *     where rose reads as "price going down". The kit's `.m-urgent` carries the urgency.
 *   · A PRICE MOVE (§5, 2026-09-27, the landing v3 WP3+WP4 review, R8) — the grid card inked its 24h move
 *     "+5pt" green-up / rose-down while the featured card on the same page printed the same move in neutral ink
 *     in neutral ink. A move of the YES price is not a side, and a green-up move invites chasing.
 *   · A FORM ERROR (§6, 2026-09-30, the Vodacom plan S2 design panel) — the market wizard's and the AI poll form's
 *     validation lines wore `text-no-300` / `border-no-700` while the counter above them wore `text-danger-fg`: two
 *     reds stacked on one field, and the betting NO pair spent on an app state. A form error is the danger ink.
 *   · AN OFFICER'S VERDICT (§8, 2026-10-14, the Vodacom plan S12 WP6) — the console's Reject, Debit, Suspend and Remove
 *     wore the NO side's button or tint and its Approve, Credit, Restore and Reopen the YES side's. A verdict is the
 *     console's `primary` / `danger` (accepted by Ali, 2026-10-14 — Points for Ali 13, relayed by the coordinator); the
 *     restoring actions' family is ONE constant
 *     (`RESTORING_FAMILY`) over one named list (`RESTORING`).
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
console.log("\n§1 · the LIVE signal wears neutral ink throughout");
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
  if (pip && !/background:\s*var\(--text-subtle\)/.test(pip)) d.push(".kp-proof__pip is not neutral --text-subtle");
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
  // The kit loop lives on the digits in each readout; the detail pod and card
  // also say the final seconds in words for players who reduce motion.
  if (!/<span className=\{urgent \? "m-urgent" : undefined\}>\{shownDigits\}<\/span>/.test(p)
    || !/const shownCaption = urgent \? lastSecondsLabel! : handCaption \?\? caption;/.test(p))
    d.push("the round pod lost its named final-30 s urgency");
  if (!/className=\{urgent \? "kp-track-end kp-track-end--05 m-urgent" : "kp-track-end kp-track-end--05"\}/.test(p))
    d.push("the board panel lost its kit final-30 s motion");
  if (!/<span className=\{urgent \? "m-urgent" : undefined\}>\{digits \?\? mmss\(left\)\}<\/span>/.test(k)
    || !/urgent \? t\.market\.udLastSeconds/.test(k)) d.push("the card lost its named final-30 s urgency");
  // ⛔ …and it may not ride on the `.m-tick` element again, where the tick's animation silently replaces it.
  for (const [name, src] of [["round-countdown.tsx", p], ["updown-card.tsx", k]] as const) {
    if (/className=\{[^}]*m-tick[^}]*m-urgent|cn\("m-tick[^)]*"m-urgent"/.test(src)) d.push(`${name}: the urgency loop shares the .m-tick element (the tick's animation wins the cascade)`);
  }
  if (!/const urgent = !inResult && isOpen && lastSecondsLabel != null && left != null && left > 0 && left <= 30;/.test(p)) d.push("the pod's 30 s threshold moved");
  if (!/color: tone,/.test(k)) d.push("the card's digits do not take the phase tone");
  return d;
}
const pod = read(POD), card = read(CARD);
ok("§2a the pod, the board panel and the card pulse in the final 30 s without rose digits", urgencyDefects(pod, card).length === 0, urgencyDefects(pod, card).join("; "));

/* §3 · PLANTED CONTROLS — the shipped defects, re-planted into copies. ────── */
console.log("\n§3 · planted controls");
const plantMeta = css.replace(".mcardp-meta .live { color: var(--text-muted);", ".mcardp-meta .live { color: var(--yes-300);");
const plantPip = css.replace("  background: var(--text-subtle);\n  flex: none;", "  background: var(--yes-400);\n  box-shadow: var(--bar-glow-yes);\n  flex: none;")
  .replace("  background: var(--text-subtle);\r\n  flex: none;", "  background: var(--yes-400);\r\n  box-shadow: var(--bar-glow-yes);\r\n  flex: none;");
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
   on every card — a measured change since its first available reading within 24h, neutral ink — drawn by ONE component
   (`DayAgoMove`); the grid card's own renderer, which inked "+5pt" in the betting pair, is gone. The
   component is the only surface that prints a 24h move (`t.market.h24MoveOne` is read by the card alone). */
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
  if (!k.includes('<DayAgoMove move={yesPct - dayAgo} side={sideWord(t, "YES", productLine)} labels={{ one: t.market.h24MoveOne, many: t.market.h24MoveMany, flat: t.market.h24MoveFlat }} keyed />')) d.push("the featured card does not print its move through the one component");
  if (!k.includes('<DayAgoMove move={move24h} side={sideWord(t, "YES", productLine)} labels={{ one: t.market.h24MoveOne, many: t.market.h24MoveMany, flat: t.market.h24MoveFlat }} keyed={false} />')) d.push("the grid card does not print its move through the one component");
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
    else if (/\.tsx?$/.test(e) && p !== DICT && /\bh24MoveOne\b/.test(code(read(p)))) moveReaders.push(p);
  }
})("src");
ok("§5b the card is the only surface that prints a 24h move, and the retired `twentyFourHourMove` is gone",
  moveReaders.length === 1 && moveReaders[0] === MCARD && !/\btwentyFourHourMove\b/.test(code(read(DICT))),
  moveReaders.join(", "));
const plantMoveInline = mcard.replace('<span className="mcardp-h24">', '<span className="mcardp-h24" style={{ color: move > 0 ? "var(--yes-400)" : "var(--no-400)" }}>');
const plantMoveSheet = css.replace(/(\.mcardp-h24 \{[^}]*?)color: var\(--text-subtle\);/, "$1color: var(--yes-400);");
const plantMoveGrid = mcard.replace("<DayAgoMove move={move24h} side={sideWord(t, \"YES\", productLine)} labels={{ one: t.market.h24MoveOne, many: t.market.h24MoveMany, flat: t.market.h24MoveFlat }} keyed={false} />", "<MoveText move={move24h} labels={t.market.h24MoveMany} />");
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
  if (!/const countTone = "brand";/.test(b) || !/const clearAllHover = "hover:text-text";/.test(b)) d.push("a player bell's unread count or Clear-all borrows the NO rose");
  const k = code(N(dial));
  const chips = k.match(/<span className="mt-1 inline-flex items-center gap-1 rounded-pill border [^"]*">/g) ?? [];
  if (chips.length !== 2 || chips.some((x) => sideInk(x).length)) d.push("the dial's out-of-range chips are missing or wear the NO rose");
  if (/border-no-700|bg-no-500\/10/.test(k)) d.push("the dial's short-balance line is a NO-rose box");
  const stake = code(N(stakeCtl));
  if (!/aria-invalid=\{customInvalid\}/.test(stake) || !/attention=\{customInvalid\}/.test(stake)
    || /error=\{customInvalid\}/.test(stake) || !/customInvalid \? "text-text" : "text-text-subtle"/.test(stake))
    d.push("Up & Down's out-of-range amount lost its neutral error cue or aria-invalid");
  return d;
}
const ORM = read("src/components/markets/operation-result-modal.tsx"), BELL = read("src/components/layout/notifications-panel.tsx");
const DIAL = read("src/components/markets/conviction-dial.tsx"), STAKE = read("src/components/updown/updown-stake-controls.tsx");
ok("§7b the result's crests, the placed pulse, the balance's ±delta, both player bells, the dial's chips, a stake out of range: app-state inks",
  appStateDefects(ORM, css, BELL, DIAL, STAKE).length === 0, appStateDefects(ORM, css, BELL, DIAL, STAKE).join("; "));
const plantCrest = N(ORM).replace('...crest("var(--success)", "var(--success-fg)"),', '...crest("var(--yes-400)", "var(--yes-300)"),');
const plantNoBtn = N(ORM).replace(/(danger: \{\s*\.\.\.crest\("var\(--danger\)", "var\(--danger-fg\)"\),[\s\S]*?)primaryBtn: "btn-primary",/, '$1primaryBtn: "btn-no",');
// U43 (Ali, 2026-10-19): the card pulse moved from success green to neutral.
// Plant against its actual keyframe, or this control can silently miss its target.
const plantPulse = N(css).replace("0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--text) 40%, transparent); }",
  "0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--yes-500) 55%, transparent); }");
const plantDelta = N(css).replace(".kp-jbal__delta[data-sign] { color: var(--text); }", '.kp-jbal__delta[data-sign="up"] { color: var(--yes-300); }');
const plantBell = N(BELL).replace('const countTone = "brand";', 'const countTone = "rose";');
const plantHover = N(read("src/components/profile/avatar-uploader.tsx")).replace("group-hover:border-danger-border group-hover:text-danger-fg", "group-hover:border-no-700 group-hover:text-no-300");
ok("§7c control · every planted copy found its target",
  plantCrest !== N(ORM) && plantNoBtn !== N(ORM) && plantPulse !== N(css) && plantDelta !== N(css) && plantBell !== N(BELL) && plantHover !== N(read("src/components/profile/avatar-uploader.tsx")));
ok("§7d control · a YES-green success crest is reported", appStateDefects(plantCrest, css, BELL, DIAL, STAKE).length > 0);
ok("§7e control · the NO side's button as a refusal's way out is reported", appStateDefects(plantNoBtn, css, BELL, DIAL, STAKE).length > 0);
ok("§7f control · a YES-green placed pulse and a YES-green balance move are reported", appStateDefects(ORM, plantPulse, BELL, DIAL, STAKE).length > 0 && appStateDefects(ORM, plantDelta, BELL, DIAL, STAKE).length > 0);
ok("§7g control · either player bell's count back in the NO rose is reported", appStateDefects(ORM, css, plantBell, DIAL, STAKE).length > 0);
ok("§7h control · a destructive hover in the NO rose is reported", sideInk(plantHover).length === 2, "", sideInk(plantHover).join(" "));

/* §8 · AN OFFICER'S VERDICT IS NOT A SIDE (the Vodacom plan S12 WP6, 2026-10-14) ───────────────────────────────────────────
   §B2a, read in the console: the YES/NO ink names the side a stake is on, never an officer's verdict. The console's decisions
   were moved once (78546e830: Approve `primary`, Reject `danger` — the source-of-funds review, the agent decision rail, the
   proposals, Up & Down's proposals, the stuck payouts, the contact lists) and these were missed: two NO-side Rejects, the AML
   approve arm, the player's Suspend / Restore / Reopen, the balance adjustment's Credit / Debit (its commit AND its direction
   toggle, which S12-PLAN's table did not list) and moderation's Remove / Restore. Each is a NAMED arm below: its site, read
   exactly once with comments out; the paint that arm takes (the kit Button's `variant`, a raw button's `.btn-*` class, or a
   hand-typed tint); the family its verdict wears; and the betting spelling §8e plants back (the shipped one, except AML's
   reject arm, which shipped `danger` and is planted as `no`). */
console.log("\n§8 · an officer's verdict wears the console's primary or danger, never a side's");
type Fam = "brand" | "danger" | "success";
type Paint = "variant" | "cls" | "tint";
/** Each family as each paint spells it. A tint names every token it needs: the brand tint is the kit's own selected-control
 *  tint (`ui/pagination.tsx`, `wallet/amount-field.tsx`), the danger tint the danger family's three tokens. */
const SPELL: Record<Fam, { variant: string; cls: string; tint: string[] }> = {
  brand: { variant: "primary", cls: "btn-primary", tint: ["border-brand-500", "bg-brand-500/15", "text-brand-300"] },
  danger: { variant: "danger", cls: "btn-danger", tint: ["border-danger-border", "bg-danger-bg", "text-danger-fg"] },
  // The family the plan offered as the overrule, and Ali did not choose. ⚠️ The kit `<Button>` has no `success` variant and
  // globals.css no `.btn-success`: a later change to it adds one to the kit (§B9, §B10), or keeps the two kit commits on
  // brand and moves the four tints.
  success: { variant: "success", cls: "btn-success", tint: ["border-success-border", "bg-success-bg", "text-success-fg"] },
};
/** ⭐ THE RESTORING ACTIONS' FAMILY — DECIDED, AND WRITTEN IN ONE PLACE. Credit, Restore and Reopen wear the brand ink, the
 *  console's `primary` (Reject, Debit, Suspend and Remove the danger red; Resolve YES/NO stays a side): S12-PLAN's Open
 *  point 30, accepted by Ali, 2026-10-14 (Points for Ali 13, relayed by the coordinator). The list below stays named
 *  because it documents the decision: a later change of mind (the plan's overrule, "the success family for the restoring
 *  actions") is this constant plus re-classing the six arms of `RESTORING`; §8f proves the constant reaches exactly
 *  those six arms and nothing else. */
const RESTORING_FAMILY: Fam = "brand";
type Arm = { name: string; file: string; at: RegExp; group: number; paint: Paint; onPair: string };
const CANDIDATES = "src/app/admin/candidates/candidate-actions.tsx";
const AML = "src/app/admin/aml/aml-actions-client.tsx";
const SUSPEND = "src/app/admin/players/[id]/suspend-controls.tsx";
const ADJUST = "src/app/admin/players/[id]/balance-adjust-controls.tsx";
const MODERATION = "src/app/admin/moderation/moderation-client.tsx";
// One control, two verdicts: the arms of one ternary share one reader, each its own capture group.
const AML_SUBMIT = /<Button size="sm" variant=\{mode === "approve" \? "([\w-]+)" : "([\w-]+)"\} onClick=\{\(\) => submit\(mode\)\}/;
const SUSPEND_COMMIT = /variant=\{mode === "suspend" \? "([\w-]+)" : "([\w-]+)"\}[^]{0,200}?onClick=\{submit\}/;
const ADJUST_COMMIT = /variant=\{direction === "credit" \? "([\w-]+)" : "([\w-]+)"\}[^]{0,200}?onClick=\{submit\}/;
const ADJUST_CHOSEN = /\(d === "credit" \? "([^"]*)" : "([^"]*)"\)/;
const SUSPEND_OPENER = /className=\{`\$\{btnBase\} ([^`]*)`\}\s*>\s*<I\.shieldOff s=\{11\} aria-hidden \/>\s*Suspend player/;
const RESTORE_OPENER = /className=\{`\$\{btnBase\} ([^`]*)`\}\s*>\s*<I\.shieldcheck s=\{11\} \/>\s*Restore player/;
const REOPEN_OPENER = /className=\{`\$\{btnBase\} ([^`]*)`\}\s*>\s*<I\.shieldcheck s=\{11\} \/>\s*Reopen after self-exclusion/;
const MOD_RESTORE = /onClick=\{\(\) => act\("restore", c\)\}\s*disabled=\{pending\}\s*className="([^"]*)"\s*>\s*<I\.rotateCcw s=\{12\} aria-hidden \/> Restore/;
const MOD_REMOVE = /onClick=\{\(\) => act\("remove", c\)\}\s*disabled=\{pending\}\s*className="([^"]*)"\s*>\s*<I\.trash s=\{12\} \/> Remove/;
const YES_TINT_OPENER = "border-yes-700 bg-yes-500/15 text-yes-300 hover:bg-yes-500/25 transition-colors";
/** Moderation's two buttons as they shipped: one class list, the betting tint in its middle. */
const MOD_BASE = (middle: string) => `inline-flex min-h-[var(--tap-min)] items-center gap-1.5 rounded-md border ${middle} transition-colors disabled:opacity-50`;
/** The refusing verdicts — Reject, Suspend, Debit, Remove — wear danger. */
const REFUSING: Arm[] = [
  { name: "the AI poll's Reject (its popover's commit)", file: POLL_FORM, group: 1, paint: "cls", onPair: "btn btn-no btn-md w-full",
    at: /<button type="button" onClick=\{submit\} disabled=\{pending\} className="([^"]*)">\s*\{pending \? "Rejecting…" : "Reject"\}/ },
  { name: "the candidate's Reject (its popover's commit)", file: CANDIDATES, group: 1, paint: "cls", onPair: "btn btn-no btn-md w-full",
    at: /<button type="button" onClick=\{\(\) => onSubmit\(reason, note\)\} className="([^"]*)">Reject<\/button>/ },
  { name: "AML's Submit, its reject arm", file: AML, at: AML_SUBMIT, group: 2, paint: "variant", onPair: "no" },
  { name: "the player's Suspend (the modal's commit)", file: SUSPEND, at: SUSPEND_COMMIT, group: 1, paint: "variant", onPair: "no" },
  { name: "Suspend player (the opener)", file: SUSPEND, at: SUSPEND_OPENER, group: 1, paint: "tint",
    onPair: "border-no-700 bg-no-500/15 text-no-300 hover:bg-no-500/25 transition-colors" },
  { name: "the balance's Debit (the commit)", file: ADJUST, at: ADJUST_COMMIT, group: 2, paint: "variant", onPair: "no" },
  { name: "the balance's Debit (the direction chosen)", file: ADJUST, at: ADJUST_CHOSEN, group: 2, paint: "tint", onPair: "border-no-700 bg-no-500/15 text-no-300" },
  { name: "moderation's Remove", file: MODERATION, at: MOD_REMOVE, group: 1, paint: "tint",
    onPair: MOD_BASE("border-no-700 bg-no-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-no-300 hover:bg-no-500/20") },
];
/** The approving verdict wears the console's established `primary` (78546e830's precedent). */
const APPROVING: Arm[] = [
  { name: "AML's Submit, its approve arm", file: AML, at: AML_SUBMIT, group: 1, paint: "variant", onPair: "yes" },
];
/** ⭐ THE RESTORING ACTIONS — Credit, Restore, Reopen — the one named list `RESTORING_FAMILY` governs. */
const RESTORING: Arm[] = [
  { name: "the player's Restore (the modal's commit)", file: SUSPEND, at: SUSPEND_COMMIT, group: 2, paint: "variant", onPair: "yes" },
  { name: "Restore player (the opener)", file: SUSPEND, at: RESTORE_OPENER, group: 1, paint: "tint", onPair: YES_TINT_OPENER },
  { name: "Reopen after self-exclusion (the opener)", file: SUSPEND, at: REOPEN_OPENER, group: 1, paint: "tint", onPair: YES_TINT_OPENER },
  { name: "the balance's Credit (the commit)", file: ADJUST, at: ADJUST_COMMIT, group: 1, paint: "variant", onPair: "yes" },
  { name: "the balance's Credit (the direction chosen)", file: ADJUST, at: ADJUST_CHOSEN, group: 1, paint: "tint", onPair: "border-yes-700 bg-yes-500/15 text-yes-300" },
  { name: "moderation's Restore", file: MODERATION, at: MOD_RESTORE, group: 1, paint: "tint",
    onPair: MOD_BASE("border-yes-700 bg-yes-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-yes-300 hover:bg-yes-500/20") },
];
const VERDICTS: Array<[Arm, Fam | "restoring"]> = [
  ...REFUSING.map((a): [Arm, Fam | "restoring"] => [a, "danger"]),
  ...APPROVING.map((a): [Arm, Fam | "restoring"] => [a, "brand"]),
  ...RESTORING.map((a): [Arm, Fam | "restoring"] => [a, "restoring"]),
];
const treeCache = new Map<string, string>();
/** The tree as it stands; a planted copy overrides one file (`withCopy`). */
const tree = (f: string) => { let s = treeCache.get(f); if (s === undefined) { s = read(f); treeCache.set(f, s); } return s; };
const withCopy = (file: string, copy: string) => (f: string) => (f === file ? copy : tree(f));
/** Every defect of the verdict arms: a site not read exactly once, an arm on the betting pair, an arm off its family. */
function verdictDefects(src: (f: string) => string, restoring: Fam = RESTORING_FAMILY): string[] {
  const d: string[] = [];
  for (const [arm, f] of VERDICTS) {
    const fam = f === "restoring" ? restoring : f;
    const hits = [...code(N(src(arm.file))).matchAll(new RegExp(arm.at.source, "g"))];
    if (hits.length !== 1) { d.push(`${arm.name}: its site was read ${hits.length} times in ${arm.file}, not once`); continue; }
    const paint = hits[0][arm.group];
    const tokens = paint.split(/\s+/);
    const side = arm.paint === "variant" ? (/^(?:yes|no)$/.test(paint) ? [`variant "${paint}"`] : []) : sideInk(paint);
    if (side.length) d.push(`${arm.name} wears the betting pair: ${side.join(" ")}`);
    const want = SPELL[fam];
    const wears = arm.paint === "variant" ? paint === want.variant
      : arm.paint === "cls" ? tokens.includes(want.cls) : want.tint.every((t) => tokens.includes(t));
    if (!wears) d.push(`${arm.name} does not wear the ${fam} family (${arm.paint === "variant" ? `variant "${want.variant}"` : arm.paint === "cls" ? want.cls : want.tint.join(" ")}): ${paint}`);
  }
  return d;
}
const verdicts = verdictDefects(tree);
ok(`§8a ${VERDICTS.length} verdict arms wear the console's family, never a side's — ${REFUSING.length} refusing → danger, ${APPROVING.length} approving → brand, ${RESTORING.length} restoring → ${RESTORING_FAMILY}`,
  verdicts.length === 0, verdicts.join("; "));

/* The console's legitimate betting uses — each a SIDE, so held ON the pair. */
const RESOLVE = "src/app/admin/resolver-queue/resolve-controls.tsx";
const CEREMONY = "src/app/admin/resolver/[id]/resolution-ceremony.tsx";
const FEE_SIM = "src/app/admin/config/fee-simulator.tsx";
type SidePin = { name: string; file: string; at: RegExp; off: [string, string] };
const SIDES: SidePin[] = [
  { name: "Resolve YES", file: RESOLVE, at: /onClick=\{\(\) => submit\("YES"\)\} disabled=\{pending\} className="btn btn-yes btn-md w-full"/,
    off: ['submit("YES")} disabled={pending} className="btn btn-yes', 'submit("YES")} disabled={pending} className="btn btn-primary'] },
  { name: "Resolve NO", file: RESOLVE, at: /onClick=\{\(\) => submit\("NO"\)\} disabled=\{pending\} className="btn btn-no btn-md w-full"/,
    off: ['submit("NO")} disabled={pending} className="btn btn-no', 'submit("NO")} disabled={pending} className="btn btn-danger'] },
  { name: "the second officer's Confirm, in the staged side's ink", file: RESOLVE,
    at: /const toneClass = \(o: "YES" \| "NO" \| "VOID"\) => \(o === "YES" \? "btn-yes" : o === "NO" \? "btn-no" : "btn-claret"\);/,
    off: ['o === "YES" ? "btn-yes" : o === "NO" ? "btn-no"', 'o === "YES" ? "btn-primary" : o === "NO" ? "btn-danger"'] },
  { name: "the verdict ceremony's YES", file: CEREMONY, at: /\{ value: "YES",[^}]*ring: "var\(--yes-500\)", text: "var\(--yes-300\)" \}/,
    off: ['ring: "var(--yes-500)", text: "var(--yes-300)"', 'ring: "var(--brand-500)", text: "var(--brand-300)"'] },
  { name: "the verdict ceremony's NO", file: CEREMONY, at: /\{ value: "NO",[^}]*ring: "var\(--no-500\)", text: "var\(--no-300\)" \}/,
    off: ['ring: "var(--no-500)", text: "var(--no-300)"', 'ring: "var(--danger-500)", text: "var(--danger-fg)"'] },
  { name: "the fee simulator's winning-side picker", file: FEE_SIM, at: /side === s \? \(s === "YES" \? "btn-yes" : "btn-no"\) : "btn-ghost"/,
    off: ['(s === "YES" ? "btn-yes" : "btn-no")', '(s === "YES" ? "btn-primary" : "btn-danger")'] },
];
const sideDefects = (src: (f: string) => string) => SIDES
  .filter((p) => [...code(N(src(p.file))).matchAll(new RegExp(p.at.source, "g"))].length !== 1)
  .map((p) => `${p.name} is not on the betting pair where it was named (${p.file})`);
ok(`§8b the console's ${SIDES.length} betting uses stay ON the pair — Resolve YES / NO, the staged side's Confirm, the ceremony's two sides, the simulator's winning side`,
  sideDefects(tree).length === 0, sideDefects(tree).join("; "));

/* §8c · THE CENSUS. The console's solid betting buttons — a `btn-yes` / `btn-no` class, or a kit `<Button>` asked for `yes` /
   `no` — are the named sides and nothing else. That family CAN stand at zero (§B2a: scope a guard to the sub-population that
   can); the hand-typed tints cannot (about 80 app-state lines remain in the console), so those are held by name above. */
const SIDE_FILES = new Set([RESOLVE, FEE_SIM]);
const CONSOLE: string[] = [];
for (const top of ["src/app/admin", "src/components/admin"]) (function scanConsole(dir: string) {
  for (const e of readdirSync(join(ROOT, dir))) {
    const p = `${dir}/${e}`;
    if (statSync(join(ROOT, p)).isDirectory()) scanConsole(p);
    else if (/\.tsx?$/.test(e)) CONSOLE.push(p);
  }
})(top);
/** A JSX open tag from its `<`, read with a small lexer (an inline handler's `=>` holds a `>`); null when it runs away. */
function openTag(s: string, from: number): string | null {
  const stack: string[] = [];
  for (let i = from + 1; i < s.length && i < from + 4000; i++) {
    const c = s[i], top = stack[stack.length - 1];
    if (top === '"' || top === "'" || top === "`") { if (c === "\\") i++; else if (c === top) stack.pop(); continue; }
    if (c === '"' || c === "'" || c === "`" || c === "{") stack.push(c);
    else if (c === "}") { if (top === "{") stack.pop(); }
    else if (c === ">" && stack.length === 0) return s.slice(from, i + 1);
  }
  return null;
}
function consoleSideButtons(src: (f: string) => string): string[] {
  const d: string[] = [];
  for (const f of CONSOLE) {
    const k = code(N(src(f)));
    if (!SIDE_FILES.has(f)) for (const m of k.matchAll(/\bbtn-(?:yes|no)\b/g)) d.push(`${f}: ${m[0]}`);
    for (const m of k.matchAll(/<Button\b/g)) {
      const tag = openTag(k, m.index ?? 0);
      if (tag === null) { d.push(`${f}: a <Button> open tag the lexer could not read`); continue; }
      const v = /\bvariant=(\{[^}]*\}|"[^"]*")/.exec(tag)?.[1] ?? "";
      if (/["'`](?:yes|no)["'`]/.test(v)) d.push(`${f}: <Button variant=${v}>`);
    }
  }
  return d;
}
const census8 = consoleSideButtons(tree);
ok(`§8c the console's solid betting buttons are the named sides alone — ${CONSOLE.length} console files read`, census8.length === 0, census8.join(" | "));
const sidesSeen = [...SIDE_FILES].map((f) => (code(N(tree(f))).match(/\bbtn-(?:yes|no)\b/g) ?? []).length);
ok("§8c control · the census reads the side buttons where they are — the resolver's 4, the simulator's 2",
  CONSOLE.includes(RESOLVE) && CONSOLE.includes(FEE_SIM) && sidesSeen[0] === 4 && sidesSeen[1] === 2, "", `resolver ${sidesSeen[0]}, simulator ${sidesSeen[1]}`);

/* §8d–§8f · PLANTED CONTROLS — every arm put back on the pair, every side taken off it, the census given a new one. */
/** A copy of an arm's file with that arm's paint replaced, on the raw text (no arm's reader spans a comment). */
function plantArm(arm: Arm, paint: string): string {
  const raw = N(tree(arm.file));
  const m = new RegExp(arm.at.source, "d").exec(raw);
  const span = m?.indices?.[arm.group];
  return span ? raw.slice(0, span[0]) + paint + raw.slice(span[1]) : raw;
}
const armPlants = VERDICTS.map(([arm]) => [arm, plantArm(arm, arm.onPair)] as const);
const sidePlants = SIDES.map((p) => {
  const raw = N(tree(p.file));
  return [p, raw.split(p.off[0]).length === 2 ? raw.replace(p.off[0], p.off[1]) : raw] as const;
});
const SOF = "src/app/admin/approvals/sof-review-client.tsx";
const LISTS = "src/app/admin/contacts/lists-card.tsx";
// 78546e830's own shipped defect, reversed: the source-of-funds Accept back on the YES side's button.
const plantSof = N(tree(SOF)).replace('<Button size="sm" variant="primary" disabled={busy !== null} loading={busy === "ACCEPT"}', '<Button size="sm" variant="yes" disabled={busy !== null} loading={busy === "ACCEPT"}');
const plantLists = N(tree(LISTS)) + '\nexport const PlantedReject = () => <button type="button" className="btn btn-no btn-sm">Reject</button>;\n';
ok("§8d control · every planted copy found its target",
  armPlants.every(([a, s]) => s !== N(tree(a.file))) && sidePlants.every(([p, s]) => s !== N(tree(p.file))) && plantSof !== N(tree(SOF)),
  [...armPlants.filter(([a, s]) => s === N(tree(a.file))).map(([a]) => a.name), ...sidePlants.filter(([p, s]) => s === N(tree(p.file))).map(([p]) => p.name), ...(plantSof === N(tree(SOF)) ? ["the source-of-funds Accept"] : [])].join(", "));
for (const [arm, planted] of armPlants) {
  const got = verdictDefects(withCopy(arm.file, planted)).filter((x) => x.startsWith(arm.name) && x.includes("betting pair"));
  ok(`§8e control · ${arm.name}, put back on the pair, is reported`, got.length > 0, "", got.join("; "));
}
for (const [p, planted] of sidePlants) {
  const got = sideDefects(withCopy(p.file, planted));
  ok(`§8e control · ${p.name}, taken off the pair, is reported`, got.length > 0 && got.every((x) => x.startsWith(p.name)), "", got.join("; "));
}
const sofGot = consoleSideButtons(withCopy(SOF, plantSof)), listsGot = consoleSideButtons(withCopy(LISTS, plantLists));
ok("§8e control · the census reports a kit <Button> asked for the YES side (the source-of-funds Accept, 78546e830's defect)", sofGot.length === 1, "", sofGot.join(" | "));
ok("§8e control · the census reports a raw NO-side Reject in a console file that names no side", listsGot.length === 1, "", listsGot.join(" | "));
// §8f · the overrule is ONE constant: read with the restoring family switched, exactly the six RESTORING arms leave it.
const overrule = verdictDefects(tree, "success");
ok(`§8f control · switched to success, the restoring family reaches exactly the ${RESTORING.length} RESTORING arms and nothing else`,
  overrule.length === RESTORING.length && RESTORING.every((a) => overrule.some((x) => x.startsWith(a.name))) && !overrule.some((x) => x.includes("betting pair")),
  "", `${overrule.length} reported: ${overrule.map((x) => x.split(" does not")[0]).join(", ")}`);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 8) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
