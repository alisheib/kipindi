/**
 * E-221 · A LINK THE PLAYER IS SHOWN MUST BE READABLE — the commit-time half.
 *
 * `npm run qa:share-link-readable` is the PROOF: it measures `scrollWidth` against
 * `clientWidth` on production and does not care how the link is rendered. This suite runs in
 * `test:all` with `DATABASE_URL` unset and pins the two mechanisms that made the defect,
 * so it cannot be reintroduced by an edit that looks like a tidy-up.
 *
 * 🔴 WHAT WAS MEASURED, at 393 on production, before anything changed: the invite page's
 * referral field held `https://50pick.tz/auth/register?ref=QAFLC8R2` at **scrollWidth 454
 * against clientWidth 255** — 44% unreachable, and the unreachable 44% was the `?ref=` code.
 * ⛔ Its wrapper carries `overflow: hidden`, so `document.scrollWidth` was 0px over budget
 * and every horizontal-overflow sweep in this campaign was honestly reporting a clean page.
 *
 * ⛔ THE ELEMENT IS THE BUG, NOT THE STYLING. A single-line `<input>` cannot wrap at any
 * class list, so §1 asserts the control is a `textarea` — *"an input field that takes
 * multiple lines"*, which is what Ali asked for and what keeps the form semantics, the focus
 * ring, the `aria-label` and keyboard selection that a `<div>` would have dropped.
 *
 * ⚠️ THE DIALOG HALF IS HARDENING, AND THIS FILE SAYS SO RATHER THAN CLAIMING A FIX. The
 * market share dialog's link line measured **NOT clipped** at 393, 768 and 1440 — it fits
 * today. `truncate` was still replaced, because a truncated link is a clipped link wearing
 * an ellipsis, and because its flex column had no `min-w-0`, which is the shape that lets an
 * unbreakable string set the column floor and push a tile past its dialog.
 *
 * Run: npm run test:share-link-readable
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const invite = decomment(readFileSync(join(ROOT, "src/app/profile/invite/invite-client.tsx"), "utf8"));
const share = decomment(readFileSync(join(ROOT, "src/components/markets/share-button.tsx"), "utf8"));

// ── 1 · The referral link is a control that CAN wrap ─────────────────────────────────
{
  ok("1: ⛔ the referral link is a <textarea>, not a single-line <input>", /<textarea/.test(invite));
  ok("1: …read-only, so it is a value to copy and never a field to edit", /readOnly/.test(invite));
  ok("1: ⛔ …and it breaks a URL, which has no spaces to wrap at", /break-all/.test(invite));
  ok("1: …it keeps the accessible name that matches the visible caption",
     /aria-label=\{label\}/.test(invite) && /label=\{t\.profile\.yourReferralLink\}/.test(invite));
  // ⭐ POSITIVE CONTROL for §1: the field must still be the thing that RENDERS the link.
  // Every assertion above is satisfied by a textarea that shows nothing at all.
  ok("1: ⭐ POSITIVE CONTROL — the control is fed the real link",
     /<LinkField value=\{link\}/.test(invite));
  // ⛔ The old single-line control must be gone, not merely joined.
  ok("1: ⛔ the single-line Input is no longer used for the link",
     !/<Input[^>]*value=\{link\}/.test(invite));
}

// ── 2 · It sizes itself, because a fixed `rows` is wrong at both ends ────────────────
// `rows={2}` shows an empty second line where the link fits on one, and clips a longer link
// on a narrower phone. The height follows the content at whatever width it is rendered.
{
  ok("2: the field starts at one row and grows from content", /rows=\{1\}/.test(invite));
  ok("2: …re-measuring on every width change, not once on mount", /ResizeObserver/.test(invite));
  // ⛔ `scrollHeight` never reports less than the current height, so a fit that does not
  // collapse first grows monotonically and never comes back.
  ok("2: ⛔ …and it collapses before measuring, or the field can only ever grow",
     /height = "0px"[\s\S]{0,120}scrollHeight/.test(invite));
  ok("2: …with its own scrollbar suppressed, since the box always fits the text",
     /overflow-hidden/.test(invite) && /resize-none/.test(invite));
}

// ── 3 · The share dialog's link line ────────────────────────────────────────────────
{
  ok("3: ⛔ the dialog's link line no longer truncates",
     !/truncate[^"]*\}\{url\.replace/.test(share) && !/text-text-subtle truncate/.test(share));
  ok("3: …it wraps instead", /text-text-subtle break-all/.test(share));
  // ⚠️ The two halves of the flex row, from both directions.
  ok("3: ⚠️ the text column may shrink below its content (min-w-0)", /<span className="min-w-0">/.test(share));
  ok("3: ⚠️ …and the 36px plate beside it may not (shrink-0)",
     /h-\[36px\] w-\[36px\] shrink-0/.test(share));
  // ⭐ POSITIVE CONTROL: the line must still render the URL.
  // ⭐ Anchored on the WRAPPING span itself, so "the line wraps" and "the line still shows the
  // URL" cannot be satisfied by two different elements.
  ok("3: ⭐ POSITIVE CONTROL — the wrapping line is the one that renders the market URL",
     /text-text-subtle break-all">\{url\.replace\(/.test(share));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
