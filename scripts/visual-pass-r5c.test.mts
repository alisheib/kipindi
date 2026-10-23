/**
 * ROUND 5 OF THE VISUAL PASS, HELPER C (2026-10-09) — THE SECOND GOLD AUDIT. Every gold paint in the player's code was
 * found, ruled in DESIGN_AUTHORITY's own words — allowed (money won, earned commissions, identity metal, the live balance,
 * the brand mark's needle, an illustration's single accent) or a defect — and every defect in a shared page body or the
 * journey was fixed. U43 briefly moved deposit doors to brand and the Up & Down opening reference to neutral;
 * Ali restored the named earlier house-gold treatment on 2026-10-20. Classic chrome and the
 * `--warning-fg: var(--gilt)` token are the owner's, and are pinned here as they stand so a change to them is deliberate.
 * ⭐ THE TOKEN WAS RULED ON 2026-10-10 — Ali's ruling (1): WARNINGS ARE AMBER, NOT GOLD. R8-A re-hued the whole warning
 * family to hue 64 (`globals.css`), which this census's own hue rule (70–100) does not call gold, so the family LEFT the
 * gold census (§1) and its files and rulings moved, whole, to the WARNING census of `test:visual-pass-r8a` §3. §5.1″ and
 * §7.1 pin the new state.
 *
 *   npx tsx scripts/visual-pass-r5c.test.mts        (npm run test:visual-pass-r5c)
 *
 * The owner's rule (Ali, 2026-10-09): consistency and perfection in each move. ONE rule, the same way everywhere:
 *   · PLAYER GOLD marks earned money and the named house mark, reading instrument, wallet, money-in doors,
 *     commits, and classic navigation treatments restored by Ali on 2026-10-20 (§M3a). Earned commissions and
 *     bonus celebrations keep their recorded treatments.
 *   · A HIGHLIGHT that is not money — "this one", the current step, progress, a selection, an accent — is the BRAND
 *     family, the product's one non-money accent: `--brand-300` ink, `--brand-400` marks (the rail's unread dot, every
 *     pip), `--brand-500` rings and fills (the focus ring, the selected pill's halo `--glow-selected`, §E4's glows).
 *   · IDENTITY (a tier, a rank, a streak, an achievement, an asset) may be METALLIC — `--metal-gold` — never the money
 *     ink (Q5).
 *   · A WORD takes its §B11 tone: waiting royal, approved/completed success, terminal slate, failed danger, and amber
 *     ONLY where somebody must act (its paint, the `--warning-*` family, was struck in gilt until the owner re-hued it —
 *     amber since Ali's ruling (1) of 2026-10-10, F3's note).
 *
 *   §1  THE GOLD CENSUS — every gold paint in the player's code, counted per file, each file registered with its ruling;
 *       a new gold use anywhere fails until it is ruled and registered (with plants proving the scanner sees each form)
 *   §2  the items the readers raised (tiles r5-4, r5-6) and the RG page's last warning box
 *   §3  non-money accents use brand; the Phosphor identity plate owns its glyph ink
 *   §4  remaining unearned surfaces do not borrow gold (D5 inducements, §B12 projections, zero)
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
 *   var    a CSS variable of the gold ramp or its aliases, the gilt material, the identity metal.
 *          ⭐ Until 2026-10-10 the WARNING family counted too — `--warning-fg` WAS `--gilt` (F3), and since round 6
 *          (review C3) its other spellings `--warning`, `--warning-500` (then oklch 78% 0.13 86: gold by this census's own
 *          hue rule), `--warning-bg` and `--warning-border`. Ali's ruling (1) of 2026-10-10 made the family AMBER (hue 64,
 *          R8-A), which this hue rule does not call gold, so it left this census; `test:visual-pass-r8a` §3 counts it now.
 *   tw     a Tailwind colour utility on the gold / gilt families (the warning family's left with it, as above)
 *   cls    the gold material classes (`gilt-metal`, `gilt-ink`, `btn-gold`, `mat-tint-gilt`, `chip-resolved`)
 *   name   a tone or variant asked for by NAME: "gold" (any .ts/.tsx; "warning" left with the family, as above)
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
    // The leaderboard's tier type names the established identity medal. A type union
    // cannot paint a pixel; keep this exact declaration out of the paint census.
    if (file === "src/app/leaderboard/tier-hint.tsx" && /^type Tier = "bronze" \| "silver" \| "gold" \| "diamond" \| "sovereign";$/.test(ln)) return;
    if (file === "src/components/ui/icon-plate.tsx" && ln === 'export type PlateVariant = "identity" | "empty" | "quiet" | "info" | "success" | "warning" | "danger" | "gold";') return;
    const push = (kind: string, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => {
      for (const m of ln.matchAll(re)) if (keep(m)) out.push({ kind, match: m[0], line: i + 1 });
    };
    // R8-A (2026-10-10): the warning family's spellings left `var`, `tw` and `name` — it is amber (hue 64), not gold, by
    // Ali's ruling (1); `test:visual-pass-r8a` §3 holds its own census with these files' rulings.
    push("var", /var\(\s*--(?:gilt[\w-]*|gold(?:-[\w-]+)?|metal-gold|border-gold|glow-gold|glow-jackpot|g-gold|g-jackpot|bet-jackpot|bet-streak)\s*[,)]/g);
    push("tw", /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:gold|gilt)(?:-[a-z0-9]+)?(?:\/[\w.[\]]+)?(?![\w-])/g);
    push("cls", /(?<![\w-])(?:gilt-metal|gilt-ink|btn-gold|mat-tint-gilt|chip-resolved)(?![\w-])/g);
    if (file.endsWith(".ts") || file.endsWith(".tsx")) push("name", /["'`]gold["'`]/g);
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
 * "OWNER" = the named classic chrome and hashed legal text: the change is written in R5-C's report for Ali.
 * The historical `--warning-fg: var(--gilt)` token was re-hued to amber on 2026-10-10 and is outside this census.
 * ⭐ R8-A (2026-10-10, Ali's ruling (1)): the owner re-hued it — amber, hue 64. Every count below that was "the token's"
 * dropped out of this gold census (files that painted ONLY the warning family left the table; mixed files keep their
 * gold count), and those rulings live on, file by file, in `test:visual-pass-r8a` §3's WARNING registry.
 */
