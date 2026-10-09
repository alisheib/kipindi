/**
 * ROUND 5 OF THE VISUAL PASS, HELPER C (2026-10-09) — THE SECOND GOLD AUDIT. Every gold paint in the player's code was
 * found, ruled in DESIGN_AUTHORITY's own words — allowed (money earned, a money commit, the live balance, a deposit
 * door, the resolved seal, the brand mark's needle, a chart's reference line, an illustration's single accent, identity
 * METAL) or a defect — and every defect in a shared page body or the journey was fixed. Classic chrome (frozen) and the
 * `--warning-fg: var(--gilt)` token are the owner's, and are pinned here as they stand so a change to them is deliberate.
 *
 *   npx tsx scripts/visual-pass-r5c.test.mts        (npm run test:visual-pass-r5c)
 *
 * The owner's rule (Ali, 2026-10-09): consistency and perfection in each move. ONE rule, the same way everywhere:
 *   · MONEY EARNED (a payout, a celebration, the resolved seal, a WIN, a granted bonus, earned commission > 0) is gold;
 *     so are the money COMMITS that keep it (bet, sell — §M3a D1), the LIVE balance (§8a) and the deposit DOOR (§M3a).
 *   · A HIGHLIGHT that is not money — "this one", the current step, progress, a selection, an accent — is the BRAND
 *     family, the product's one non-money accent: `--brand-300` ink, `--brand-400` marks (the rail's unread dot, every
 *     pip), `--brand-500` rings and fills (the focus ring, the selected pill's halo `--glow-selected`, §E4's glows).
 *   · IDENTITY (a tier, a rank, a streak, an achievement, an asset) may be METALLIC — `--metal-gold` — never the money
 *     ink (Q5).
 *   · A WORD takes its §B11 tone: waiting royal, approved/completed success, terminal slate, failed danger, and amber
 *     ONLY where somebody must act (its paint, the `--warning-*` family, is struck in gilt until the owner re-hues it, F3).
 *
 *   §1  THE GOLD CENSUS — every gold paint in the player's code, counted per file, each file registered with its ruling;
 *       a new gold use anywhere fails until it is ruled and registered (with plants proving the scanner sees each form)
 *   §2  the items the readers raised (tiles r5-4, r5-6) and the RG page's last warning box
 *   §3  the one non-money accent — the brand family, everywhere a highlight was gold (or aqua)
 *   §4  money that was not EARNED is not gold (D1 commits, D5 inducements, §B12 projections, zero)
 *   §5  the warning family keeps its one meaning (F3 toasts, §B11 words, RG notices, clocks, one limit ramp)
 *   §6  the sanctioned gold that must STAY — the controls that keep §1 from passing because gold was deleted
 *   §7  the owner's items, pinned as they stand (classic chrome, the token, the hashed legal links)
 * The mutation proof (each defect planted on disk, the suite failing on its check, the file restored byte-identical) is
 * the scratchpad's `r5c/mutate.cjs`; its result is in R5-C's report.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement as h, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { Callout } from "../src/components/ui/callout.tsx";
import { Dot } from "../src/components/ui/dot.tsx";
import { PageHeader } from "../src/components/ui/page-header.tsx";
import { VerifiedAgentBadge } from "../src/components/agent/verified-agent-badge.tsx";
import { RewardBurst } from "../src/components/brand/reward-burst.tsx";
import { CountdownRing } from "../src/components/positions/countdown-ring.tsx";
import { LimitUsageMeter, limitUsageFill } from "../src/components/rg/limit-usage.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const note = (s: string) => console.log(`       ${s}`);
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
const CSS = decommentCss(raw("src/app/globals.css"));
const MOTION = decommentCss(raw("src/app/motion.css"));
const html = (node: ReactNode) => renderToStaticMarkup(h(Fragment, null, node));
/** The body of the CSS rule whose selector is EXACTLY `sel`. */
const rule = (css: string, sel: string): string => {
  const m = new RegExp(`(?:^|\\n|\\})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`).exec(css);
  if (!m) return "";
  const open = m.index + m[0].length;
  return css.slice(open, css.indexOf("}", open));
};

/* ══ §1 · THE GOLD CENSUS ═════════════════════════════════════════════════════════════════════════════════════════════ */
/**
 * What counts as GOLD PAINT, read comment-stripped:
 *   var    a CSS variable of the gold ramp or its aliases, the gilt material, the identity metal, the TippingBar needle,
 *          and the WARNING family — `--warning-fg`, which IS `--gilt` (F3), and since round 6 (2026-10-09, review C3) its
 *          other spellings `--warning`, `--warning-500` (oklch 78% 0.13 86: gold by this census's own hue rule),
 *          `--warning-bg` and `--warning-border` (its 18% and 36% washes), which it did not count: 61 paints in 23 files
 *   tw     a Tailwind colour utility on the gold / gilt families, or on the warning family (`warning`, `-fg`, `-500`, `-bg`,
 *          `-border`)
 *   cls    the gold material classes (`gilt-metal`, `gilt-ink`, `btn-gold`, `mat-tint-gilt`, `chip-resolved`)
 *   name   a tone or variant asked for by NAME: "gold" (any .ts/.tsx), "warning" (.tsx — where it picks a painted tone)
 *   comp   a component that draws gold inside it (`<GiltCorner`, `<RewardBurst` — gold unless it is told otherwise)
 *   seal   the resolved seal (`<Chip variant="resolved"`), `struck=` (gilt type), a bare `gilt` class
 *   oklch / hex   a hand-typed colour at hue 70–100 with chroma ≥ 0.04 — gold by any other spelling
 * Scope: the player's code. Out of it, ruled once in R5-C's report: the admin console (src/app/admin,
 * src/components/admin — out of the visual pass by standing ruling), server-rendered artefacts (src/app/api — the OG
 * share images draw the brand mark; src/lib/server — e-mail, the regulator's reports, the house console's reads) and
 * the campaign tooling (src/lib/marketing — admin).
 */
