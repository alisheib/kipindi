/**
 * ROUND 7 OF THE VISUAL PASS, FIXER B (2026-10-10, ALI-BLADE15) — inks, signs and states: the colour family of round 6's
 * read (S/vtools/tools/visual/triage-r6.md), each finding fixed with every sibling it has, each fix held beside a
 * control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r7b.test.mts        (npm run test:visual-pass-r7b)
 *
 *   §1  R5-6  one page-head eyebrow ink, `--text-subtle` — PageHeader, AuthHeader's page names, every hand-drawn head
 *   §2  R8-3  one ink for a stake that came back: VOID is the dictionary's SLATE on every player surface, as REVERSED,
 *            CANCELLED and CASHED_OUT already are; no void word is drawn in the royal family anywhere
 *   §3  R5-2  the crest is one look at every width: each crest's SVG ids are its own, so a hidden copy of the same
 *            player's crest (the journey header's, below 1024) can no longer blank the visible one
 *   §4  R5-7  one formatter for a rate of return: "+54.1%" / "−5.1%" (owner item 51: plain text, its sign its own)
 *   §5  R5-10 one wave backdrop: the error view fades its wave as the not-found view does, and so does every frameless wave
 *   §6  contrast — every ink pair this round moves, measured on its worst surface
 *   §7  no dictionary word changed
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r7/b/mutation-r7b.py
 *   (27 plants, each caught on its named check, every file restored byte-identical — sha-256).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { decomment, decommentCss } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const hasIn = (src: string, snippet: string) => squash(src).includes(squash(snippet));
const has = (file: string, snippet: string) => hasIn(code(file), snippet);
const j = (v: unknown) => JSON.stringify(v);
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.replace(/\\/g, "/")] : [];
});
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const PLAYER_TSX = walk("src", /\.tsx$/).filter((f) => !OUT.test(f));
const CSS = decommentCss(raw("src/app/globals.css"));

const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");

/** Every `<Tag …>` opening element in `src` (decommented), braces balanced so an attribute's `=>` never ends it. */
function elementsOf(src: string, tag: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  for (const m of src.matchAll(new RegExp(`<${tag}\\b`, "g"))) {
    let depth = 0, i = (m.index ?? 0) + m[0].length;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push({ line: src.slice(0, m.index).split("\n").length, text: src.slice(m.index, i + 1) });
  }
  return out;
}
/** The balanced `{…}` value of attribute `name` in an element's text, or "". */
function attrExpr(el: string, name: string): string {
  const at = el.search(new RegExp(`\\b${name}=\\{`));
  if (at < 0) return "";
  let depth = 0, i = el.indexOf("{", at);
  const start = i;
  for (; i < el.length; i++) { if (el[i] === "{") depth++; else if (el[i] === "}" && --depth === 0) break; }
  return el.slice(start + 1, i);
}
/** The colour utilities in a class string (never a size rung such as `text-caption`). */
const INK = /\btext-(?:text(?:-muted|-subtle|-faint)?|info-fg|brand-\d+|royal-\d+(?:\/\d+)?|aqua-\d+|gold-\d+|success-fg|danger-fg|warning-fg|yes-\d+|no-\d+|claret-\d+)\b/g;
const inksOf = (cls: string) => [...cls.matchAll(INK)].map((m) => m[0]);