const REGISTRY: Record<string, [number, string]> = {
  // ── allowed: settled winnings, earned commissions, identity metal and legacy live-balance treatments ────────────────
  // U43: sign-up bonus offers are not won; R4-I §14.3 and test:u43-earned-palette pin both neutral figures.
  // R8-A (2026-10-10): −5 — the hedge caution's box and words are amber now (Ali's ruling (1)); r8a §3 holds them.
  "src/app/markets/[id]/page.tsx": [2, "a settled WIN's status word and payout (§M3); RESOLVED now uses the restored shared gilt tone"],
  "src/app/positions/performance/page.tsx": [15, "a positive net and row (money earned) · the best-win crest, only with a win · the streak in identity metal"],
  "src/app/profile/invite/agent-dashboard.tsx": [4, "commission EARNED, gold only when > 0 (§M3)"],
  "src/app/profile/invite/page.tsx": [12, "the earnings dial, its wash and the Earned figure, gold only once money was earned; per-friend earnings > 0"],
  "src/app/proposals/[id]/page.tsx": [4, "the approval-bonus crest: money earned (§M3 celebration; its eyebrow is CELEBRATION in eyebrow-roles)"],
  "src/app/proposals/page.tsx": [1, "a proposer's granted bonus (money earned)"],
  "src/app/updown/[roundId]/page.tsx": [1, "a won round's struck payout (§M3)"],
  // R5-I (2026-10-09): a positive net on /updown/history read the YES side's green; it reads as every net now (§B2a).
  "src/app/updown/history/page.tsx": [2, "a positive settled net (money earned), the page strip's and a round group's — as /positions/performance"],
  // R5-I (2026-10-09): −1 — the dormant grant's chip left the warning pill for the kit Chip in its §B11 tone (I-3).
  // R8-A (2026-10-10): −2 — the zero-balance Add funds is a TEXT LINK, and every link is blue (Ali's ruling (2), §B4c).
  "src/app/wallet/wallet-client.tsx": [2, "the live balance card's warm edge (money, §8a) ×2"],
  "src/components/brand/reward-burst.tsx": [7, "the gold medallion for money earned (the proposal bonus) — `success` for an approval"],
  "src/components/journey/tickets/ticket-card.tsx": [2, "a won ticket's struck payout (§M3)"],
  // Ali's 2026-10-20 ruling restores the earlier money-commit gold in Journey and Juu/Chini.
  "src/components/journey/bet-sheet/bet-sheet.tsx": [3, "the question confirm commit and low-balance deposit door, named gold controls (§M3a)"],
  "src/components/journey/journey-top-bar.tsx": [1, "the journey money-in Deposit door (§M3a)"],
  "src/components/journey/updown/jud-arm.tsx": [1, "the Juu/Chini stake commit (§M3a)"],
  "src/components/journey/question/journey-holder.tsx": [2, "S8's settled WIN status and payout, money earned (§M3), as the classic holder"],
  "src/components/markets/position-card.tsx": [2, "a settled WIN's struck payout (§M3)"],
  "src/components/markets/position-share.tsx": [4, "sharing a WIN — the celebration's own moment (§M3)"],
  // R8-A (2026-10-10): the cautions left with the amber family (Ali's ruling (1)) — −6 here, −2 below; r8a §3 holds them.
  "src/components/markets/resolution-panel.tsx": [2, "the winning pool's money row (§M3); RESOLVED now uses the restored shared gilt tone"],
  "src/components/markets/bet-confirm-modal.tsx": [1, "the classic bet commit (§M3a)"],
  "src/components/markets/sell-confirm-modal.tsx": [1, "the classic sell commit (§M3a)"],
  "src/components/markets/sell-result.tsx": [1, "successful sale completion uses gold; failure stays brand (§M3a)"],
  "src/components/markets/win-celebration.tsx": [5, "the celebration (§M3)"],
  "src/components/positions/pnl-summary-strip.tsx": [1, "a positive settled net (money earned); the win-rate NeedleDial is neutral (§B1a)"],
  "src/components/updown/round-stake-panel.tsx": [1, "the detail-page bet commit (§M3a)"],
  "src/components/updown/price-hero.tsx": [2, "the round-opening reference line is the earlier gilt instrument (§B12, §M3a)"],
  "src/components/updown/updown-card.tsx": [1, "U43: the player's settled WIN payout only; LOSS and refund amounts use neutral ink (§M3)"],
  // MASWALI-BUILD S5 (DESIGN_AUTHORITY §M8a items 6–8): Millionea's gold is two files and no more. The pool figure, the home
  // card, the seal line, the ticket and the week strip paint none (the jackpot, the floor, the rollover and the stub are
  // unearned, §M8a item 7) — the ticket draws its won amount through the win ledger's component.
  "src/components/maswali/maswali-win-ledger.tsx": [3, "earned money only (§M8a items 7–8): `.gilt-ink` on 'Kwa tiketi yako' / 'Jumla yako' and on a won ticket's paid amount; the ticket card's struck payout stat (the platform card's own)"],
  "src/components/maswali/maswali-slip.tsx": [2, "the Millionea money commit (§M3a): the confirm sheet's armed 'Kata tiketi', the kit's gold Button in `.gilt-metal` — the slip's 'Endelea' is brand primary"],
  // 2026-10-18 (S5 integration): the slip page's door to deposit is a DEPOSIT DOOR (§M3a), as the wallet's and the bet
  // sheet's are — not Millionea's own gold, which stays the two files above (§M8a item 7 rules on unearned figures).
  "src/app/millionea/slip/slip-client.tsx": [2, "the deposit door when the balance is short of the ticket (§M3a: deposit doors are gold, `btn-gold` + `.gilt-metal`, as the Wallet's)"],
  // PHOSPHOR-MIGRATION release 2 (W5): 3 → 1 — the WIN tint's three classes became the plate's `gold` variant (its recipe is
  // `.kp-plate--gold` in globals.css, +3 there), so this file names the variant once.
  "src/lib/notification-appearance.ts": [1, "WIN's notification plate retains the earned-money gold tone (the plate's `gold` variant)"],
  // R8-A (2026-10-10): −1 — TONE_INK.amber (`text-warning-fg`) is amber, not gold (Ali's ruling (1)).
  "src/lib/status-tone.ts": [2, "the dictionary's struck gilt: RESOLVED, WIN (§B11)"],
  "src/components/home/landing-hero.tsx": [2, "the pool and paid-out totals — money (Q5); OWNER question: D5's 'inducement' clause on a landing figure"],
  // ── allowed: the brand mark, chart reference lines, illustration accents, identity metal ───────────────────────────
  "src/components/brand.tsx": [1, "GiltCorner's default ink (the best-win crest only); the TippingBar needle restores gilt (§B1a)"],
  "src/lib/brand-mark.ts": [1, "the delivered mark's gilt needle and hub (§B1a, Ali 2026-10-20)"],
  "src/app/global-error.tsx": [1, "the standalone last-resort mark's gilt needle (§B1a)"],
  "src/components/layout/needle.css": [10, "the shared house needle's gilt seam, hub, rim and aura (§B1a)"],
  "src/components/charts/terminal-chart.tsx": [1, "the round opening-reference chart label (§B12)"],
  "src/components/charts/pnl-chart.tsx": [4, "the break-even reference line (§B12: gilt marks the line a chart is READ AGAINST)"],
  "src/app/leaderboard/page.tsx": [9, "rank and standing in the tier ladder's METAL (Q5) · the tier names"],
  "src/components/badges/icons.tsx": [1, "the achievement coins' METAL (Q5)"],
  "src/components/ui/identity-avatar.tsx": [17, "the heraldic crest's own raw metal and TIER_RING (Q5's letter: no money token)"],
  "src/components/ui/avatar.tsx": [1, "the tier name (identity)"],
  "src/components/updown/asset-mark.tsx": [1, "the gold ASSET's name, XAU (Q5: an asset may be metallic)"],
  // ── the kit's definitions of the gold material and its variants ───────────────────────────────────────────────────
  // R8-A (2026-10-10, Ali's ruling (1) — warnings are amber, not gold): every "the token's" paint below LEFT this table
  // with the warning family — globals.css −5 (the `--warning-*` tokens), motion.css −1 (`.mat-tint-warn`), chip −7 (the
  // amber `paused`/`warning`), dot −2, toast −5, the result modal −4, the circular progress's `warning` name −1; and the
  // tone unions and the warning-only files went whole. `test:visual-pass-r8a` §3 registers each, with these rulings.
  // S8 WP5 (+1, 92 → 93): `.kp-bsheet .btn-gold:disabled`, the bet sheet's own disabled gold — a `.btn-gold` selector
  // that DE-golds the button (a navy plate, subtle words), ruled by VODACOM-PLAN §0g design call 4 and scoped to the
  // sheet by S8-PLAN Open point 20; every other gold button keeps `.btn:disabled`.
  // MASWALI-BUILD S5-TAB (+7; Ali's ruling of 2026-10-19, DESIGN_AUTHORITY §M8a item 11): Maswali Millionea's
  // ink — the gold stop of its still green → gold → red label gradient (resting, lit or hovered, and the journey's
  // not-found restore), its gold fallback word and faint gold halo, and its mark's resting gold (and that restore). The
  // Owner's label for a destination, not money (§M8a item 7 untouched); `test:maswali-ui` §5b holds the class to tokens.
  // PHOSPHOR-MIGRATION release 2 (+3) moves the notification WIN tint to `.kp-plate--gold`.
  // 2026-10-21 (S5 merges main 4471bb44): U43's house-gold restore (dd1386f0, +24) and S5's ink (+7) are independent.
  // 2026-10-23 (−1, 103 → 102): `.kp-rail__dot`'s `var(--gilt)` left with the dot — Ali's ruling, "please remove the golden
  // dot, make it like other tabs please" (DESIGN_AUTHORITY §K 3, "Every nav tab alike").
  "src/app/globals.css": [102, "the gold ramp and aliases, identity metal including the shared empty plate's single accent, earned money, restored house needle, wallet figure, money-in coin and deposit rails, classic badge/footer, and gold button recipes (§M3a); S5's ruled Maswali destination label keeps its green-to-gold-to-red ink (§M8a item 11); dead CSS and admin definitions remain"],
  "src/app/motion.css": [22, "the gilt material — gilt-metal on deposit doors and the celebration, gilt-ink on earned figures, the win toast's tint; dead: `.m-skeleton`"],
  "src/app/state-tokens.css": [2, "`.countdown--urgent` — dead CSS (no consumer)"],
  "src/components/ui/button.tsx": [2, "the `gold` variant — bet and sell commits"],
  "src/components/ui/chip.tsx": [8, "the resolved seal; the console's gold/objection chip"],
  "src/components/ui/dot.tsx": [2, "the kit's `gold` tone, reserved for won money; the player bell uses brand"],
  "src/components/ui/stat.tsx": [3, "the `gold` tone and `struck` — money"],
  "src/components/ui/toast.tsx": [6, "the gold toast (a win)"],
  "src/components/markets/operation-result-modal.tsx": [5, "the opt-in gold strip for a named successful completion; a failed sale stays brand (§M3a)"],
  "src/components/markets/circular-progress.tsx": [1, "the tone union's `gold` (admin-only consumer)"],
  "src/styles/chat/chat-tokens.css": [3, "gilt-edge tokens defined and never consumed — no render"],
  // R8-A (2026-10-10): the KYC page's 'more information needed' box is amber now (r8a §3); what remains is the approval
  // crest — a `<RewardBurst` (counted as the component) told `success`, so it paints no gold (§4.6 above holds that).
  "src/app/profile/kyc/page.tsx": [1, "the approval crest — a `<RewardBurst` told `success` (the component, counted; it paints no gold)"],
  // ── OWNER: restored classic chrome and hashed legal texts ──────────────────────────────────────────────────────────
  "src/app/legal/_components.tsx": [2, "the regulator-letter frame's corners — CLARET ink (§B4), the GiltCorner component counted"],
  "src/components/layout/avatar-menu.tsx": [2, "classic avatar accent restored to gold; staff destination stays brand (§M3a)"],
  "src/components/layout/notifications-panel.tsx": [2, "classic bell's unread marks restored to gold; Journey bell stays brand and shared empty art uses identity metal (§M3a, §C7)"],
  // 2026-10-23 (2 → 1): the product-line dot is deleted (Ali's ruling; DESIGN_AUTHORITY §K 3, "Every nav tab alike").
  "src/components/layout/top-app-bar.tsx": [1, "classic Deposit door restored to gold (§M3a); no destination wears gold (§K 3)"],
  "src/components/layout/wallet-balance-pill.tsx": [9, "classic wallet amount, flash, and eye restored to gold (§M3a)"],
  "src/components/layout/wallet-sheet.tsx": [1, "Wallet sheet Deposit door restored to gold (§M3a)"],
  "src/components/ui/language-menu.tsx": [1, "classic selected-language tick restored to gilt; Journey stays brand (§M3a)"],
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
  // ⭐ CONTROLS FIRST: the scanner must SEE earned gold and the named restored house-gold uses.
  ok("1.0 · CONTROL · the scanner sees earned gold and the restored mark, wallet, bet commit, and instrument",
    (census.get("src/components/markets/win-celebration.tsx")?.length ?? 0) >= 4
      && (census.get("src/components/markets/bet-confirm-modal.tsx")?.length ?? 0) === 1
      && (census.get("src/components/layout/wallet-balance-pill.tsx")?.length ?? 0) === 9
      && (census.get("src/lib/brand-mark.ts")?.length ?? 0) === 1
      && (census.get("src/components/layout/needle.css")?.length ?? 0) === 10
      && (census.get("src/app/global-error.tsx")?.length ?? 0) === 1);
  const unregistered = [...census.keys()].filter((f) => !(f in REGISTRY));
  ok("1.1 · no file paints gold unruled — every one is in the registry with its ruling", unregistered.length === 0,
    unregistered.map((f) => `${f}: ${census.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`).join(" | "));
  const registryDrift = (registry: typeof REGISTRY) => {
    const rose: string[] = [];
    const fell: string[] = [];
    for (const [f, [n]] of Object.entries(registry)) {
      const got = census.get(f)?.length ?? 0;
      if (got > n) rose.push(`${f}: ${got} > ${n} — ${census.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`);
      else if (got < n) fell.push(`${f}: ${got} < ${n}`);
    }
    return { rose, fell };
  };
  const registryPasses = (registry: typeof REGISTRY) => {
    const { rose, fell } = registryDrift(registry);
    return rose.length === 0 && fell.length === 0;
  };
  const { rose, fell } = registryDrift(REGISTRY);
  ok("1.2 · each registered gold count is exact (a new use or a stale allowance must be RULED)", registryPasses(REGISTRY), [...rose, ...fell].join(" | "));
  const plate = "src/app/globals.css";
  ok("1.2′ PLANT · a stale higher allowance is rejected", !registryPasses({ ...REGISTRY, [plate]: [REGISTRY[plate][0] + 1, REGISTRY[plate][1]] }));
  ok("1.3 · the registry's every entry carries its ruling", Object.values(REGISTRY).every(([n, why]) => n > 0 && why.length > 12));
  for (const f of ["src/components/updown/updown-card.tsx", "src/components/journey/question/journey-holder.tsx"]) {
    const planted = read(f) + '\nconst unearned = <span className="text-gold-300">ordinary words</span>;';
    ok(`1.3s PLANT · a new non-money gold use in ${f} exceeds its ruled census`, goldHits(f, planted).length === REGISTRY[f][0] + 1);
  }
  ok("1.3d CONTROL · the shared low-balance deposit rails restore gold ink", /\.kp-bsheet__rails[^}]*color: var\(--gold-fg\)/.test(CSS));
  ok("1.3d PLANT · an unrelated extra gold CSS use still exceeds the exact registry", goldHits("src/app/globals.css", CSS + '\n.unearned-sheet-words { color: var(--gold-300); }').length === REGISTRY["src/app/globals.css"][0] + 1);

  // ⭐ PLANTS — each spelling of gold the census promises to see, planted in memory, is seen; decoys are not.
  const n = (f: string, s: string) => goldHits(f, s).length;
  const tierFile = "src/app/leaderboard/tier-hint.tsx";
  const tierSource = raw(tierFile);
  const tierType = 'type Tier = "bronze" | "silver" | "gold" | "diamond" | "sovereign";';
  ok("1.4 · CONTROL · only the exact Tier type declaration is exempt from the gold paint census",
    tierSource.split("\n").filter((line) => line === tierType).length === 1 && n(tierFile, tierSource) === 0);
  ok("1.4 · PLANT · a runtime gold variant beside the Tier type is still counted",
    n(tierFile, `${tierSource}\nconst unearnedTier = <Chip variant="gold" />;`) === 1
      && n(tierFile, tierSource.replace(tierType, `${tierType} const unearnedTier = <Chip variant="gold" />;`)) === 2);
  const plateFile = "src/components/ui/icon-plate.tsx";
  const plateSource = raw(plateFile);
  const plateType = 'export type PlateVariant = "identity" | "empty" | "quiet" | "info" | "success" | "warning" | "danger" | "gold";';
  ok("1.4 · CONTROL · only the exact PlateVariant type declaration is exempt from the gold paint census",
    plateSource.split("\n").filter((line) => line === plateType).length === 1 && n(plateFile, plateSource) === 0);
  ok("1.4 · PLANT · a runtime gold variant in the same plate file is still counted",
    n(plateFile, `${plateSource}\nconst unearnedPlate = <IconPlate variant="gold" />;`) === 1
      && n(plateFile, plateSource.replace(plateType, `${plateType} const unearnedPlate = <IconPlate variant="gold" />;`)) === 2);
  ok("1.4′ PLANT · a Tailwind gold ink on a non-money file is seen", n("x.tsx", '<span className="font-mono text-gold-300">3</span>') === 1);
  ok("1.4″ PLANT · a gold tone asked for by name is seen (`<Dot tone=\"gold\" />`, `tone={x ? \"gold\" : \"brand\"}`)",
    n("x.tsx", '<Dot tone="gold" /><Chip tone={x ? "gold" : "brand"} />') === 2);
  ok("1.4‴ PLANT · the money aliases and the gilt material are seen (`var(--gilt)`, `var(--glow-gold)`, `gilt-metal`, `btn-gold`)",
    n("x.css", ".a { color: var(--gilt); box-shadow: var(--glow-gold); }\n.b { } .gilt-metal .btn-gold") === 4);
  // R8-A (2026-10-10): INVERTED. Until Ali's ruling (1) these two were PLANTS the census had to see (the family was gilt);
  // the family is amber now, so they are CONTROLS it must NOT count as gold — §3 of `test:visual-pass-r8a` counts them.
  ok("1.4⁗ CONTROL · `--warning-fg` (amber since ruling (1), 2026-10-10) and `text-warning-fg` are NOT gold", n("x.tsx", '<p className="text-warning-fg" style={{ color: "var(--warning-fg)" }} />') === 0);
  ok("1.4⁵ CONTROL · …nor the family's other spellings — `var(--warning)`, `var(--warning-500)`, `var(--warning-bg)`, `border-warning-border`, `bg-warning-bg/15`, `hover:bg-warning-border`, `text-warning`, `bg-warning/15`, a `\"warning\"` tone",
    n("x.tsx", '<i style={{ color: "var(--warning)", fill: "var(--warning-500)", background: "var(--warning-bg)" }} className="border-warning-border bg-warning-bg/15 hover:bg-warning-border text-warning bg-warning/15" /><Chip variant="warning" />') === 0);
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

  // 2.4 · /results: the notable card's crown and label, the page glyph, and the neutral resolved pill.
  const RES = read("src/app/results/page.tsx");
  const featured = RES.slice(RES.indexOf("function FeaturedResult"), RES.indexOf("function ", RES.indexOf("function FeaturedResult") + 20));
  ok("2.4 · the notable card is the product's featured card (royal edge and wash), its crown and label the brand ink",
    /borderColor: "var\(--border-royal\)"/.test(featured) && /text-brand-300">\s*<I\.crown s=\{13\} \/> <span className="kp-track-end kp-track-end--16">\{t\.results\.notableResult\}<\/span>/.test(featured) /* the label in R5-A's tracked span (F19), merged 2026-10-09 */ && !/gold/.test(featured));
  ok("2.4′ · the page's glyph rides in its eyebrow's ink", /<span className="text-text-subtle"><I\.resolved s=\{18\} \/><\/span>/.test(RES));
  const resolvedChip = '<Chip variant={TONE_CHIP[STATUS_TONE.RESOLVED.player]} size="sm" metrics="status">';
  ok("2.4″ · CONTROL · the market verdict uses the restored shared RESOLVED gilt tone, while a WIN stays gilt",
    featured.includes(resolvedChip) && /RESOLVED:\s*\{ player: "giltStruck", admin: "gilt", proposals: "giltStruck" \}/.test(read("src/lib/status-tone.ts")));
  const oldGoldSeal = featured.replace(resolvedChip, '<Chip variant="resolved" size="sm" metrics="status">');
  ok("2.4‴ · PLANT · hardcoding a seal instead of consuming the shared tone is caught", oldGoldSeal !== featured && !oldGoldSeal.includes(resolvedChip));

  // 2.5 · fairness: the chain's highlighted step and the list's numerals.
  const FAIR = read("src/app/fairness/page.tsx");
  const fairnessBrand = (src: string) => /<IconPlate size=\{44\} variant="identity" aria-hidden\s+style=\{s\.highlight \? \{ boxShadow: "inset 0 0 0 2px var\(--brand-500\)" \} : undefined\}>/.test(src)
    && /s\.highlight \? "text-brand-300" : "text-text-subtle"/.test(src) && /highlight: true/.test(src) && !/gold|gilt/.test(src);
  ok("2.5 · the fairness chain's highlighted node is the identity plate with a brand ring and label — not gilt",
    fairnessBrand(FAIR));
  const fairnessGold = FAIR.replace('boxShadow: "inset 0 0 0 2px var(--brand-500)"', 'boxShadow: "inset 0 0 0 2px var(--gold-500)"');
  ok("2.5″ PLANT · restoring a gold ring to the highlighted fairness node fails", fairnessGold !== FAIR && !fairnessBrand(fairnessGold));
  ok("2.5′ · the numerals are the list's own ink — never gold — in R4-E's measured proportional Inter Bold (not tabular, §7 of r4e)",
    !/gold|gilt|color:/.test(rule(CSS, ".fairness-steps > li::before")) && !/tabular-nums|font-mono/.test(rule(CSS, ".fairness-steps > li::before"))
    && !/gilt|gold/.test(rule(CSS, ".kp-step__n")));

  // 2.6 · the badge rings and "5/20": progress in the brand family, the coin in identity metal.
  ok("2.6 · the progress ring is `--brand-500` and its count `--brand-300`; the coin is `--metal-gold` (gold-is-money §2b holds the coin)",
    /stroke:\s*var\(--brand-500\)/.test(rule(CSS, ".badge-ring-arc")) && /color:\s*var\(--brand-300\)/.test(rule(CSS, ".badge-tier-pip.badge-count")) /* round 7 (R7-A, R5-8): the count is the tier pip's chip now */
      && /const gold = "var\(--metal-gold\)";/.test(read("src/components/badges/icons.tsx")));

  // 2.7 · the KYC stepper's active step ("NIDA" in capsule gold).
  const KYC = read("src/app/profile/kyc/page.tsx");
  ok("2.7 · the KYC rail's current step is the brand ring and label, its fill the brand line — no gold on the page",
    /\? "border-2 border-brand-500 bg-brand-500\/10 text-brand-300"/.test(KYC) && /\? "text-brand-300"/.test(KYC) && /var\(--brand-500\) 75%/.test(KYC) && !/gold/.test(KYC));

  // 2.8 · the probability bar keeps the mark's needle geometry and restored gilt ink (§B1a).
  ok("2.8 · the bar's reading needle restores gilt while keeping the brand instrument's geometry (§B1a)",
    /--bar-needle:\s*var\(--gilt\);/.test(CSS) && /background:\s*var\(--bar-needle\)/.test(rule(CSS, ".tipbar-needle")));

  // PHOSPHOR-MIGRATION release 2b: the private scenes retired. One identity-metal
  // accent belongs to the shared empty plate, never to a money-gold glyph or its copy.
  const EMPTY = read("src/components/ui/empty-state.tsx");
  const emptyPlate = rule(CSS, ".kp-plate--empty");
  const accent = rule(CSS, ".kp-plate--empty::after");
  const isOneMetalAccent = (body: string) => (body.match(/var\(--metal-gold\)/g) ?? []).length === 1
    && !/var\(--(?:gold-\d+|gilt|gold-fg)\)/.test(body);
  ok("2.9 · each empty state uses the one Duotone plate with a single --metal-gold accent (§C7)",
    /<IconPlate size=\{56\} variant="empty">/.test(EMPTY)
      && /<Glyph s=\{plateGlyph\(56\)\} tier="duo" \/>/.test(EMPTY)
      && /var\(--plate-identity\)/.test(emptyPlate) && isOneMetalAccent(accent)
      && !/<svg/.test(EMPTY));
  const moneyPlant = accent.replace("var(--metal-gold)", "var(--gold-400)");
  ok("2.9′ PLANT · a money-gold accent on empty art fails the same rule", !isOneMetalAccent(moneyPlant));

  // 2.10 · the WIN pills: M3, a resolved win is money earned — allowed.
  const notificationTone = read("src/lib/notification-appearance.ts");
  const winGold = (src: string) => /case "WIN":\s*return "gold";/.test(src)
    && /<IconPlate size=\{32\} variant=\{tintFor\(kind\)\}/.test(read("src/app/notifications/page.tsx"))
    && /<IconPlate size=\{32\} variant=\{tintFor\(kind\)\}/.test(read("src/components/layout/notifications-panel.tsx"))
    && /color:\s*var\(--gold-300\)/.test(rule(CSS, ".kp-plate--gold"));
  ok("2.10 · CONTROL · WIN is struck gilt in the dictionary and the notifications' shared gold plate (allowed: money earned)",
    /WIN:\s*\{ player: "gilt" \}/.test(read("src/lib/status-tone.ts")) && winGold(notificationTone));
  const noWinGold = notificationTone.replace('case "WIN":          return "gold";', 'case "WIN":          return "info";');
  ok("2.10′ PLANT · demoting a paid WIN to the info plate fails", noWinGold !== notificationTone && !winGold(noWinGold));

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
  const reality = read("src/components/rg/reality-check.tsx");
  const neutralReality = (src: string) => !/gold|gilt/.test(src)
    && /<IconPlate size=\{40\} variant="identity" aria-hidden>\s*<I\.clock s=\{plateGlyph\(40\)\} tier="duo" \/>\s*<\/IconPlate>/.test(src)
    && /<span className="font-mono">\{elapsedMin\}<\/span>/.test(src);
  ok("2.12 · the reality check carries no gold: its clock uses the identity plate and its elapsed minutes use neutral text",
    neutralReality(reality));
  const gildedReality = reality.replace('variant="identity" aria-hidden>\n            <I.clock', 'variant="gold" aria-hidden>\n            <I.clock');
  ok("2.12′ PLANT · a gold reality-check clock plate fails", gildedReality !== reality && !neutralReality(gildedReality));
}

