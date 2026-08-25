/**
 * THE SHARE CONTROL ON A MARKET CARD — tiny, named, and it must not move the card.
 *
 * Ali, 2026-08-25: *"we need on each market card a tiny share icon, not very bulky, just
 * make the shape somewhere next to details or top right — you act as graphical and visuals
 * engineer and choose what's best."*
 *
 * ⭐ THE FOOTER, NOT THE TOP-RIGHT, and the reason is that the top-right is already
 * occupied: it carries the conviction readout (`YES 0%`) on a live card and the resolved
 * mark on a settled one. The footer is the card's action zone and already holds `Details`.
 *
 * 🔴 THE CONSTRAINT THAT SHAPES EVERYTHING HERE. The footer row **paints 17px and must keep
 * painting 17px**: `MARKET_CARD_H` (349, `card-geometry.ts`) is DERIVED from it and BOTH
 * `/markets` skeletons consume that number, so a control that raises the row re-derives card
 * geometry on `/markets`, `/live`, `/watchlist` and the landing at once. That is why the
 * trigger is a 13px glyph with no label, and why its 40px tap reach comes from an
 * out-of-flow pseudo-element — grow the TARGET, not the box.
 *
 * ⚠️ AND WHY A `compact` PROP RATHER THAN A SECOND COMPONENT. `E-196` is what the other
 * outcome looks like: one control with two implementations, where the defect lives in the
 * copy nobody is editing and the first two repairs miss it entirely. Everything below the
 * trigger — WhatsApp, the native sheet, the clipboard fallback, the `?ref=` referral and the
 * OG preview — is shared verbatim.
 *
 * ⛔ A BOUNDING-BOX MEASUREMENT CANNOT SEE THE TAP REACH — drivers correctly report 17px.
 * That half is provable only by `elementFromPoint`, and by `npm run qa:card-geometry`, which
 * diffs every card box and the document height before and after.
 *
 * Run: npm run test:card-share
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const card = decomment(readFileSync(join(ROOT, "src/components/markets/market-card.tsx"), "utf8"));
const share = decomment(readFileSync(join(ROOT, "src/components/markets/share-button.tsx"), "utf8"));
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

// ── 1 · It exists, on the card, beside Details ──────────────────────────────
{
  ok("1: the card renders a share control", /<ShareButton\b/.test(card));
  ok("1: …in its COMPACT variant", /<ShareButton compact\b/.test(card));
  ok("1: …carrying the market it shares", /<ShareButton compact marketId=\{id\} title=\{title\}/.test(card));
  // Beside Details, in one right-aligned row.
  ok("1: it sits in the footer row with Details, right-aligned",
     /flex items-center justify-end gap-2[\s\S]{0,200}?<ShareButton[\s\S]{0,400}?mcardp-details/.test(card));
}

// ── 2 · ⭐ ONE IMPLEMENTATION — the E-196 rule ──────────────────────────────
{
  ok("2: the card imports the SHARED control, not a local copy",
     /import \{ ShareButton \} from "@\/components\/markets\/share-button"/.test(card));
  // ⛔ The share MECHANICS must live in exactly one file. If a second file learns to build a
  // wa.me link, the copy nobody is editing is where the next defect lives.
  const { readdirSync, statSync } = await import("node:fs");
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) { if (e !== "node_modules" && e !== ".next") walk(p); }
      else if (e.endsWith(".tsx") || e.endsWith(".ts")) files.push(p);
    }
  };
  walk(join(ROOT, "src"));
  // ⚠️ THE POPULATION IS *MARKET* SHARING, NOT ALL SHARING. A first draft asserted "exactly
  // one file builds a WhatsApp link" and named three — but `invite-client.tsx` shares a
  // referral CODE and `position-share.tsx` shares a POSITION. Those are different things
  // that happen to use the same channel, and a rule that cannot tell them apart would have
  // forced a merge that made the product worse. Ask about the market link.
  const marketSharers = files.filter((f) => {
    const src = decomment(readFileSync(f, "utf8"));
    return /wa\.me\/\?text=/.test(src) && /markets\/\$\{marketId\}/.test(src);
  }).map((f) => f.replace(ROOT, "").split("\\").join("/"));
  // ⚠️ AND EVEN THAT WAS TOO BROAD — the second draft named two, because `position-share.tsx`
  // shares a WIN RECEIPT ("I won on this market") rather than the market itself. Three
  // features can legitimately reach the same channel. ⭐ What this rule actually protects is
  // narrower and is the whole of E-196: **the CARD must not grow share mechanics of its
  // own.** So assert that, not a headcount.
  ok("2: the market-share dialog lives in share-button.tsx", marketSharers.includes("/src/components/markets/share-button.tsx"), marketSharers.join(", "));
  ok("2: ⭐ the CARD builds no share link, no clipboard write and no native sheet — it delegates",
     !/wa\.me/.test(card) && !/clipboard\.writeText/.test(card) && !/navigator[\s\S]{0,20}\.share/.test(card));
}

// ── 3 · The trigger cannot raise the 17px row ───────────────────────────────
{
  ok("3: the compact trigger takes the `.mcardp-share` class", /compact[\s\S]{0,40}?"mcardp-share"/.test(share));
  // ⛔ NO LABEL. A word in that row raises it, and the row's height is a published constant.
  ok("3: ⛔ the compact variant renders no text label", /\{!compact && \(copied \? t\.common\.copied : t\.common\.share\)\}/.test(share));
  // The glyph is 13px — inside the existing line box.
  ok("3: the glyph is 13px, which fits the row as it is", /<I\.share s=\{13\}/.test(share));

  const rule = css.slice(css.indexOf(".mcardp-share {"), css.indexOf(".mcardp-share::after"));
  ok("3: ⛔ `.mcardp-share` sets no height that could raise the row",
     !/\bheight\s*:/.test(rule) && !/\bpadding\s*:/.test(rule) && !/\bmin-height\s*:/.test(rule), rule.slice(0, 160));
}

// ── 4 · The 40px reach, and that it does not steal the neighbour's clicks ───
{
  const after = css.slice(css.indexOf(".mcardp-share::after"), css.indexOf(".mcardp-share::after") + 260);
  ok("4: the reach is an OUT-OF-FLOW pseudo-element — the target grows, the box does not",
     /position:\s*absolute/.test(after), after.slice(0, 120));
  ok("4: …reaching above and below the row", /top:\s*-9px/.test(after) && /bottom:\s*-14px/.test(after));
  // ⛔ It must NOT span the whole row. `.mcardp-details::after` is `left:0; right:0` of its
  // OWN box; once both are flex children those boxes sit side by side. A full-width overlay
  // here would sit over Details — the exact failure `.mcardp-info` is called out for.
  ok("4: ⛔ it does not span the row and swallow Details' clicks",
     !/left:\s*0;\s*\n?\s*right:\s*0;/.test(after), after.slice(0, 160));
}

// ── 5 · Named, and it does not navigate the card out from under itself ─────
{
  // An icon-only trigger MUST be named, in all three locales.
  ok("5: the trigger is named from the dict", /aria-label=\{t\.dialog\.shareMarket\}/.test(share));
  ok("5: …and announces that it opens a dialog", /aria-haspopup="dialog"/.test(share));
  // 🔴 The whole CARD is a click target. Without stopPropagation every share tap navigates
  // to the market and the dialog is never seen.
  ok("5: 🔴 the trigger stops the card's own click", /e\.stopPropagation\(\);\s*setOpen\(true\)/.test(share));
}

console.log(`\ncard-share: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