/* ══ §1 · ONE PAGE-HEAD EYEBROW INK ══════════════════════════════════════════════════════════════════════════════════ */
section("1 · R5-6 one page-head eyebrow ink — `--text-subtle`, R5-C's \"ink 191 player eyebrows wear\" — on every page head");
const PH_FILE = "src/components/ui/page-header.tsx";
const AH_FILE = "src/components/auth/auth-panel.tsx";
/** The PageHeader map, as its source writes it — every key and its class. */
const mapOf = (src: string, name: string) => {
  const body = new RegExp(`const ${name}: Record<\\w+, string> = \\{([^}]*)\\}`).exec(src)?.[1] ?? "";
  return Object.fromEntries([...body.matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
};
/** 1.2's predicate: the kit offers ONE eyebrow ink, the subtle one. */
const pageHeaderOneInk = (src: string) => {
  const map = mapOf(src, "EYEBROW_TONE");
  return j(map) === j({ subtle: "text-text-subtle" }) && /type Tone = "subtle";/.test(src);
};
/** 1.3's predicate over one `<PageHeader …>` element: no tone, and a glyph in the eyebrow's own ink (or none). */
const STATE_GLYPH_HEADS = new Map<string, string>([
  // The deposit return names the deposit in the eyebrow's words; its glyph IS the outcome — paid ✓, failed !, reversed ↺,
  // waiting ◷ — each in its §B11 state ink (R5-I: a state's mark in its own family). A state mark, not the page's name.
  ["src/app/wallet/deposit/return/page.tsx", "the outcome glyph in its state's ink (success · danger · slate · royal), the words subtle"],
]);
const headerCallOk = (file: string, el: string) => {
  if (/\btone=/.test(el)) return false;
  const icon = attrExpr(el, "icon");
  const inks = inksOf(icon);
  return inks.every((i) => i === "text-text-subtle") || STATE_GLYPH_HEADS.has(file);
};
{
  const { PageHeader } = req("../src/components/ui/page-header.tsx") as { PageHeader: (p: Record<string, unknown>) => unknown };
  const markup = renderToStaticMarkup(h(PageHeader as never, { eyebrow: "MAPENDEKEZO", title: "x", icon: h("svg", { "data-g": "1" }) }));
  const eyebrowCls = /<p class="([^"]*)"><svg data-g="1"/.exec(markup)?.[1] ?? "";
  ok("1.1 EXECUTED · PageHeader draws its eyebrow in `--text-subtle` and no other ink (its glyph rides in it, currentColor)",
    inksOf(eyebrowCls).length === 1 && inksOf(eyebrowCls)[0] === "text-text-subtle", eyebrowCls);
  const PH = code(PH_FILE);
  ok("1.2 · the kit offers ONE eyebrow ink — `info` left the map as `gold` and `yes` did (R5-C, R5-I): a page's name is not a notice",
    pageHeaderOneInk(PH), j(mapOf(PH, "EYEBROW_TONE")));
  const calls = PLAYER_TSX.flatMap((f) => elementsOf(code(f), "PageHeader").map((e) => ({ file: f, ...e })));
  const bad = calls.filter((c) => !headerCallOk(c.file, c.text));
  ok(`1.3 · CENSUS · ${calls.length} PageHeader call sites (pages and their loading drawings): none asks for a tone, every eyebrow glyph rides in the eyebrow's ink — the one state glyph registered`,
    calls.length >= 60 && bad.length === 0, j(bad.map((b) => `${b.file}:${b.line}`)));
  const planted = `<PageHeader tone="info" icon={<I.bellRing s={22} />} eyebrow={t.notif.eyebrow} title={t.notif.title} />`;
  const plantedIcon = `<PageHeader icon={<I.user s={14} className="text-info-fg" />} eyebrow={t.profile.myAccount} title={t.profile.myAccount} />`;
  ok("1.3′ PLANT · the round-6 call (`tone=\"info\"`) and an info-ink glyph are each reported",
    !headerCallOk("src/app/notifications/page.tsx", planted) && !headerCallOk("src/app/profile/account/page.tsx", plantedIcon));
  ok("1.2′ PLANT · a map with `info` back in it is reported",
    !pageHeaderOneInk(PH.replace('subtle: "text-text-subtle",', 'subtle: "text-text-subtle",\n  info: "text-info-fg",').replace('type Tone = "subtle";', 'type Tone = "subtle" | "info";')));
}
{
  // AuthHeader: the page's NAME (Ingia, Fungua akaunti, Umesahau nenosiri?, Uthibitisho, Badilisha nenosiri, the two-step
  // and confirm-email names) wears the one eyebrow ink; a STATE eyebrow — "Kiungo kimeisha", "Barua pepe imethibitishwa" —
  // is a status word and keeps its state's ink, as its medallion does (R5-I; §B11: a word in its tone).
  const { AuthHeader } = req("../src/components/auth/auth-panel.tsx") as { AuthHeader: (p: Record<string, unknown>) => unknown };
  const nameCls = /<p class="([^"]*)">INGIA<\/p>/.exec(renderToStaticMarkup(h(AuthHeader as never, { eyebrow: "INGIA", title: "Karibu" })))?.[1] ?? "";
  const AH = code(AH_FILE);
  const amap = mapOf(AH, "EYEBROW_TONE");
  ok("1.4 EXECUTED · an auth page's name eyebrow (the default) is `--text-subtle`; the map is subtle · danger · success, no `brand`",
    inksOf(nameCls).join() === "text-text-subtle" && j(amap) === j({ subtle: "text-text-subtle", danger: "text-danger-fg", success: "text-success-fg" })
      && /tone = "subtle",/.test(AH), j({ nameCls, amap }));
  const STATE_EYEBROWS: Record<string, RegExp> = {
    "src/app/auth/reset-password/page.tsx": /tone="danger"\s+eyebrow=\{c\.eyebrow\}/,
    "src/app/auth/verify-email/page.tsx": /tone=\{good \? "success" : "danger"\}\s+eyebrow=\{c\.eyebrow\}/,
  };
  const acalls = PLAYER_TSX.flatMap((f) => elementsOf(code(f), "AuthHeader").map((e) => ({ file: f, ...e })));
  const toned = acalls.filter((c) => /\btone=/.test(c.text));
  const badA = toned.filter((c) => !(STATE_EYEBROWS[c.file] && STATE_EYEBROWS[c.file].test(c.text)));
  ok(`1.5 · CENSUS · ${acalls.length} AuthHeader call sites: ${acalls.length - toned.length} page names take the default; the ${toned.length} toned are the registered STATE lines (a link expired / an address confirmed), each saying its state's own words`,
    acalls.length >= 9 && toned.length === 2 && badA.length === 0, j(badA.map((b) => `${b.file}:${b.line}`)));
  ok("1.5′ PLANT · a page name asking for `brand` again is reported", !(STATE_EYEBROWS["src/app/auth/reset-password/page.tsx"].test(`<AuthHeader tone="brand" eyebrow={t.auth.signInTitle} />`)));
}
{
  // Every other player head: a file that draws its own <h1>. Each is registered with the eyebrow it draws over (or
  // beside) its title — in the subtle ink — or the reason it draws none, or the state it says.
  type Head = { eyebrow?: string; none?: string; state?: string; kit?: string };
  const HEADS: Record<string, Head> = {
    "src/app/markets/page.tsx": { eyebrow: '<p className="font-mono text-caption font-bold uppercase eyebrow text-text-subtle">' },
    "src/app/results/page.tsx": { eyebrow: '<p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">{t.results.title}</p>' },
    "src/app/live/page.tsx": { eyebrow: '<p className="font-mono text-label uppercase eyebrow font-bold text-text-subtle">{t.common.live}</p>' },
    "src/app/profile/page.tsx": { eyebrow: '<p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">' },
    "src/components/ui/not-found-view.tsx": { eyebrow: '<p className="font-mono text-micro font-bold uppercase tracking-[0.20em] text-text-subtle">' },
    "src/app/profile/loading.tsx": { none: "the /profile drawing: its eyebrow's words are set and not shown (GhostText)" },
    "src/app/global-error.tsx": { state: "\"CRITICAL ERROR\" — the failure says its state in the danger values it writes out (its own document)" },
    "src/components/ui/route-error.tsx": { state: "\"Something went wrong\" — a failure's state line in the danger ink, as its medallion" },
    "src/components/ui/page-header.tsx": { kit: "PageHeader (1.1–1.3)" },
    "src/components/auth/auth-panel.tsx": { kit: "AuthHeader (1.4–1.5)" },
    "src/app/proposals/page.tsx": { kit: "PageHeader; the sr-only <h1> is the unavailable branch's" },
    "src/app/account/page.tsx": { none: "the journey's Akaunti hub: its name alone (the canvas draws no line over it)" },
    "src/components/journey/route-ghost.tsx": { none: "the Akaunti hub's drawing" },
    "src/app/markets/[id]/page.tsx": { none: "the question is the head; its chips stand above it" },
    "src/app/proposals/[id]/page.tsx": { none: "the proposal's question is the head; its chips stand above it" },
    "src/app/updown/[roundId]/page.tsx": { none: "the asset's mark and the game's name" },
    "src/app/profile/invite/page.tsx": { none: "sr-only <h1>; its title row is the name alone" },
    "src/app/profile/invite/agent-dashboard.tsx": { none: "sr-only <h1>; the dashboard's rows" },
    "src/app/agent/apply/page.tsx": { none: "sr-only <h1>; the steps' line is subtle (apply-client)" },
    "src/app/auth/admin/page.tsx": { none: "STAFF sign-in, not a player page" },
    "src/components/home/hero-intro.tsx": { none: "the landing's question and its brand claim (`.kp-hero__claim-text`, a class of its own)" },
  };
  const withH1 = PLAYER_TSX.filter((f) => /<h1\b/.test(code(f)));
  const unregistered = withH1.filter((f) => !(f in HEADS));
  const stale = Object.keys(HEADS).filter((f) => !withH1.includes(f));
  ok(`1.6 · CENSUS · every player file that draws its own <h1> (${withH1.length}) is registered: its head's eyebrow, its state, or why it has none — none unregistered, none stale`,
    unregistered.length === 0 && stale.length === 0 && withH1.length >= 18, j({ unregistered, stale }));
  const badHeads = Object.entries(HEADS).filter(([f, hd]) => hd.eyebrow && !(has(f, hd.eyebrow) && inksOf(hd.eyebrow).join() === "text-text-subtle"));
  ok("1.7 · the hand-drawn heads (/markets, /results, /live, /profile, not-found) name their page in `--text-subtle` — /live's masthead was the text's white",
    badHeads.length === 0, j(badHeads.map(([f]) => f)));
  ok("1.7′ · /live's drawing names it in the same ink (R5-L: the ghost's row is the page's)",
    has("src/app/live/loading.tsx", '<p className="font-mono text-label uppercase eyebrow font-bold text-text-subtle">{t.common.live}</p>'));
  ok("1.7″ PLANT · the round-6 /live masthead (`text-text`) is reported", !hasIn(code("src/app/live/page.tsx").replace("eyebrow font-bold text-text-subtle\">{t.common.live}", "eyebrow font-bold text-text\">{t.common.live}"), HEADS["src/app/live/page.tsx"].eyebrow ?? ""));
}