const ROOT = process.cwd().replace(/\\/g, "/");
const OUT_OF_SCOPE = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const toOklch = (r8: number, g8: number, b8: number) => {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
};
const goldHue = (C: number, H: number) => C >= 0.04 && H >= 70 && H < 100;
type Hit = { kind: string; match: string; line: number };
/** Every gold paint in one file's source (raw text in; comments are stripped here). */
function goldHits(file: string, src: string): Hit[] {
  const text = src.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(text) : decomment(text);
  const out: Hit[] = [];
  code.split("\n").forEach((ln, i) => {
    const push = (kind: string, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => {
      for (const m of ln.matchAll(re)) if (keep(m)) out.push({ kind, match: m[0], line: i + 1 });
    };
    push("var", /var\(\s*--(?:gilt[\w-]*|gold(?:-[\w-]+)?|metal-gold|border-gold|glow-gold|glow-jackpot|g-gold|g-jackpot|bet-jackpot|bet-streak|bar-needle(?:-glow)?|warning(?:-fg|-500|-bg|-border)?)\s*[,)]/g);
    push("tw", /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:(?:gold|gilt)(?:-[a-z0-9]+)?|warning(?:-fg|-500|-bg|-border)?)(?:\/[\w.[\]]+)?(?![\w-])/g);
    push("cls", /(?<![\w-])(?:gilt-metal|gilt-ink|btn-gold|mat-tint-gilt|chip-resolved)(?![\w-])/g);
    if (file.endsWith(".tsx")) push("name", /["'`](?:gold|warning)["'`]/g);
    else if (file.endsWith(".ts")) push("name", /["'`]gold["'`]/g);
    if (file.endsWith(".tsx")) {
      push("comp", /<(?:GiltCorner|RewardBurst)\b/g);
      push("seal", /<Chip\b[^>]*\bvariant=(?:"resolved"|\{[^}]*"resolved"[^}]*\})/g);
      push("struck", /\bstruck=\{/g);
      push("gilt-class", /className=(?:"|\{`|\{")[^"`]*(?<![\w-])gilt(?![\w-])/g);
    }
    push("oklch", /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/g, (m) => goldHue(Number(m[2]), Number(m[3])));
    push("hex", /#([0-9a-fA-F]{6})\b/g, (m) => {
      const x = m[1]; const o = toOklch(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16));
      return goldHue(o.C, o.H);
    });
  });
  return out;
}

/**
 * ⭐ THE REGISTRY — every file that paints gold, its count and its RULING. This is the audit's table in machine form:
 * a count that rises fails (a new gold use must be ruled, then registered here with its reason); a count that falls
 * passes and asks to be locked in (a ratchet above the tree is slack, not safety — `type-scale`'s own rule).
 * "OWNER" = frozen classic chrome, the `--warning-fg: var(--gilt)` token, or a hashed legal text: the change is
 * written in R5-C's report for Ali. "the token's" = a legitimate warning (§B11: somebody must act) whose amber is the
 * `--warning-*` family, struck in gilt until the owner re-hues it (F3).
 */
const REGISTRY: Record<string, [number, string]> = {
  // ── allowed: money earned, money commits, the live balance, the deposit doors ───────────────────────────────────────
  "src/app/auth/register/page.tsx": [2, "the two sign-up bonus figures (money; R4-I §14.3)"],
  "src/app/markets/[id]/page.tsx": [8, "a settled WIN's status word and payout (§M3) · the resolved seal (§B11) · the hedge caution's box and words, the token's ×5"],
  "src/app/positions/performance/page.tsx": [15, "a positive net and row (money earned) · the best-win crest, only with a win · the streak in identity metal"],
  "src/app/profile/invite/agent-dashboard.tsx": [4, "commission EARNED, gold only when > 0 (§M3)"],
  "src/app/profile/invite/page.tsx": [12, "the earnings dial, its wash and the Earned figure, gold only once money was earned; per-friend earnings > 0"],
  "src/app/proposals/[id]/page.tsx": [4, "the approval-bonus crest: money earned (§M3 celebration; its eyebrow is CELEBRATION in eyebrow-roles)"],
  "src/app/proposals/page.tsx": [1, "a proposer's granted bonus (money earned)"],
  "src/app/results/page.tsx": [1, "the notable result's resolved seal (§M3 · §B11 RESOLVED = struck gilt)"],
  "src/app/updown/[roundId]/page.tsx": [1, "a won round's struck payout (§M3)"],
  // R5-I (2026-10-09): a positive net on /updown/history read the YES side's green; it reads as every net now (§B2a).
  "src/app/updown/history/page.tsx": [2, "a positive settled net (money earned), the page strip's and a round group's — as /positions/performance"],
  // R5-I (2026-10-09): −1 — the dormant grant's chip left the warning pill for the kit Chip in its §B11 tone (I-3).
  "src/app/wallet/wallet-client.tsx": [4, "the live balance card's warm edge (money, §8a) ×2 · the zero-balance Add funds DOOR (§M3a) ×2"],
  "src/components/brand/reward-burst.tsx": [7, "the gold medallion for money earned (the proposal bonus) — `success` for an approval"],
  "src/components/journey/journey-top-bar.tsx": [1, "the journey's deposit pill — the deposit door (gilt-metal, §M3a)"],
  "src/components/journey/tickets/ticket-card.tsx": [2, "a won ticket's struck payout (§M3)"],
  "src/components/layout/wallet-balance-pill.tsx": [9, "the capsule: the live balance (§8a, 'gold on a live balance only')"],
  "src/components/layout/wallet-sheet.tsx": [1, "the Wallet's deposit door (gilt-metal)"],
  "src/components/markets/bet-confirm-modal.tsx": [1, "the bet commit (D1: bet keeps gold)"],
  "src/components/markets/position-card.tsx": [2, "a settled WIN's struck payout (§M3)"],
  "src/components/markets/position-share.tsx": [4, "sharing a WIN — the celebration's own moment (§M3)"],
  "src/components/markets/resolution-panel.tsx": [9, "the resolved seal and the winning pool's row (§M3, §B11) · the dispute and fee-cap cautions, the token's"],
  "src/components/markets/sell-confirm-modal.tsx": [3, "the sell commit (D1: sell keeps gold) · two exit cautions, the token's"],
  "src/components/markets/win-celebration.tsx": [5, "the celebration (§M3)"],
  "src/components/positions/pnl-summary-strip.tsx": [4, "a positive settled net (money earned) · the NeedleDial — the brand needle (§B1a)"],
  "src/components/updown/round-stake-panel.tsx": [1, "the Up & Down bet commit (D1)"],
  "src/lib/notification-appearance.ts": [3, "WIN — 'the only money outcome that is gold'"],
  "src/lib/status-tone.ts": [3, "the dictionary's struck gilt: RESOLVED, WIN (§B11)"],
  "src/components/home/landing-hero.tsx": [2, "the pool and paid-out totals — money (Q5); OWNER question: D5's 'inducement' clause on a landing figure"],
  // ── allowed: the brand mark, chart reference lines, illustration accents, identity metal ───────────────────────────
  "src/app/global-error.tsx": [1, "the mark's needle (§B1a) — nothing else on the page is gold"],
  "src/components/brand.tsx": [2, "GiltCorner's default ink (the best-win crest only) · the TippingBar needle (§B1a)"],
  "src/components/layout/needle.css": [10, "the Needle — the mark's own instrument (§B1a, §M8)"],
  "src/lib/brand-mark.ts": [1, "the mark's gold #E3BC66 (§B1a)"],
  "src/components/charts/pnl-chart.tsx": [4, "the break-even reference line (§B12: gilt marks the line a chart is READ AGAINST)"],
  "src/components/updown/price-hero.tsx": [2, "the open-price reference line (§B12)"],
  "src/components/ui/empty-state.tsx": [1, "the illustrations' single gold accent (§C7)"],
  "src/app/leaderboard/page.tsx": [9, "rank and standing in the tier ladder's METAL (Q5) · the tier names"],
  "src/components/badges/icons.tsx": [1, "the achievement coins' METAL (Q5)"],
  "src/components/ui/identity-avatar.tsx": [17, "the heraldic crest's own raw metal and TIER_RING (Q5's letter: no money token)"],
  "src/components/ui/avatar.tsx": [1, "the tier name (identity)"],
  "src/components/updown/asset-mark.tsx": [1, "the gold ASSET's name, XAU (Q5: an asset may be metallic)"],
  // ── the kit's definitions of the gold material and its variants ───────────────────────────────────────────────────
  "src/app/globals.css": [97, "the ramp, its aliases and `--warning-*`; `--metal-gold` and the tier/badge metal; `.btn-gold`; the seal; the needle, shimmer and sweep (§B1a); the capsule and Wallet-sheet amounts (§8a); paid money (`.kp-settled__amt`, `.kp-mine__n--gold`); `count-up-flash` (celebration); OWNER: the classic rail dot and coin, `.claret-rule`'s gilt midpoint, the classic chrome's 'coming soon' tag tint (`.cs-badge` outside page bodies and the journey); dead: `.bg-damask`; admin: `poll-flash`"],
  "src/app/motion.css": [23, "the gilt material — gilt-metal on deposit doors and the celebration, gilt-ink on earned figures, the win toast's tint; the warning toast's tint (`.mat-tint-warn`, the token's); dead: `.m-skeleton`"],
  "src/app/state-tokens.css": [2, "`.countdown--urgent` — dead CSS (no consumer)"],
  "src/components/ui/button.tsx": [2, "the `gold` variant — bet and sell commits"],
  "src/components/ui/chip.tsx": [15, "the resolved seal; the console's gold/objection chip; the amber `paused`/`warning` paints (the token's family)"],
  "src/components/ui/dot.tsx": [4, "the `gold` and `warning` tones (the classic bell's dot)"],
  "src/components/ui/stat.tsx": [3, "the `gold` tone and `struck` — money"],
  "src/components/ui/toast.tsx": [11, "the gold toast (a win) · the warning toast, struck in gold — F3: never a refusal's"],
  "src/components/markets/operation-result-modal.tsx": [9, "the `warning` result (retryable refusals, the token's) · the opt-in gold strip for earned money (no caller)"],
  "src/components/ui/callout.tsx": [18, "the warning and maintenance tones — the warning family, the token's"],
  "src/components/ui/notice-bar.tsx": [8, "the warning tone — the warning family, the token's"],
  "src/components/ui/receipt-row.tsx": [3, "the fee row's amber (a deduction) — the token's"],
  "src/components/ui/modal.tsx": [1, "the tone union (a caution confirm)"],
  "src/components/ui/confirm-dialog.tsx": [1, "the tone union"],
  "src/components/layout/announcement-banner.tsx": [1, "the tone union (a maintenance announcement)"],
  "src/components/markets/circular-progress.tsx": [2, "the tone union (admin-only consumer)"],
  "src/components/updown/updown-bet-blocked-modal.tsx": [1, "the refusal variant union"],
  "src/styles/chat/chat-tokens.css": [3, "gilt-edge tokens defined and never consumed — no render"],
  // ── the warning family where somebody must act (§B11) — the paint is the owner's token (F3) ─────────────────────────
  "src/app/agent/apply/apply-client.tsx": [7, "an officer's request · a rejected document to replace — the applicant acts (round 6, C3: the rejected slot's frame, wash, glyph disc and word)"],
  "src/app/agent/invite/[token]/invite-client.tsx": [2, "the invite is for another address · a fixable refusal"],
  "src/app/agent/page.tsx": [2, "'an officer has asked for one more thing' — the applicant acts (every other notice is neutral)"],
  "src/app/auth/login/page.tsx": [8, "sign-in refusals the player clears — wait, sign in again, use the password, create the account, ask us about a closed one (F3 severity warning) · their box's frame and wash; the break's panel is neutral since round 6 (C4)"],
  "src/app/auth/register/register-form.tsx": [5, "sign-up refusals the player can fix"],
  "src/app/profile/kyc/page.tsx": [8, "'more information needed' — ADDITIONAL_INFO_REQUIRED, player amber (§B11)"],
  "src/app/profile/page.tsx": [5, "the KYC 'more info' pill (§B11 player amber)"],
  "src/app/profile/security/security-client.tsx": [4, "backup codes: two or fewer left; save them now"],
  "src/app/profile/source-of-funds/page.tsx": [3, "the declaration's legal-attestation caution"],
  "src/app/s/optout-refusal.tsx": [1, "a 'busy, try again' refusal"],
  "src/app/wallet/withdraw/page.tsx": [2, "the hold line and the tax notice — cautions on the player's money"],
  "src/app/wallet/withdraw/withdraw-confirm.tsx": [1, "the fee row's amber (a deduction)"],
  "src/components/kyc/kyc-gate-panel.tsx": [6, "'your move' and a held wallet — somebody must act"],
  "src/components/layout/app-shell.tsx": [2, "the session-ended notice and its Sign in — the player must sign in again (OWNER: the token)"],
  "src/components/markets/comments-thread.tsx": [2, "the character counter's last 40 · the report link's hover — cautions"],
  // R5-I (2026-10-09): conviction-dial.tsx left this table — its four `warning` refusal arms (a toast struck in gold, F3)
  // are ranked by the failure registry now (`refusalVariant`: a slip the player can fix `factual`, a fault `danger`).
  "src/components/markets/house-lean-warning.tsx": [1, "'the upside is thin' — the Callout's own documented warning"],
  "src/components/markets/objection-dialog.tsx": [5, "the dispute route's caution"],
  "src/components/ui/offline-banner.tsx": [1, "the offline notice (R5-D's area)"],
  "src/components/ui/password-input.tsx": [5, "'OK, could be stronger' — a caution (moved off the gold ramp)"],
  "src/components/ui/unsaved-changes.tsx": [2, "unsaved changes — act"],
  "src/components/wallet/payout-status-notice.tsx": [1, "payouts delayed — the maintenance amber ('back shortly')"],
  "src/lib/score-band.ts": [3, "a middling score's caution"],
  // Round 6 (2026-10-09, review C3): the files the census saw only once it counted the warning family's every spelling.
  "src/app/auth/forgot-password/page.tsx": [2, "the rate-limit box's frame and wash — a refusal the player clears by waiting, as sign-in's (its words the muted ink since R4-I) (round 6, C3)"],
  "src/app/profile/account/privacy-request-form.tsx": [2, "the erasure request's caution — what an irreversible erasure keeps by law, read before sending (as the declaration's attestation caution) (round 6, C3)"],
  "src/components/rg/limit-usage.tsx": [1, "THE one limit ramp's caution step, 75–90% of a limit the player set (R5-C, the ramp's own note) — never gilt type, the owner's token (round 6, C3)"],
  "src/components/ui/maintenance-badge.tsx": [1, "the maintenance flag's 'back shortly' amber, the Callout's maintenance tone (round 6, C3)"],
  // ── OWNER: classic chrome (frozen for S6/S7) and the hashed legal texts ───────────────────────────────────────────
  "src/components/layout/avatar-menu.tsx": [10, "OWNER — the classic menu's staff row and 'earn' rows (the journey's are brand)"],
  "src/components/layout/live-ticker.tsx": [1, "OWNER — the ticker's separator dot"],
  "src/components/layout/notifications-panel.tsx": [3, "OWNER — the classic bell's unread wash and dot (the journey passes `journey`: brand) · the empty bell's single accent (§C7)"],
  "src/components/layout/top-app-bar.tsx": [2, "the classic deposit pill (a door, §M3a) · OWNER — the '• Juu na Chini' dot"],
  "src/components/ui/language-menu.tsx": [1, "OWNER — the classic header's current-language tick (the journey's is brand)"],
  "src/app/legal/_components.tsx": [2, "the regulator-letter frame's corners — CLARET ink (§B4), the GiltCorner component counted"],
  "src/app/legal/responsible-gambling/page.tsx": [6, "OWNER — the RG links' gold: the binding English is hashed (RG_EN_SHA), so the recolour ships with the next policy version"],
  "src/app/legal/terms/page.tsx": [12, "OWNER — the RG links' gold: `content()` is hashed (TERMS_TEXT_SHA), so the recolour ships with the next Terms version"],
  "src/lib/offline-document.ts": [3, "the offline page's tokens and its copy of the footer's claret rule (R5-D's area; follows `.claret-rule`, OWNER)"],
};

section("1 · the gold census — every gold paint in the player's code is ruled and registered");
const census = new Map<string, Hit[]>();
{
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts|css)$/.test(n) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
  });
  for (const f of walk(join(ROOT, "src"))) {
    if (OUT_OF_SCOPE.test(f)) continue;
    const hits = goldHits(f, readFileSync(join(ROOT, f), "utf8"));
    if (hits.length) census.set(f, hits);
  }
  // ⭐ CONTROLS FIRST: the scanner must SEE gold where it is, or every absence below passes over nothing.
  ok("1.0 · CONTROL · the scanner reads the celebration's struck gold, the bet commit's gold, the capsule's gold and the mark's",
    (census.get("src/components/markets/win-celebration.tsx")?.length ?? 0) >= 4 && (census.get("src/components/markets/bet-confirm-modal.tsx")?.length ?? 0) >= 1
      && (census.get("src/components/layout/wallet-balance-pill.tsx")?.length ?? 0) >= 5 && (census.get("src/lib/brand-mark.ts")?.length ?? 0) === 1);
  const unregistered = [...census.keys()].filter((f) => !(f in REGISTRY));
  ok("1.1 · no file paints gold unruled — every one is in the registry with its ruling", unregistered.length === 0,
    unregistered.map((f) => `${f}: ${census.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`).join(" | "));
  const rose: string[] = [];
  const fell: string[] = [];
  for (const [f, [n]] of Object.entries(REGISTRY)) {
    const got = census.get(f)?.length ?? 0;
    if (got > n) rose.push(`${f}: ${got} > ${n} — ${census.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`);
    else if (got < n) fell.push(`${f}: ${got} < ${n}`);
  }
  ok("1.2 · no registered file gained a gold use (a new one must be RULED, then registered with its reason)", rose.length === 0, rose.join(" | "));
  if (fell.length) note(`✓ fewer than the registry — lock it in: ${fell.join(" · ")}`);
  ok("1.3 · the registry's every entry carries its ruling", Object.values(REGISTRY).every(([n, why]) => n > 0 && why.length > 12));

  // ⭐ PLANTS — each spelling of gold the census promises to see, planted in memory, is seen; decoys are not.
  const n = (f: string, s: string) => goldHits(f, s).length;
  ok("1.4′ PLANT · a Tailwind gold ink on a non-money file is seen", n("x.tsx", '<span className="font-mono text-gold-300">3</span>') === 1);
  ok("1.4″ PLANT · a gold tone asked for by name is seen (`<Dot tone=\"gold\" />`, `tone={x ? \"gold\" : \"brand\"}`)",
    n("x.tsx", '<Dot tone="gold" /><Chip tone={x ? "gold" : "brand"} />') === 2);
  ok("1.4‴ PLANT · the money aliases and the gilt material are seen (`var(--gilt)`, `var(--glow-gold)`, `gilt-metal`, `btn-gold`)",
    n("x.css", ".a { color: var(--gilt); box-shadow: var(--glow-gold); }\n.b { } .gilt-metal .btn-gold") === 4);
  ok("1.4⁗ PLANT · `--warning-fg` (= `--gilt`, F3) and `text-warning-fg` are seen", n("x.tsx", '<p className="text-warning-fg" style={{ color: "var(--warning-fg)" }} />') === 2);
  // Round 6 (2026-10-09, review C3): the family's other spellings — the paints the census did not count (61 in 23 files).
  ok("1.4⁵ PLANT · the warning family's other spellings are seen — `var(--warning)`, `var(--warning-500)`, `var(--warning-bg)`, `border-warning-border`, `bg-warning-bg/15`, `hover:bg-warning-border`, `text-warning`, `bg-warning/15`",
    n("x.tsx", '<i style={{ color: "var(--warning)", fill: "var(--warning-500)", background: "var(--warning-bg)" }} className="border-warning-border bg-warning-bg/15 hover:bg-warning-border text-warning bg-warning/15" />') === 8);
  ok("1.4⁵′ CONTROL · …and names that only contain the word are not paints: `warningCount`, `text-warning-subtle`, `data-warning`, `--warning-hint`",
    n("x.ts", 'const warningCount = 1; const c = "text-warning-subtle"; const d = "data-warning"; const e = "var(--warning-hint)";') === 0);
  ok("1.5′ PLANT · gold by another spelling is seen — a hand-typed oklch at hue 84 and the trademark hex",
    n("x.tsx", 'const g = "oklch(80% 0.12 84)"; const h = "#E3BC66";') === 2);
  ok("1.5″ PLANT · a gold component drawn at its call site is seen (`<GiltCorner`, a `<RewardBurst` that defaults to gold, the resolved seal, struck type)",
    n("x.tsx", '<GiltCorner size={4} /><RewardBurst caption="x" /><Chip variant="resolved">x</Chip><Stat struck={w} />') === 4);
  ok("1.6 · CONTROL · decoys are NOT gold: a comment naming `text-gold-300`, a near-neutral warm white, a blue hex, `goldfish`",
    n("x.tsx", '// text-gold-300 var(--gilt)\n/* btn-gold */\nconst a = "oklch(99% 0.02 95)"; const b = "#3366ff"; const goldfish = 1;') === 0);
}