/* ══ §3 · NON-MONEY ACCENTS AND IDENTITY PLATES ════════════════════════════════════════════════════════════════════════ */
section("3 · non-money accents use brand; Phosphor glyphs use the identity plate where the plate owns their ink");
{
  const SITES: Array<[string, string, RegExp]> = [
    ["the /results carousel's current pip", "src/app/results/notable-carousel.tsx", /background: i === current \? "var\(--brand-400\)"/],
    ["the /live carousel's current pip (its twin was aqua)", "src/app/live/featured-contest.tsx", /background: i === idx \? "var\(--brand-400\)"/],
    ["the carousels' arrows", "src/app/results/notable-carousel.tsx", /color: "var\(--brand-300\)"/],
    ["the proposal timeline's current step", "src/components/proposals/status-timeline.tsx", /now \? "var\(--brand-300\)"/],
    ["/profile's set-apart row (the agent dashboard)", "src/app/profile/page.tsx", /accent \? "border-brand-600\/60 hover:border-brand-500"/],
    ["staff destination's separate brand identity", "src/components/layout/avatar-menu.tsx", /className="text-brand-300\/70 transition-colors group-hover:text-brand-300"/],
    ["classic avatar's restored gold accent", "src/components/layout/avatar-menu.tsx", /accent \? "hover:bg-gold-500\/10" : "hover:bg-bg-overlay"/],
    ["classic gilt and Journey brand current-language tick", "src/components/ui/language-menu.tsx", /const tickInk = journey \? "var\(--brand-300\)" : "var\(--gilt\)";/],
    ["classic gold and Journey brand bell unread wash", "src/components/layout/notifications-panel.tsx", /const unreadDot = journey \? "brand" : "gold";\s*const unreadWash = journey \? "bg-brand-500\/\[0\.04\]" : "bg-gold-500\/\[0\.04\]";/],
    ["the primer's instruction and its 'share' hinge", "src/components/onboarding/first-visit-primer.tsx", /style=\{\{ color: "var\(--brand-300\)" \}\}>\{dragLabel\}/],
    ["the primer's progress strip, step bars and pager", "src/components/onboarding/first-visit-primer.tsx", /linear-gradient\(90deg, var\(--brand-500\), var\(--brand-300\)\)/],
    ["the consent and install cards' glyph", "src/components/analytics/consent-prompt.tsx", /text-brand-300" aria-hidden><I\.chart/],
    ["the KYC upload tile's hover and working state", "src/components/profile/kyc-doc-uploader.tsx", /: working \? "border-brand-400 bg-brand-500\/\[0\.06\] cursor-wait"/],
    ["the avatar camera's hover edge", "src/components/profile/avatar-uploader.tsx", /group-hover:border-brand-400 group-hover:text-text/],
    ["the invite plate on each promise (identity, never money)", "src/app/profile/invite/page.tsx", /<IconPlate\s+size=\{26\}\s+variant="identity"\s+aria-hidden\s*>\s*<PIcon s=\{plateGlyph\(26\)\} tier="duo" \/>/],
    ["the propose promo's plate and hover", "src/components/ui/propose-promo.tsx", /hover:border-brand-400/],
    ["the market page's CLOSED words (the dictionary's royal ink, `TONE_INK.royal`)", "src/app/markets/[id]/page.tsx", /text-brand-300">\s*\{t\.market\.closedAwaitingSettlement\}/],
  ];
  for (const [what, f, re] of SITES) ok(`3 · ${what} — the ruled non-money treatment`, re.test(read(f)), f);
  const invite = read("src/app/profile/invite/page.tsx");
  const giltPromise = invite.replace('size={26}\n                      variant="identity"', 'size={26}\n                      variant="gold"');
  ok("3 · PLANT · turning a promise's identity plate gold fails", giltPromise !== invite && !SITES.find(([, f]) => f === "src/app/profile/invite/page.tsx")![2].test(giltPromise));
  const trust = read("src/components/home/trust-band.tsx");
  const brandAccents = (trustSource: string) => /background:\s*var\(--brand-400\)/.test(rule(CSS, ".kp-hero__tick"))
    && /<IconPlate size=\{48\} variant="identity" className="kp-trust__glyph" aria-hidden>/.test(trustSource)
    && !/gold|gilt/.test(rule(CSS, ".kp-trust__glyph"))
    && /color-mix\(in oklab, var\(--brand-500\) 40%, transparent\)/.test(rule(CSS, "::selection"))
    && /color-mix\(in oklab, var\(--brand-500\) 50%, transparent\)/.test(read("src/components/ui/nav-progress.tsx"));
  ok("3′ · the CSS accents: the landing eyebrow tick, the trust facts' glyphs, a selection, the nav bar's glow",
    brandAccents(trust));
  const giltTrust = trust.replace('variant="identity" className="kp-trust__glyph"', 'variant="gold" className="kp-trust__glyph"');
  ok("3′ PLANT · turning a trust fact's identity plate gold fails", giltTrust !== trust && !brandAccents(giltTrust));
  ok("3″ · TONE_INK.royal IS the brand ink (the dictionary's royal word ink the CLOSED words read)", /royal: "text-brand-300"/.test(read("src/lib/status-tone.ts")));
  const brandBox = html(h(Callout, { tone: "brand" }, "x"));
  ok("3‴ EXECUTED · the Callout's `brand` (a promise) is the royal `info` box with the shield — there is no gilt box", /border-info-border bg-info-bg/.test(brandBox) && !/gold/.test(brandBox)
    && !/"gold"/.test(read("src/components/ui/callout.tsx")));
}

/* ══ §4 · MONEY THAT WAS NOT EARNED IS NOT GOLD ═══════════════════════════════════════════════════════════════════════ */
section("4 · unearned promotions, projected payouts, zero and approvals do not borrow earned-money gold");
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
  // R8-A (2026-10-10): the zero-balance "Add funds" is a TEXT LINK, and Ali's ruling (2) made every link blue (§B4c) —
  // §M3a's door gold is the gilt-metal BUTTON (header pill, Wallet sheet), this page's other deposit doors are primary.
  // The card's warm edge stays: it frames the balance, which is money (§8a).
  const balanceCard = WALLET.slice(WALLET.indexOf("function BalanceCard"), WALLET.indexOf("function TOKEN_LABEL"));
  ok("4.2′ · CONTROL · the wallet's own gold stays where it is money — the balance card's warm edge — and its Add funds text link is the link blue (ruling (2), 2026-10-10)",
    /border: "1px solid oklch\(78% 0\.13 80 \/ 0\.3\)"/.test(balanceCard) && /text-brand-300 hover:text-brand-200 transition-colors/.test(balanceCard) && !/text-gold-300/.test(balanceCard));
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
    // Re-pinned (round 9, R9-A4, 2026-10-11): the arrow strokes at its label's stem (`text="body-600"`); still ghost.
    read("src/app/proposals/[id]/page.tsx").includes('<Button variant="ghost" size="md" fullWidth className="mt-3" trailing={<I.arrowRight s={15} text="body-600" />}>') && !/variant=\{p\.status === "RESOLVED" \? "gold"/.test(read("src/app/proposals/[id]/page.tsx")));
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
  // R8-A (2026-10-10): re-pinned. The premise was "the warning toast IS gold"; Ali's ruling (1) made it AMBER, and the
  // routing stands on F2's table (DESIGN_AUTHORITY F3's note) — feedback-law §2 pins the new premise too.
  const toast = read("src/components/ui/toast.tsx");
  const warningToast = (src: string) => /warning:\s*\{\s*bar: "bg-warning",\s*icon: <I\.warning s=\{plateGlyph\(40\)\} tier="fill" \/>,\s*plate: "warning",\s*surface: "mat-tint-warn",\s*rail: "bg-warning"/.test(src)
    && !/warning:\s*\{\s*bar: "bg-gold/.test(src);
  ok("5.1″ · CONTROL · the warning toast is the AMBER family, never gold (Ali's ruling (1), 2026-10-10) — and still never a fixable refusal's",
    warningToast(toast));
  const goldWarningToast = toast.replace('warning: {\n    bar: "bg-warning",', 'warning: {\n    bar: "bg-gold-500",');
  ok("5.1‴ PLANT · turning the warning toast's bar gold fails", goldWarningToast !== toast && !warningToast(goldWarningToast));

  // 5.2 · §B11 — one word, one tone.
  const WRM = read("src/app/wallet/wallet-result-modal.tsx");
  const COPY = read("src/lib/wallet/result-copy.ts");
  ok("5.2 · the wallet's result: moving and in-review are ROYAL (`info`), Completed success, Failed danger, Reversed/Cancelled SLATE (§B11 item 5, §C4)",
    /walletResultCopy\(t, \{ isWithdraw: !!withdrawal, status, depositKind \}\)/.test(WRM)
      && /variant=\{variant\}/.test(WRM)
      && /kind === "review"[\s\S]*?variant: "info"/.test(COPY)
      && /kind === "held"[\s\S]*?variant: "neutral"/.test(COPY)
      && /const variant: WalletResultTone = notDone \? \(status === "FAILED" \? "danger" : "neutral"\) : \(amlHeld \|\| pending \? "info" : "success"\);/.test(COPY)
      && !/"warning"/.test(WRM) && !/"warning"/.test(COPY));
  ok("5.2′ · the result modal has a slate `neutral` (the subtle ring, no auto-close)", /neutral: \{\s*\.\.\.crest\("var\(--text-subtle\)", "var\(--text-muted\)"\)/.test(read("src/components/markets/operation-result-modal.tsx")));
  ok("5.2″ · 'under review' (source of funds) is royal, a hidden comment slate, a paused agent slate, a running break neutral",
    /: "pending";/.test(read("src/app/profile/source-of-funds/page.tsx")) && /<Chip variant="neutral" size="sm">\{t\.market\.commentHidden\}/.test(read("src/components/markets/comments-thread.tsx"))
      && /playerStatusChip\("DEACTIVATED"\)/.test(read("src/app/profile/invite/agent-dashboard.tsx")) && !/COOLED_OFF" \? "warning"/.test(read("src/app/profile/account/page.tsx")));
  const kycGate = read("src/components/kyc/kyc-gate-panel.tsx");
  const amberAction = (src: string) => /action:\s*\{ ring: "border-warning-border", ink: "text-warning-fg", plate: "warning" \}/.test(src)
    && /<IconPlate[^>]*variant=\{tone\.plate\}/.test(src)
    && /border-warning-border bg-warning-bg p-4 lg:p-5/.test(read("src/app/profile/kyc/page.tsx"));
  ok("5.2‴ · 'more information needed' and the KYC gate's 'your move' are AMBER — the warning family, never the gold ramp (§B11)", amberAction(kycGate));
  const goldAction = kycGate.replace('ink: "text-warning-fg", plate: "warning"', 'ink: "text-warning-fg", plate: "gold"');
  ok("5.2⁗ PLANT · turning the KYC action plate gold fails", goldAction !== kycGate && !amberAction(goldAction));

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
  ok("6.2 · bet and sell commits restore their named gold treatment (§M3a)", /btn btn-gold btn-lg w-full/.test(read("src/components/markets/bet-confirm-modal.tsx")) && /btn btn-gold btn-lg w-full/.test(read("src/components/markets/sell-confirm-modal.tsx")));
  ok("6.3 · Deposit doors restore gilt in both headers and Wallet sheet (§M3a)", /btn gilt-metal btn-md btn-pill/.test(read("src/components/layout/top-app-bar.tsx")) && /btn gilt-metal btn-md btn-pill kp-jhdr__pill/.test(read("src/components/journey/journey-top-bar.tsx")) && /btn gilt-metal btn-lg kp-wsheet__act/.test(read("src/components/layout/wallet-sheet.tsx")));
  ok("6.4 · the live balance restores gold and a player's WIN retains its earned-money tone", /color:\s*var\(--gold-300\)/.test(rule(CSS, ".kp-jbal__fig")) && /WIN:\s*\{ player: "gilt" \}/.test(read("src/lib/status-tone.ts")));
  ok("6.5 · the earned bonus medallion and P&L reference retain gold; Up & Down's opening reference restores gilt",
    /tone = "gold",/.test(read("src/components/brand/reward-burst.tsx"))
    && /stroke="var\(--gilt\)"/.test(read("src/components/charts/pnl-chart.tsx"))
    && /stroke="var\(--gilt\)"/.test(read("src/components/updown/price-hero.tsx")));
  ok("6.6 · the gilt material still exists for money (`.gilt-metal`, `.gilt-ink`)", /\.gilt-metal\s*\{/.test(MOTION) && /\.gilt-ink\s*\{/.test(MOTION));
}

/* ══ §7 · THE OWNER'S ITEMS, PINNED AS THEY STAND ═════════════════════════════════════════════════════════════════════ */
section("7 · the owner's items, pinned as they stand — shared player chrome, the token, the hashed legal texts");
{
  // R8-A (2026-10-10): the owner re-hued it — Ali's ruling (1), "warnings are amber, not gold". `test:visual-pass-r8a` §1
  // holds the family's values, hue and contrast; this pin holds only that the gilt alias is gone for good.
  ok("7.1 · RULED (Ali, 2026-10-10) · `--warning-fg` is the amber, never `var(--gilt)` — F3's token re-hued, the owner item closed",
    /--warning-fg:\s*oklch\(82% 0\.13 64\);/.test(CSS) && !/--warning-fg:\s*var\(--gilt\)/.test(CSS));
  // ⭐ FLIPPED BY THE OWNER, 2026-10-23 (Ali: "please remove the golden dot, make it like other tabs please"; DESIGN_AUTHORITY
  // §K 3, "Every nav tab alike"): the restored gilt dots are gone from both — `test:nav-tabs-alike` reads the drawn bars.
  ok("7.2 · RULED (Ali, 2026-10-23) · no product-line dot in the nav or the rail — every nav tab alike, no destination's own gold",
    !/background: "var\(--gilt\)"/.test(read("src/components/layout/top-app-bar.tsx")) && rule(CSS, ".kp-rail__dot") === "" && !/kp-rail__dot/.test(read("src/components/layout/bottom-nav.tsx")));
  ok("7.3 · classic bells and language tick restore gilt, while Journey and staff identity stay brand",
    /const unreadDot = journey \? "brand" : "gold";\s*const unreadWash = journey \? "bg-brand-500\/\[0\.04\]" : "bg-gold-500\/\[0\.04\]";/.test(read("src/components/layout/notifications-panel.tsx"))
      && /const tickInk = journey \? "var\(--brand-300\)" : "var\(--gilt\)";/.test(read("src/components/ui/language-menu.tsx"))
      && /className="text-brand-300\/70 transition-colors group-hover:text-brand-300"/.test(read("src/components/layout/avatar-menu.tsx")));
  ok("7.4 · the session-ended notice is the warning family (the player must sign in again — §B11) — amber, not gilt, since Ali's ruling (1) of 2026-10-10", /tone="warning"\s*glyph="alertCircle"\s*testId="session-ended-notice"/.test(read("src/components/layout/app-shell.tsx")));
  ok("7.5 · OWNER · the legal RG links are gold and HASHED (RG_EN_SHA, TERMS_TEXT_SHA): the recolour ships with a new version",
    /text-gold-300 hover:text-gold-200/.test(read("src/app/legal/responsible-gambling/page.tsx")) && /text-gold-300 hover:text-gold-200/.test(read("src/app/legal/terms/page.tsx")));
  ok("7.6 · the regulator-letter frame's corners are claret (§B4), not gilt", (read("src/app/legal/_components.tsx").match(/ink="var\(--claret-400\)"/g) ?? []).length === 2);
  // 7.7 · the "coming soon" tag renders in the classic header, rail and avatar menu and in page bodies.
  // Its classic base restores the older house accent; page body and Journey stay neutral.
  const csBase = rule(CSS, ".cs-badge");
  const csScoped = /#main-content \.cs-badge,\s*:root:is\(\[data-shell="journey"\], #kp-journey-shell\) \.cs-badge\s*\{\s*background:\s*var\(--bg-inset\);\s*border-color:\s*var\(--border\);\s*\}/.test(CSS);
  ok("7.7 · the classic coming-soon flag restores warm gold; page bodies and Journey stay neutral",
    /var\(--gold-500\) 9%/.test(csBase) && /var\(--gold-500\) 22%/.test(csBase) && csScoped);
}

console.log(`\nvisual-pass-r5c: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