/* ══ §2 · ONE INK FOR A STAKE THAT CAME BACK ═════════════════════════════════════════════════════════════════════════ */
section("2 · R8-3 a void is SLATE — terminal and inert — on every player surface, from the dictionary");
const ST = req("../src/lib/status-tone.ts") as {
  STATUS_TONE: Record<string, Record<string, string>>; TONE_CHIP: Record<string, string>; STATUS_TONE_EXCEPTIONS: Record<string, string>;
  playerStatusChip: (w: string) => string | null; playerStatusInk: (w: string) => string | null; positionStatusChip: (w: string) => string;
};
{
  const TERMINAL = ["VOID", "CASHED_OUT", "REVERSED", "CANCELLED", "EXPIRED", "DECLINED", "REVOKED", "GRANT_EXPIRED", "GRANT_CANCELLED", "GRANT_FORFEITED"];
  const chips = Object.fromEntries(TERMINAL.map((w) => [w, ST.playerStatusChip(w)]));
  ok("2.1 EXECUTED · VOID is the dictionary's slate (`neutral`), one chip with every other terminal state — a refund, a sale, a reversed or cancelled payment, an expired grant",
    ST.STATUS_TONE.VOID.player === "slate" && Object.values(chips).every((v) => v === "neutral"), j(chips));
  ok("2.1′ EXECUTED · the ticket and the classic position card (`positionStatusChip`) and a printed word (`playerStatusInk`) read it too",
    ST.positionStatusChip("VOID") === "neutral" && ST.playerStatusInk("VOID") === "text-text-muted" && ST.TONE_CHIP[ST.STATUS_TONE.VOID.player] === "neutral");
  ok("2.1″ CONTROL · waiting stays royal and the outcomes keep theirs: PENDING and OPEN `pending`, WIN gold, LOSS the betting rose",
    ST.playerStatusChip("PENDING") === "pending" && ST.playerStatusChip("OPEN") === "pending" && ST.playerStatusChip("WIN") === "gold" && ST.positionStatusChip("LOSS") === "no");
  const ex = ST.STATUS_TONE_EXCEPTIONS.VOID ?? "";
  ok("2.2 · the exception names only what still differs — the resolver's claret (§B4a) — and no longer a royal player arm",
    /claret/i.test(ex) && /slate/i.test(ex) && !/Royal to a player/.test(ex), ex.slice(0, 120));
}
{
  /** The words a void, a refund, a reversed or a cancelled state is drawn with. */
  const VOID_KEYS = /t\.(?:common\.voided|market\.statusVoid|market\.resVoided|market\.udVoided|market\.posVoid|market\.udPosRefunded|market\.udRefundTitle|home\.settledVoid|wallet\.txnStatusReversed|wallet\.txnStatusCancelled|wallet\.grantStatus(?:Cancelled|Expired|Forfeited))\b/g;
  const ROYAL = /variant=(?:"|\{[^}]*")(?:pending|info|brand|active|new|signal)"|\btext-(?:brand|royal|info)-|\btext-info-fg\b|\bbg-(?:brand|royal|info)-|var\(--(?:brand|royal|info)-/;
  /** The nearest opening JSX tag before `at` within two lines — the element a void word is drawn in, or "" (a word map). */
  const tagBefore = (src: string, at: number) => {
    const from = Math.max(0, src.lastIndexOf("\n", src.lastIndexOf("\n", src.lastIndexOf("\n", at - 1) - 1) - 1));
    const win = src.slice(from, at);
    const tags = [...win.matchAll(/(?<![\w$.])<([A-Z][\w.]*|[a-z]+)\b/g)];
    if (!tags.length) return "";
    const last = tags[tags.length - 1];
    const el = elementsOf(win.slice(last.index), last[1].replace(/\./g, "\\."))[0]?.text ?? "";
    return el;
  };
  const voidRoyal = (src: string) => [...src.matchAll(VOID_KEYS)].map((m) => ({ key: m[0], tag: tagBefore(src, m.index ?? 0) })).filter((u) => ROYAL.test(u.tag));
  const uses = PLAYER_TSX.flatMap((f) => [...code(f).matchAll(VOID_KEYS)].map((m) => ({ f, key: m[0] })));
  const royal = PLAYER_TSX.flatMap((f) => voidRoyal(code(f)).map((u) => `${f} · ${u.key} · ${u.tag.slice(0, 60)}`));
  ok(`2.3 · CENSUS · ${uses.length} places a void, refund, reversal or cancellation is worded in player code: not one drawn in the royal family (a hand-typed \`pending\`, \`info\` or brand ink)`,
    uses.length >= 30 && royal.length === 0, j(royal));
  const plantFeatured = code("src/app/results/page.tsx").replace(/<Chip variant=\{TONE_CHIP\[STATUS_TONE\.VOID\.player\]\} size="sm" metrics="status">\{t\.common\.voided\}/, '<Chip variant="pending" size="sm">{t.common.voided}');
  const plantPanel = code("src/components/markets/resolution-panel.tsx").replace("variant={isVoid ? TONE_CHIP[STATUS_TONE.VOID.player] : \"resolved\"}", "variant={isVoid ? \"pending\" : \"resolved\"}");
  ok("2.3′ PLANT · the round-6 royal void chips — /results' notable card, the market's resolution panel — are each reported",
    voidRoyal(plantFeatured).length === 1 && voidRoyal(plantPanel).length === 1, j({ f: voidRoyal(plantFeatured).length, p: voidRoyal(plantPanel).length }));
  ok("2.4 · the two hand-typed void chips read the dictionary now — /results' notable card and the market's resolution panel — and each states the seal's status metrics, so the slot's size does not follow its colour (chip.tsx, G1)",
    has("src/app/results/page.tsx", '<Chip variant={TONE_CHIP[STATUS_TONE.VOID.player]} size="sm" metrics="status">{t.common.voided}</Chip>')
      && has("src/components/markets/resolution-panel.tsx", '<Chip variant={isVoid ? TONE_CHIP[STATUS_TONE.VOID.player] : "resolved"} metrics="status">'));
  {
    // The home's settled rows: a VOID row's pill was the royal STATUS pill (23px, 11px type) beside its YES/NO siblings'
    // 21px base pills — its height followed its colour. As the slate chip it takes the base metrics with them.
    const { Chip } = req("../src/components/ui/chip.tsx") as { Chip: (p: Record<string, unknown>) => unknown };
    const minH = (variant: string) => Number(/min-height:(\d+)px/.exec(renderToStaticMarkup(h(Chip as never, { variant }, "x")))?.[1] ?? NaN);
    const now = { void: minH(ST.TONE_CHIP[ST.STATUS_TONE.VOID.player]), yes: minH("yes"), no: minH("no") };
    ok(`2.8 EXECUTED · the home's settled rows draw one pill size: VOID ${now.void}px, YES ${now.yes}px, NO ${now.no}px (the royal void pill was ${minH("pending")}px) — the row's chip states no metrics, so its size follows the row's base pill`,
      now.void === now.yes && now.yes === now.no && minH("pending") > now.void && has("src/components/home/trust-band.tsx", '<Chip variant={variant} className="kp-settled__pill">'), j(now));
  }
  ok("2.5 · /results' legend says \"Batili n\" in the void's word ink (`playerStatusInk`, the slate chip's own text) — the grid card's verdict word on the same page — and its arc keeps §B12's neutral chart ink",
    has("src/app/results/page.tsx", '<span className={`whitespace-nowrap ${playerStatusInk("VOID") ?? "text-text-muted"}`}>{t.market.statusVoid} {formatNumber(voidCount)}</span>')
      && has("src/app/results/page.tsx", '{ frac: voided / total, stroke: "var(--text-subtle)" }') && /\.mcardp-pct--void \{ color: var\(--text-muted\); \}/.test(CSS));
  const row = code("src/app/markets/[id]/page.tsx");
  ok("2.6 · the market page's own ticket rows word a state in the dictionary's ink — OPEN royal, a sale or a refund slate — the chip inks of the ticket card; WIN keeps gold, LOSS the betting rose",
    hasIn(row, 'p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : (playerStatusInk(p.status) ?? "text-text-muted")')
      && !/p\.status === "OPEN" \? "text-info-fg"/.test(row) && ST.playerStatusInk("OPEN") === "text-brand-300" && ST.playerStatusInk("CASHED_OUT") === "text-text-muted");
  ok("2.6′ PLANT · the round-6 row (OPEN in `--info-fg`, a refund in `--text-subtle`) is reported",
    !hasIn(row.replace('p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : (playerStatusInk(p.status) ?? "text-text-muted")', 'p.status === "OPEN" ? "text-info-fg" : p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : "text-text-subtle"'),
      'p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : (playerStatusInk(p.status) ?? "text-text-muted")'));
  // The dictionary's own readers (the ticket card, the classic position card, the board cards, the home's settled rows,
  // the Up & Down card, round page and history) draw the void through it — 2.1 covers what they paint.
  const READERS: Array<[string, string]> = [
    ["src/components/journey/tickets/ticket-card.tsx", "variant={positionStatusChip(p.status)}"],
    ["src/components/markets/position-card.tsx", "variant={positionStatusChip(status)}"],
    ["src/components/markets/market-card.tsx", "variant={TONE_CHIP[STATUS_TONE[statusWord].player]}"],
    ["src/components/home/trust-band.tsx", "TONE_CHIP[STATUS_TONE.VOID.player]"],
    ["src/components/updown/updown-card.tsx", "<Chip variant={TONE_CHIP[STATUS_TONE.VOID.player]}>{t.market.statusVoid}</Chip>"],
    ["src/app/updown/[roundId]/page.tsx", ": TONE_CHIP[STATUS_TONE.VOID.player];"],
    ["src/app/updown/history/page.tsx", "variant: TONE_CHIP[STATUS_TONE.VOID.player], label: t.market.udVoided"],
    ["src/app/fairness/page.tsx", ': "neutral"} size="md">'],
  ];
  const missing = READERS.filter(([f, s]) => !has(f, s));
  ok(`2.7 · the ${READERS.length} other surfaces that draw a void read the dictionary (or its slate, /fairness) — tickets, positions, board cards, the home's settled rows, Up & Down's card, round page and history`,
    missing.length === 0, j(missing));
}