/* ══ §2 · THE ITEMS THE READERS RAISED ════════════════════════════════════════════════════════════════════════════════ */
section("2 · the items — notifications, the agent page, proposals, /results, fairness, badges, KYC, the bar, the art, WIN, RG");
{
  // 2.1 · the notifications page's unread dot was --gold-500 (198,158,72) while the rail's is the brand Dot.
  const BULK = read("src/app/notifications/bulk-bar.tsx");
  const TABS = read("src/components/journey/journey-tabs.tsx");
  ok("2.1 · the notifications page's unread dot is the rail's own: `Dot tone=\"brand\"` in both (§8b), never gold",
    /<Dot tone="brand" \/>/.test(BULK) && /<Dot tone="brand" size=\{8\} className="kp-rail__badge" \/>/.test(TABS) && !/tone="gold"/.test(BULK));
  ok("2.1′ EXECUTED · the brand Dot paints `--brand-400` (108,162,255 — the periwinkle the rail shows)", /background:var\(--brand-400\)/.test(html(h(Dot, { tone: "brand" }))));

  // 2.2 · the agent page: the fee is paid, the rate a promise, the step-5 numeral a step; three stats, one treatment.
  const AGENT = read("src/app/agent/page.tsx");
  const facts = AGENT.slice(AGENT.indexOf('<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">'), AGENT.indexOf("</div>", AGENT.indexOf('<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">')));
  const stats = facts.match(/<Stat [^\n]*/g) ?? [];
  ok("2.2 · the three facts are ONE treatment — `size=\"xl\" boxed=\"glass\" labelStyle=\"strong\" font=\"mono\"`, no tone (was gold sentence · gold amount · white display)",
    stats.length === 3 && stats.every((s) => /size="xl" boxed="glass" labelStyle="strong" font="mono" className="p-4"/.test(s) && !/tone=/.test(s)), stats.join(" ‖ "));
  ok("2.2′ · the fee box, the fee figure, the step numerals and every notice but 'one more thing' carry no gold and no warning",
    !/gold/.test(AGENT) && (AGENT.match(/tone: "warning"/g) ?? []).length === 1 && /view\.state === "info_required"\) \{ cta = \{ kind: "continue" \}; notice = \{ tone: "warning"/.test(AGENT)
      && /<section className="rounded-xl glass-panel p-4">/.test(AGENT));
  ok("2.2″ · the fee where it is PAID (/agent/apply) and REFUNDED (/agent/status) is not gold either (§M3a D1; §C4 refunded is NEUTRAL)",
    !/gold/.test(read("src/app/agent/apply/apply-client.tsx")) && !/gold/.test(read("src/app/agent/status/page.tsx")));

  // 2.3 · proposals: the eyebrow, the trophy riding in it, and the "coming soon" clock box.
  const PH = read("src/components/ui/page-header.tsx");
  const HERO = read("src/components/ui/page-hero.tsx");
  ok("2.3 · the page eyebrow and hero have no gold to ask for (out of their maps, as AuthHeader's gold went in R4-I)",
    !/gold/.test(PH) && !/gold/.test(HERO));
  ok("2.3′ EXECUTED · the default eyebrow is the subtle ink every player eyebrow wears", /text-text-subtle/.test(html(h(PageHeader, { eyebrow: "MAPENDEKEZO", title: "x" }))));
  const PROPS = read("src/app/proposals/page.tsx");
  ok("2.3″ · /proposals and /proposals/new: no gold hero, eyebrow or Create; 'coming soon' is the royal box (waiting, §B11)",
    !/glow="gold"|tone="gold"|variant="gold"/.test(PROPS + read("src/app/proposals/new/page.tsx"))
      && /tone=\{comingSoon \? "info" : "maintenance"\}/.test(read("src/components/proposals/proposals-state-views.tsx"))
      && /tone = "info"/.test(read("src/components/ui/coming-soon-banner.tsx")));

  // 2.4 · /results: the notable card's crown and label, the page glyph — and the resolved pill, which stays.
  const RES = read("src/app/results/page.tsx");
  const featured = RES.slice(RES.indexOf("function FeaturedResult"), RES.indexOf("function ", RES.indexOf("function FeaturedResult") + 20));
  ok("2.4 · the notable card is the product's featured card (royal edge and wash), its crown and label the brand ink",
    /borderColor: "var\(--border-royal\)"/.test(featured) && /text-brand-300">\s*<I\.crown s=\{13\} \/> <span className="kp-track-end kp-track-end--16">\{t\.results\.notableResult\}<\/span>/.test(featured) /* the label in R5-A's tracked span (F19), merged 2026-10-09 */ && !/gold/.test(featured));
  ok("2.4′ · the page's glyph rides in its eyebrow's ink", /<span className="text-text-subtle"><I\.resolved s=\{18\} \/><\/span>/.test(RES));
  ok("2.4″ · CONTROL · the resolved pill keeps the seal (§M3 'resolved seal'; §B11 RESOLVED = struck gilt)", /<Chip variant="resolved" size="sm">/.test(featured));

  // 2.5 · fairness: the chain's highlighted step and the list's numerals.
  const FAIR = read("src/app/fairness/page.tsx");
  ok("2.5 · the fairness chain's highlighted node is the brand ring the KYC rail's current step wears — not gilt",
    /\? "border-2 border-brand-500 bg-brand-500\/10 text-brand-300"/.test(FAIR) && /highlight: true/.test(FAIR) && !/gold|gilt/.test(FAIR));
  ok("2.5′ · the numerals are the list's own ink — never gold — in R4-E's measured proportional Inter Bold (not tabular, §7 of r4e)",
    !/gold|gilt|color:/.test(rule(CSS, ".fairness-steps > li::before")) && !/tabular-nums|font-mono/.test(rule(CSS, ".fairness-steps > li::before"))
    && !/gilt|gold/.test(rule(CSS, ".kp-step__n")));

  // 2.6 · the badge rings and "5/20": progress in the brand family, the coin in identity metal.
  ok("2.6 · the progress ring is `--brand-500` and its count `--brand-300`; the coin is `--metal-gold` (gold-is-money §2b holds the coin)",
    /stroke:\s*var\(--brand-500\)/.test(rule(CSS, ".badge-ring-arc")) && /color:\s*var\(--brand-300\)/.test(rule(CSS, ".badge-count"))
      && /const gold = "var\(--metal-gold\)";/.test(read("src/components/badges/icons.tsx")));

  // 2.7 · the KYC stepper's active step ("NIDA" in capsule gold).
  const KYC = read("src/app/profile/kyc/page.tsx");
  ok("2.7 · the KYC rail's current step is the brand ring and label, its fill the brand line — no gold on the page",
    /\? "border-2 border-brand-500 bg-brand-500\/10 text-brand-300"/.test(KYC) && /\? "text-brand-300"/.test(KYC) && /var\(--brand-500\) 75%/.test(KYC) && !/gold/.test(KYC));

  // 2.8 · the probability bar's marker: the NEEDLE, the mark's own instrument (§B1a) — ALLOWED, and pinned so.
  ok("2.8 · CONTROL · the bar's marker is the brand needle (`--bar-needle: var(--gilt)`, §B1a 'the same object as TippingBar') — allowed, kept",
    /--bar-needle:\s*var\(--gilt\);/.test(CSS) && /background:\s*var\(--bar-needle\)/.test(rule(CSS, ".tipbar-needle")));

  // 2.9 · the empty-state art: §C7 "a single gold accent" per illustration — exactly one, never two.
  const EMPTY = read("src/components/ui/empty-state.tsx");
  /** Each scene of the illustration switch — every `case "…":` and the `default:` — inside the function only. */
  const scenesOf = (src: string) => {
    const at = src.indexOf("function DefaultIllustration");
    // To the next TOP-LEVEL declaration — not "\n}\n", which the comment stripper leaves inside JSX (`{/* … */}` → `{\n\n}`).
    const next = /\n(?:export )?(?:async )?(?:function|const|let|type|interface) /g;
    next.lastIndex = at + 10;
    const end = next.exec(src)?.index ?? src.length;
    return src.slice(at, end).split(/\n\s*(?:case "[^"]+"|default):/).slice(1);
  };
  const scenes = scenesOf(EMPTY);
  const accents = scenes.map((s) => (s.match(/\{g\}/g) ?? []).length);
  ok("2.9 · every illustration carries exactly ONE gold accent (§C7) — the compass needle, the briefcase clasp…",
    scenes.length >= 8 && accents.every((c) => c === 1), accents.join(","));
  const twice = EMPTY.replace('fill={g} stroke="none" />', 'fill={g} stroke={g} />');
  ok("2.9′ PLANT · a second gold accent in one scene is reported", scenesOf(twice).some((s) => (s.match(/\{g\}/g) ?? []).length !== 1));

  // 2.10 · the WIN pills: M3, a resolved win is money earned — allowed.
  ok("2.10 · CONTROL · WIN is struck gilt in the dictionary and gold in the notification tints (allowed: money earned)",
    /WIN:\s*\{ player: "gilt" \}/.test(read("src/lib/status-tone.ts")) && /case "WIN":\s*return "border-gold-700 bg-gold-500\/10 text-gold-300";/.test(read("src/lib/notification-appearance.ts")));

  // 2.11 · the RG page's pending-increase box — the sibling R4-I's neutral notices missed.
  const RGP = read("src/app/profile/responsible-gambling/page.tsx");
  const pending = RGP.slice(RGP.indexOf("{hasPendingIncrease && ("), RGP.indexOf("<form action={setLimitsAction}"));
  ok("2.11 · the pending limit change is R4-I's RG notice: the kit Callout, neutral, md (13px), the clock — no warning box, no triangle",
    /^\{hasPendingIncrease && \(\s*<Callout tone="neutral" size="md" glyph="clock">/.test(pending) && !/warning/.test(pending) && !/text-\[12px\]/.test(pending), pending.slice(0, 120));
  ok("2.11′ · …and the page carries no warning tone and no gold anywhere (the break and the exclusion are neutral too)",
    !/warning|gold/.test(RGP));
  const neutral = html(h(Callout, { tone: "neutral", size: "md", glyph: "clock" }, "x"));
  ok("2.11″ EXECUTED · the neutral md notice: dashed edge, the subtle glyph, the 13px body", /border-dashed border-border/.test(neutral) && /text-text-subtle/.test(neutral) && /text-body-sm/.test(neutral));

  // 2.12 · the reality check — an RG intervention — wore a gold rail, a gold clock and gold minutes.
  ok("2.12 · the reality check carries no gold: the sheet's own edge, the clock in the subtle ink, the minutes in the heading's",
    !/gold|gilt/.test(read("src/components/rg/reality-check.tsx")) && /text-text-subtle">\s*<I\.clock s=\{18\} \/>/.test(read("src/components/rg/reality-check.tsx")));
}

/* ══ §3 · THE ONE NON-MONEY ACCENT ════════════════════════════════════════════════════════════════════════════════════ */
section("3 · the one non-money accent — the brand family, wherever a highlight was gold (or aqua)");
{
  const SITES: Array<[string, string, RegExp]> = [
    ["the /results carousel's current pip", "src/app/results/notable-carousel.tsx", /background: i === current \? "var\(--brand-400\)"/],
    ["the /live carousel's current pip (its twin was aqua)", "src/app/live/featured-contest.tsx", /background: i === idx \? "var\(--brand-400\)"/],
    ["the carousels' arrows", "src/app/results/notable-carousel.tsx", /color: "var\(--brand-300\)"/],
    ["the proposal timeline's current step", "src/components/proposals/status-timeline.tsx", /now \? "var\(--brand-300\)"/],
    ["/profile's set-apart row (the agent dashboard)", "src/app/profile/page.tsx", /accent \? "border-brand-600\/60 hover:border-brand-500"/],
    ["the journey's staff row", "src/components/layout/avatar-menu.tsx", /journey \? "hover:bg-brand-500\/10" : "hover:bg-gold-500\/10"/],
    ["the journey's current-language tick", "src/components/ui/language-menu.tsx", /const tickInk = journey \? "var\(--brand-300\)"/],
    ["the journey bell's unread dot and wash", "src/components/layout/notifications-panel.tsx", /const unreadDot = journey \? "brand" : "gold";/],
    ["the primer's instruction and its 'share' hinge", "src/components/onboarding/first-visit-primer.tsx", /style=\{\{ color: "var\(--brand-300\)" \}\}>\{dragLabel\}/],
    ["the primer's progress strip, step bars and pager", "src/components/onboarding/first-visit-primer.tsx", /linear-gradient\(90deg, var\(--brand-500\), var\(--brand-300\)\)/],
    ["the consent and install cards' glyph", "src/components/analytics/consent-prompt.tsx", /text-brand-300" aria-hidden><I\.chart/],
    ["the KYC upload tile's hover and working state", "src/components/profile/kyc-doc-uploader.tsx", /: working \? "border-brand-400 bg-brand-500\/\[0\.06\] cursor-wait"/],
    ["the avatar camera's hover edge", "src/components/profile/avatar-uploader.tsx", /group-hover:border-brand-400 group-hover:text-text/],
    ["the invite plate on each promise", "src/app/profile/invite/page.tsx", /className="bg-brand-500\/10 text-brand-300"/],
    ["the propose promo's plate and hover", "src/components/ui/propose-promo.tsx", /hover:border-brand-400/],
    ["the market page's CLOSED words (the dictionary's royal ink, `TONE_INK.royal`)", "src/app/markets/[id]/page.tsx", /text-brand-300">\s*\{t\.market\.closedAwaitingSettlement\}/],
  ];
  for (const [what, f, re] of SITES) ok(`3 · ${what} — the brand family`, re.test(read(f)), f);
  ok("3′ · the CSS accents: the landing eyebrow tick, the trust facts' glyphs, a selection, the nav bar's glow",
    /background:\s*var\(--brand-400\)/.test(rule(CSS, ".kp-hero__tick")) && /color:\s*var\(--brand-300\)/.test(rule(CSS, ".kp-trust__glyph"))
      && /color-mix\(in oklab, var\(--brand-500\) 40%, transparent\)/.test(rule(CSS, "::selection"))
      && /color-mix\(in oklab, var\(--brand-500\) 50%, transparent\)/.test(read("src/components/ui/nav-progress.tsx")));
  ok("3″ · TONE_INK.royal IS the brand ink (the dictionary's royal word ink the CLOSED words read)", /royal: "text-brand-300"/.test(read("src/lib/status-tone.ts")));
  const brandBox = html(h(Callout, { tone: "brand" }, "x"));
  ok("3‴ EXECUTED · the Callout's `brand` (a promise) is the royal `info` box with the shield — there is no gilt box", /border-info-border bg-info-bg/.test(brandBox) && !/gold/.test(brandBox)
    && !/"gold"/.test(read("src/components/ui/callout.tsx")));
}

/* ══ §4 · MONEY THAT WAS NOT EARNED IS NOT GOLD ═══════════════════════════════════════════════════════════════════════ */
section("4 · money that was not EARNED is not gold — D1 commits, D5 inducements, §B12 projections, zero, approvals");
{
  ok("4.1 · D1: 'Confirm deposit' and 'Confirm withdrawal' are brand — the commit's first press, like the dialog's own button",
    /className="btn btn-primary btn-lg w-full">\s*\{t\.common\.confirmDeposit\}/.test(read("src/app/wallet/deposit/deposit-confirm.tsx"))
      && /className="btn btn-primary btn-lg w-full"\s*>\s*\{t\.common\.confirmWithdrawal\}/.test(read("src/app/wallet/withdraw/withdraw-confirm.tsx"))
      && !/btn-gold|gold-500/.test(read("src/app/wallet/deposit/loading.tsx")));
  ok("4.1′ · D1: the withdrawal's 'you receive' is the text's ink — no confirm box carries gold", /total:\s*"font-mono text-\[16px\] font-bold tabular-nums text-text"/.test(read("src/components/ui/receipt-row.tsx")));
  ok("4.1″ · the Lipa panel's number (an identifier) and amount (a fee PAID) are the text's ink", !/gold/.test(read("src/components/pay/lipa-qr-panel.tsx")));
  const WALLET = read("src/app/wallet/wallet-client.tsx");
  const bonusCard = WALLET.slice(WALLET.indexOf("function BonusWalletCard"), WALLET.indexOf("function TxnRow"));
  ok("4.2 · D5: the cashback inducement and the dormant bonus card carry no gold words, and 'Deposit now' there is primary",
    !/gold/.test(read("src/components/ui/cashback-promo.tsx")) && /btn btn-primary btn-sm rounded-pill/.test(read("src/components/ui/cashback-promo.tsx"))
      && bonusCard.length > 2000 && !/gold/.test(bonusCard), (bonusCard.match(/[\w:-]*gold[\w/[\].-]*/g) ?? []).join(" "));
  ok("4.2′ · CONTROL · the wallet's own gold stays where it is money: the live balance card's edge and the zero-balance Add funds door",
    /text-gold-300 hover:text-gold-200/.test(WALLET.slice(WALLET.indexOf("function BalanceCard"), WALLET.indexOf("function TOKEN_LABEL"))));
  const PC = read("src/components/markets/position-card.tsx");
  const exact = PC.slice(PC.indexOf("label={t.market.payoutIfWin}") - 40, PC.indexOf("hint={t.market.payoutExactNote}"));
  ok("4.3 · §B12: an exact payout-if-win at betting-close is not gold ('a gold data line would claim earnings the round has not decided')",
    exact.length > 40 && !/gold/.test(exact), exact);
  ok("4.4 · zero is not gold: the net P&L, its rows, the settled strip (> 0 only)",
    /netPnl > 0 \? "text-\[var\(--gilt\)\]" : netPnl < 0 \? "text-no-300" : "text-text"/.test(read("src/app/positions/performance/page.tsx"))
      && /r\.pnl > 0 \? "text-\[var\(--gilt\)\]"/.test(read("src/app/positions/performance/page.tsx"))
      && /settledNet > 0 \? "text-\[var\(--gilt\)\]"/.test(read("src/components/positions/pnl-summary-strip.tsx")));
  ok("4.4′ · zero is not gold: the best-win crest only with a win; the invite dial and Earned only once earned; the agent's commission only > 0",
    /\$\{bestMarket \? "border-gold-700\/50" : "border-border"\}/.test(read("src/app/positions/performance/page.tsx"))
      && /\{bestMarket && <GiltCorner/.test(read("src/app/positions/performance/page.tsx"))
      && /const earnedGold = paid && s\.earnedTzs > 0;/.test(read("src/app/profile/invite/page.tsx")) && /tone=\{earnedGold \? "gold" : "royal"\}/.test(read("src/app/profile/invite/page.tsx"))
      && /tone=\{s\.earnedTzs > 0 \? "gold" : "default"\}/.test(read("src/app/profile/invite/page.tsx"))
      && /tone=\{dash\.paidTzs > 0 \? "gold" : "default"\}/.test(read("src/app/profile/invite/agent-dashboard.tsx")));
  ok("4.5 · a promise is not money: the invite share buttons are primary in every state, the share cards royal, the rate box royal",
    !/"gold"/.test(read("src/app/profile/invite/invite-client.tsx")) && !/variant=\{paid \? "gold"/.test(read("src/app/profile/invite/page.tsx"))
      && !/GiltCorner|gold-700|gold-500/.test(read("src/app/profile/invite/agent-dashboard.tsx")));
  ok("4.5′ · a label is not money: a paying friend's chip is success (the '+X' beside it is the gold), not the resolved seal",
    /<Chip variant=\{r\.earnedTzs > 0 \? "success" : "pending"\}>/.test(read("src/app/profile/invite/page.tsx")));
  ok("4.6 · an approval is permission, not money (§B11): 'Verified agent' is success, the KYC crest is success, 'Approved' on a proposal's timeline is success",
    /<Chip variant="success"/.test(read("src/components/agent/verified-agent-badge.tsx")) && /<RewardBurst glyph="shieldcheck" tone="success"/.test(read("src/app/profile/kyc/page.tsx"))
      && /done \? "var\(--success-fg\)"/.test(read("src/components/proposals/status-timeline.tsx")));
  const badge = html(h(VerifiedAgentBadge, { label: "Wakala" }));
  const crest = html(h(RewardBurst, { glyph: "shieldcheck", tone: "success", caption: "x", animate: false } as never));
  ok("4.6′ EXECUTED · the badge renders the success chip; the success crest's ring is `--success` (no gold in either)",
    /var\(--success-fg\)/.test(badge) && !/gold/.test(badge) && /border:2px solid var\(--success\)/.test(crest) && !/gold/.test(crest));
  ok("4.7 · a link to a market is a control, not its seal: the proposal page's market button is ghost in both states",
    /<Button variant="ghost" size="md" fullWidth className="mt-3" trailing=\{<I\.arrowRight s=\{15\} \/>\}>/.test(read("src/app/proposals/[id]/page.tsx")) && !/variant=\{p\.status === "RESOLVED" \? "gold"/.test(read("src/app/proposals/[id]/page.tsx")));
  ok("4.8 · SubmitButton, Toggle, PageHeader, PageHero and the Callout offer no `gold` to ask for (zero money callers)",
    !/"gold"/.test(read("src/components/ui/submit-button.tsx")) && !/gold:/.test(read("src/components/ui/toggle.tsx")));
}

/* ══ §5 · THE WARNING FAMILY KEEPS ITS ONE MEANING ════════════════════════════════════════════════════════════════════ */
section("5 · the warning family keeps its one meaning — F3 toasts, §B11 words, RG notices, clocks, one limit ramp");
{
  // 5.1 · F3: "warning → the `factual` toast. NOT toast `warning`, which is struck in GOLD."
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
  });
  const toastWarning = (src: string) => [...src.matchAll(/toast\(\{[^}]*variant:\s*"warning"/g)].length;
  const offenders = walk(join(ROOT, "src")).filter((f) => !OUT_OF_SCOPE.test(f) && toastWarning(decomment(raw(f))) > 0);
  ok("5.1 · F3: no player toast is the gold-struck `warning` — a fixable slip is `factual`", offenders.length === 0, offenders.join(" · "));
  ok("5.1′ PLANT · a `toast({ title: err, variant: \"warning\" })` is reported", toastWarning('toast({ title: err, variant: "warning" });') === 1);
  ok("5.1″ · CONTROL · the premise holds: the warning toast IS gold (feedback-law §2 pins it too)", /warning: \{\s*bar: "bg-gold-500"/.test(read("src/components/ui/toast.tsx")));

  // 5.2 · §B11 — one word, one tone.
  const WRM = read("src/app/wallet/wallet-result-modal.tsx");
  ok("5.2 · the wallet's result: moving and in-review are ROYAL (`info`), Completed success, Failed danger, Reversed/Cancelled SLATE (§B11 item 5, §C4)",
    /const variant = notDone \? \(status === "FAILED" \? "danger" : "neutral"\) : \(amlHeld \|\| pending \? "info" : "success"\);/.test(WRM) && !/"warning"/.test(WRM));
  ok("5.2′ · the result modal has a slate `neutral` (the subtle ring, no auto-close)", /neutral: \{\s*\.\.\.crest\("var\(--text-subtle\)", "var\(--text-muted\)"\)/.test(read("src/components/markets/operation-result-modal.tsx")));
  ok("5.2″ · 'under review' (source of funds) is royal, a hidden comment slate, a paused agent slate, a running break neutral",
    /: "pending";/.test(read("src/app/profile/source-of-funds/page.tsx")) && /<Chip variant="neutral" size="sm">\{t\.market\.commentHidden\}/.test(read("src/components/markets/comments-thread.tsx"))
      && /playerStatusChip\("DEACTIVATED"\)/.test(read("src/app/profile/invite/agent-dashboard.tsx")) && !/COOLED_OFF" \? "warning"/.test(read("src/app/profile/account/page.tsx")));
  ok("5.2‴ · 'more information needed' and the KYC gate's 'your move' are AMBER — the warning family, never the gold ramp (§B11)",
    /action:\s*\{ ring: "border-warning-border", ink: "text-warning-fg", wash: "bg-warning-bg" \}/.test(read("src/components/kyc/kyc-gate-panel.tsx"))
      && /border-warning-border bg-warning-bg p-4 lg:p-5/.test(read("src/app/profile/kyc/page.tsx")));

  // 5.3 · a clock's last stretch keeps its ink (§B2a; R4-K moved the market clock's labels).
  ok("5.3 · clocks keep their ink: the OTP's last minute, the position ring's last hour, the countdown pill's figure, the closing-soon pill",
    !/gold|warning/.test(read("src/components/auth/otp-expiry-countdown.tsx")) && /const urgentColor = urgentAccent \?\? runColor;/.test(read("src/components/positions/countdown-ring.tsx"))
      && /<span className="font-bold text-text">\{display\}<\/span>/.test(read("src/components/ui/countdown-pill.tsx"))
      && !/gold|aqua/.test(rule(decommentCss(raw("src/app/state-tokens.css")), ".closing-pill")));
  const now = Date.parse("2026-10-09T12:00:00Z");
  const ring = html(h(CountdownRing, { deadlineIso: new Date(now + 30 * 60_000).toISOString(), startIso: new Date(now - 2 * 3600_000).toISOString(), serverNow: now }));
  ok("5.3′ EXECUTED · a position ring in its last half hour draws the running arc's ink, not `--gold-400`", /stroke="var\(--aqua-400\)"/.test(ring) && !/gold/.test(ring));

  // 5.4 · ONE limit ramp, on both pages that show a player their limits.
  ok("5.4 · /profile/activity reads the RG kit's ramp itself (`limitUsageFill`) — one meter for every limit, never gilt or the betting pair",
    /background: limitUsageFill\(pct, over\)/.test(read("src/app/profile/activity/page.tsx")) && !/warning-fg|no-500|bg-brand-500/.test(read("src/app/profile/activity/page.tsx")));
  ok("5.4′ EXECUTED · the ramp: royal under 75%, the warning step to 90%, the app-state danger from 90% or at the cap",
    limitUsageFill(50, false) === "var(--royal-400)" && limitUsageFill(80, false) === "var(--warning)" && limitUsageFill(95, false) === "var(--danger-500)" && limitUsageFill(10, true) === "var(--danger-500)"
      && /background:var\(--warning\)/.test(html(h(LimitUsageMeter, { label: "x", used: 80, cap: 100, overLabel: "y" }))));
}

/* ══ §6 · THE SANCTIONED GOLD THAT MUST STAY ══════════════════════════════════════════════════════════════════════════ */
section("6 · the sanctioned gold that must STAY — so the census cannot pass because gold was deleted");
{
  ok("6.1 · the celebration strikes its amount (`.gilt-ink`) and its button is gilt-metal (§M3)", /struck \? "gilt-ink" : "text-gold-300"/.test(read("src/components/markets/win-celebration.tsx")) && /btn gilt-metal btn-md/.test(read("src/components/markets/win-celebration.tsx")));
  ok("6.2 · the bet and sell commits keep gold (D1)", /btn btn-gold btn-lg w-full/.test(read("src/components/markets/bet-confirm-modal.tsx")) && /btn btn-gold btn-lg w-full/.test(read("src/components/markets/sell-confirm-modal.tsx")));
  ok("6.3 · the deposit doors keep gilt-metal (the header pill, the journey pill, the Wallet sheet — §M3a)", /btn gilt-metal btn-md btn-pill/.test(read("src/components/layout/top-app-bar.tsx")) && /btn gilt-metal btn-md btn-pill kp-jhdr__pill/.test(read("src/components/journey/journey-top-bar.tsx")) && /btn gilt-metal btn-lg kp-wsheet__act/.test(read("src/components/layout/wallet-sheet.tsx")));
  ok("6.4 · the live balance is gold (§8a) and the resolved seal is struck gilt (§B11)", /color:\s*var\(--gold-300\)/.test(rule(CSS, ".kp-jbal__fig")) && /resolved:\s*\{ background: "linear-gradient\(180deg, var\(--gold-300\), var\(--gold-500\)\)"/.test(read("src/components/ui/chip.tsx")));
  ok("6.5 · the proposal bonus medallion defaults to gold (money earned), the chart reference lines are gilt (§B12)", /tone = "gold",/.test(read("src/components/brand/reward-burst.tsx")) && /stroke="var\(--gilt\)"/.test(read("src/components/charts/pnl-chart.tsx")) && /stroke="var\(--gilt\)"/.test(read("src/components/updown/price-hero.tsx")));
  ok("6.6 · the gilt material still exists for money (`.gilt-metal`, `.gilt-ink`)", /\.gilt-metal\s*\{/.test(MOTION) && /\.gilt-ink\s*\{/.test(MOTION));
}

/* ══ §7 · THE OWNER'S ITEMS, PINNED AS THEY STAND ═════════════════════════════════════════════════════════════════════ */
section("7 · the owner's items, pinned as they stand — classic chrome (frozen), the token, the hashed legal texts");
{
  ok("7.1 · OWNER · `--warning-fg: var(--gilt)` — the token stays until the owner re-hues the warning family (F3)", /--warning-fg:\s*var\(--gilt\);/.test(CSS));
  ok("7.2 · OWNER · the classic '• Juu na Chini' dots are gilt (nav + rail) — the change: `var(--brand-400)` in both", /borderRadius: "var\(--r-pill\)", background: "var\(--gilt\)"/.test(read("src/components/layout/top-app-bar.tsx")) && /background:\s*var\(--gilt\)/.test(rule(CSS, ".kp-rail__dot")));
  ok("7.3 · OWNER · the classic bell, language tick and staff row keep gold; the journey's are brand (the same component, a `journey` prop)",
    /const unreadWash = journey \? "bg-brand-500\/\[0\.04\]" : "bg-gold-500\/\[0\.04\]";/.test(read("src/components/layout/notifications-panel.tsx"))
      && /<LanguageMenu journey \/>/.test(read("src/components/journey/journey-top-bar.tsx")) && /<NotificationsPanel journey \/>/.test(read("src/components/journey/journey-top-bar.tsx")));
  ok("7.4 · OWNER · the session-ended notice is the warning family (the player must sign in again — §B11), its gilt the token's", /tone="warning"\s*glyph="alertCircle"\s*testId="session-ended-notice"/.test(read("src/components/layout/app-shell.tsx")));
  ok("7.5 · OWNER · the legal RG links are gold and HASHED (RG_EN_SHA, TERMS_TEXT_SHA): the recolour ships with a new version",
    /text-gold-300 hover:text-gold-200/.test(read("src/app/legal/responsible-gambling/page.tsx")) && /text-gold-300 hover:text-gold-200/.test(read("src/app/legal/terms/page.tsx")));
  ok("7.6 · the regulator-letter frame's corners are claret (§B4), not gilt", (read("src/app/legal/_components.tsx").match(/ink="var\(--claret-400\)"/g) ?? []).length === 2);
  // 7.7 · the "coming soon" tag renders in the classic header, rail and avatar menu (frozen chrome) AND in page bodies
  // (the propose promo, /proposals). Bodies and the journey wear the neutral tag; the classic chrome keeps its tint.
  const csBase = rule(CSS, ".cs-badge");
  const csScoped = /#main-content \.cs-badge,\s*:root:has\(#kp-journey-shell\) \.cs-badge\s*\{\s*background:\s*var\(--bg-inset\);\s*border-color:\s*var\(--border\);\s*\}/.test(CSS);
  ok("7.7 · OWNER · the classic chrome's 'coming soon' tag keeps its gold tint; page bodies (#main-content) and the journey wear the neutral tag",
    /background:\s*color-mix\(in oklab, var\(--gold-500\) 9%, var\(--bg-inset\)\)/.test(csBase) && csScoped);
}

console.log(`\nvisual-pass-r5c: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