/* ══ §3 · THE CREST'S IDS ARE ITS OWN ═══════════════════════════════════════════════════════════════════════════════ */
section("3 · R5-2 one crest at every width — no shared SVG id, so a hidden copy cannot blank a visible one");
{
  const { IdentityAvatar } = req("../src/components/ui/identity-avatar.tsx") as { IdentityAvatar: (p: Record<string, unknown>) => unknown };
  const KINDS = ["monogram", "tipping", "guilloche", "constellation"];
  /** Two crests of ONE player in one document — the header's (hidden below 1024 in the journey) and the podium's. */
  const pair = (kind: string, size: number) => renderToStaticMarkup(h(React.Fragment, null,
    h(IdentityAvatar as never, { seed: "usr_demo_7", initials: "DE", size, kind }),
    h(IdentityAvatar as never, { seed: "usr_demo_7", initials: "DE", size, kind })));
  const audit = (markup: string) => {
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    const svgs = markup.split("<svg").slice(1).map((s) => s.slice(0, s.indexOf("</svg>")));
    const stray = svgs.flatMap((s) => {
      const own = new Set([...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      return [...s.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]).filter((ref) => !own.has(ref));
    });
    return { ids: ids.length, dup, stray, svgs: svgs.length };
  };
  const results = KINDS.flatMap((k) => [56, 28].map((s) => ({ k, s, ...audit(pair(k, s)) })));
  ok("3.1 EXECUTED · two crests of the same player in one page: every id unique, every url(#…) resolved inside its own <svg> — four directions, at 56 and 28px",
    results.every((r) => r.svgs === 2 && r.ids >= 2 && r.dup.length === 0 && r.stray.length === 0), j(results.filter((r) => r.dup.length || r.stray.length)));
  const IA = code("src/components/ui/identity-avatar.tsx");
  ok("3.2 · IdentityAvatar takes ONE `useId` (both renderers have it) and every crest's id carries it beside the seed",
    (IA.match(/\buseId\(/g) ?? []).length === 1 && (IA.match(/const id = "c[tmgc]" \+ hashSeed\(seed\)\.toString\(36\) \+ uid;/g) ?? []).length === 4);
  const oldScheme = pair("monogram", 56).replace(/\b(id="cm[0-9a-z]+)_[^"]*"/g, "$1\"").replace(/url\(#(cm[0-9a-z]+)_[^)c]*(c?)\)/g, "url(#$1$2)");
  ok("3.1′ PLANT · the round-6 scheme (an id from the seed alone) is reported — the two crests share every id",
    audit(oldScheme).dup.length > 0, j(audit(oldScheme)));
  const JTB = code("src/components/journey/journey-top-bar.tsx");
  ok("3.3 · CONTROL · the case is real: below 1024 the journey header's own crest (AvatarMenu) is in a `hidden lg:inline-flex` box — the FIRST copy of the player's crest in the page, and display:none",
    /<span className="hidden lg:inline-flex">\s*<AvatarMenu/.test(JTB) && /seed: session\.userId/.test(code("src/components/layout/app-shell.tsx")));
  const flight = existsSync("node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js")
    ? raw("node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js") : "";
  ok("3.4 · CONTROL · the server-component renderer Next ships implements `useId` (the leaderboard draws its crests on the server)",
    /function useId\(\)/.test(flight) && /useId: useId/.test(flight));
}

/* ══ §4 · ONE FORMATTER FOR A RATE OF RETURN ════════════════════════════════════════════════════════════════════════ */
section("4 · R5-7 a rate of return has its sign everywhere — one formatter, the real minus, no \"−0.0%\"");
{
  const { formatReturnRate } = req("../src/lib/utils.ts") as { formatReturnRate: (n: number) => string };
  const cases: Array<[number, string]> = [[54.1, "+54.1%"], [-5.06, "−5.1%"], [0, "+0.0%"], [-0.04, "+0.0%"], [12.345, "+12.3%"], [-145.91, "−145.9%"], [Number.NaN, "—"]];
  const got = cases.map(([v]) => formatReturnRate(v));
  ok("4.1 EXECUTED · \"+54.1%\", \"−5.1%\" (U+2212, the platform's minus), \"+0.0%\" for anything that rounds to zero, \"—\" for no figure",
    cases.every(([, want], i) => got[i] === want), j(got));
  const LB = code("src/app/leaderboard/page.tsx");
  const PERF = code("src/app/positions/performance/page.tsx");
  const sites = [
    hasIn(LB, "{ label: t.leaderboard.bestRoi, value: formatReturnRate(rows[0]?.roi ?? 0) }"),
    (LB.match(/\{formatReturnRate\(r\.roi\)\}/g) ?? []).length === 2,
    hasIn(PERF, "<Stat size=\"2xl\" labelStyle=\"caps\" label={t.performance.roi} value={formatReturnRate(roi)} />"),
  ];
  const inline = PLAYER_TSX.filter((f) => /roi\.toFixed\(|roi >= 0 \? "\+"|\(roi\)\.toFixed/.test(code(f)));
  ok("4.2 · CENSUS · the ribbon, the table, the podium and the performance tile all print through it; no rate is formatted inline anywhere in player code",
    sites.every(Boolean) && inline.length === 0, j({ sites, inline }));
  ok("4.2′ PLANT · the round-6 ribbon (`${rows[0]?.roi.toFixed(1) ?? \"0\"}%` — no sign) is reported",
    /roi\.toFixed\(/.test(LB.replace("value: formatReturnRate(rows[0]?.roi ?? 0)", "value: `${rows[0]?.roi.toFixed(1) ?? \"0\"}%`")));
  const LBG = code("src/app/leaderboard/loading.tsx");
  ok("4.3 · the drawings hold a signed figure's width: the leaderboard's ribbon, table and podium \"+00.0%\", the performance tile \"+0.0%\"",
    hasIn(LBG, '[t.leaderboard.bestRoi, "+00.0%"]') && (LBG.match(/<GhostText>\+00\.0%<\/GhostText>/g) ?? []).length === 2
      && has("src/app/positions/performance/performance-ghost.tsx", "<GhostText>+0.0%</GhostText>"));
  ok("4.4 · CONTROL · the rate's ink is still the text's (R5-I 2.13's cells, owner item 51: not green/red, not gold)",
    hasIn(LB, '<td className="p-3 text-right font-mono tabular-nums font-bold text-text">') && hasIn(LB, '<span className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-text">'));
}

/* ══ §5 · ONE WAVE BACKDROP ══════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · R5-10 one wave backdrop — the error view fades its wave as the not-found view does (E46), and so does every frameless wave");
const rule = (sel: string) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\n|\\})\\s*${esc}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? "";
};
const px = (name: string) => Number(new RegExp(`--${name}:\\s*([\\d.]+)px`).exec(CSS)?.[1] ?? NaN);
{
  const RE = code("src/components/ui/route-error.tsx");
  const masked = (src: string, id: string, mod: string) =>
    new RegExp(`<div aria-hidden className="kp-nf-topo ${mod}">\\s*<div className="kp-nf-topo__x">\\s*<BrandTopo id="${id}" opacity=\\{0\\.09\\} />`).test(src);
  ok("5.1 · the error view nests its wave in the not-found view's two masks (top and bottom over 64px, the sides where the column leaves the screen)",
    masked(RE, "route-error-topo", "kp-nf-topo--receipt") && (RE.match(/<BrandTopo\b/g) ?? []).length === 1);
  ok("5.1′ PLANT · the round-6 error view (BrandTopo straight in the column — a hard-edged 560px box at 1280) is reported",
    !masked(`<div className="kp-shortpage …"><BrandTopo id="route-error-topo" opacity={0.09} />`, "route-error-topo", "kp-nf-topo--receipt"));
  const side = rule(".kp-nf-topo--receipt > .kp-nf-topo__x");
  const fadeAt = (vw: number, col: number) => Math.min(Math.max(0, (vw - col) * 1000), px("sp-16"));
  const col = Number(/max-w-\[(\d+)px\]/.exec(RE)?.[1] ?? NaN);
  ok(`5.2 · its sides fade from its OWN column (560px, \`--w-receipt\`): ${[360, 390, 560, 768, 1024, 1280].map((w) => `${w}→${fadeAt(w, px("w-receipt"))}`).join(" ")}`,
    /--kp-nf-side:\s*clamp\(0px, calc\(\(100vw - var\(--w-receipt\)\) \* 1000\), var\(--sp-16\)\);/.test(side) && col === px("w-receipt") && col === 560
      && fadeAt(390, col) === 0 && fadeAt(560, col) === 0 && fadeAt(768, col) === 64 && fadeAt(1280, col) === 64, side);
  ok("5.2′ CONTROL · the not-found rule is untouched (R4-K's pins): its sides key on its own 640px column",
    /--kp-nf-side:\s*clamp\(0px, calc\(\(100vw - var\(--w-form\)\) \* 1000\), var\(--sp-16\)\);/.test(rule(".kp-nf-topo__x")) && px("w-form") === 640);
  // Every frameless wave is masked; a wave inside a drawn frame (a panel's own background, a bordered card) ends where
  // the frame does and is left as drawn.
  const WAVES: Record<string, { masked?: string; framed?: string }> = {
    "src/components/ui/not-found-view.tsx": { masked: '<div aria-hidden className="kp-nf-topo"> <div className="kp-nf-topo__x"> <BrandTopo id="notfound-topo" opacity={0.09} />' },
    "src/components/ui/route-error.tsx": { masked: '<div aria-hidden className="kp-nf-topo kp-nf-topo--receipt"> <div className="kp-nf-topo__x"> <BrandTopo id="route-error-topo" opacity={0.09} />' },
    "src/components/auth/auth-shell.tsx": {
      masked: '<div aria-hidden className="kp-nf-topo kp-nf-topo--split"> <div className="kp-nf-topo__x"> <BrandTopo id="auth-form-topo" opacity={0.09} />',
      framed: "the rail's wave fills the rail's own panel (`--bg-overlay`)",
    },
    "src/app/live/page.tsx": { masked: '<div aria-hidden className="kp-nf-topo"> <BrandTopo opacity={0.09} />' },
    "src/app/profile/account/page.tsx": { framed: "inside the close-account card's danger border" },
  };
  const users = PLAYER_TSX.filter((f) => /<BrandTopo\b/.test(code(f)));
  const unreg = users.filter((f) => !(f in WAVES));
  const unmasked = Object.entries(WAVES).filter(([f, w]) => w.masked && !has(f, w.masked));
  ok(`5.3 · CENSUS · every wave in player code (${users.length} files) is registered — masked where frameless (not-found, error, the auth form's column, /live), drawn whole inside a frame (the auth rail, the close-account card)`,
    unreg.length === 0 && unmasked.length === 0 && users.length === Object.keys(WAVES).length, j({ unreg, unmasked }));
  ok("5.4 · the auth form's column fades its sides only from 1024, where it stops being the screen (one column below lg)",
    /--kp-nf-side:\s*0px;/.test(rule(".kp-nf-topo--split > .kp-nf-topo__x"))
      && /@media \(min-width: 1024px\) \{\s*\.kp-nf-topo--split > \.kp-nf-topo__x \{\s*--kp-nf-side:\s*var\(--sp-16\);\s*\}\s*\}/.test(CSS));
  ok("5.4′ PLANT · an unmasked auth form wave is reported", !hasIn('<div className="relative flex items-center justify-center px-3 py-8"> <BrandTopo id="auth-form-topo" opacity={0.09} />', WAVES["src/components/auth/auth-shell.tsx"].masked ?? ""));
}

/* ══ §6 · CONTRAST ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · contrast — every ink pair this round moves, on its worst surface (≥4.5:1 text)");
{
  type RGB = [number, number, number];
  const lin2srgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const oklch = (L: number, C: number, H: number): RGB => {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [r, g, bl].map((c) => Math.min(1, Math.max(0, lin2srgb(c)))) as RGB;
  };
  const token = (name: string): RGB => {
    const v = new RegExp(`--${name}:\\s*([^;]+);`).exec(CSS)?.[1]?.trim() ?? "";
    const via = /^var\(--([\w-]+)\)$/.exec(v);
    if (via) return token(via[1]);
    const m = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(v);
    if (!m) throw new Error(`token --${name} unreadable: ${v}`);
    return oklch(Number(m[1]) / 100, Number(m[2]), Number(m[3]));
  };
  const lit = (L: number, C: number, H: number) => oklch(L / 100, C, H);
  const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
  const lum = (c: RGB) => { const f = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The page hero's lightest point: --hero-panel-grad's light stop under a full 18% glow (the eyebrow sits at the dark
  // top-left, so this over-states the light).
  const HERO_WORST = over(lit(52, 0.10, 195), 0.18, lit(30, 0.165, 268));
  const CARD = lit(24, 0.145, 268);
  const pearl = token("pearl-50");
  // The monogram crest's gradient under its initials, over the crest's whole hue range (268 ± 22): sRGB interpolation
  // between its stops at the glyphs' nearest point to the gradient's centre (t = 0.22).
  const crestWorst = Math.min(...Array.from({ length: 23 }, (_, k) => 246 + k * 2).map((hue) => {
    const s0 = lit(40, 0.165, hue), s1 = lit(18, 0.13, hue);
    return ratio(pearl, s0.map((c, i) => c + (s1[i] - c) * 0.22) as RGB);
  }));
  const PAIRS: Array<[string, number, number]> = [
    ["the page-head eyebrow: subtle on the hero's lightest point (aqua or info glow, full)", ratio(token("text-subtle"), HERO_WORST), 4.5],
    ["the page-head eyebrow: subtle on the auth panel / a glass panel (`--bg-elevated`)", ratio(token("text-subtle"), token("bg-elevated")), 4.5],
    ["the void chip: slate ink on its slate fill over a card", ratio(token("text-muted"), over(lit(34, 0.09, 268), 0.5, CARD)), 4.5],
    ["/results' legend \"Batili n\": the void's word ink on the page", ratio(token("text-muted"), token("bg")), 4.5],
    ["the market's ticket row: OPEN's royal word on the row (overlay/40 over a card)", ratio(token("brand-300"), over(token("bg-overlay"), 0.4, CARD)), 4.5],
    ["the market's ticket row: a refund's slate word on the row", ratio(token("text-muted"), over(token("bg-overlay"), 0.4, CARD)), 4.5],
    ["the podium crest's initials on its own gradient (every hue the crest takes)", crestWorst, 4.5],
  ];
  for (const [what, r, min] of PAIRS) ok(`6 · ${what} — ${r.toFixed(2)}:1 (≥ ${min})`, r >= min);
  const before = ratio(pearl, token("metal-gold"));
  ok(`6′ CONTROL · the round-6 coin — white initials on the bare metal (the ring seen through a blank disc) — ${before.toFixed(2)}:1, the 2.05 the reader measured`,
    before < 2.2 && before > 1.9);
}

/* ══ §7 · NO DICTIONARY WORD CHANGED ═════════════════════════════════════════════════════════════════════════════════ */
section("7 · composition only: the dictionary is the tip's, byte for byte");
{
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r\n/g, "\n"); } catch { head = "‹git unavailable›"; }
  ok("7.1 · src/lib/i18n-dict.ts is the commit's own (every word above is an existing key)", head === raw("src/lib/i18n-dict.ts"));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("\nFAILURES:");
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
