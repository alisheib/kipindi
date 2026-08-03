/**
 * Build the visual pack — a contact sheet of everything a live run photographed.
 *
 *   node scripts/build-contact-sheet.mjs shots/RUN-2026-08-03
 *
 * Ali: *"we need my-eye visual confirmations."* A list of filenames is not that. This emits
 * one local HTML page — thumbnails, captions, and what to look for — that opens straight in
 * a browser with no server and no network. `shots/` is gitignored, so the evidence stays on
 * the machine that produced it and never bloats the repo.
 */
import { readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "shots/RUN-2026-08-03";

/** What each shot is FOR. A caption that just repeats the filename teaches nothing. */
const CAPTIONS = [
  [/^E49-BEFORE/,      "🔴 E-49 BEFORE — echo's LOSING `NO` row reads PAYOUT TZS 3,740: the winner's own figure, for money it can never receive."],
  [/^E49-AFTER/,       "✅ E-49 AFTER — same row, same officer: echo now reads TZS 0; alpha's winning YES reads 3,740 · projected."],
  [/^E56-AFTER/,       "✅ E-56 — a VOIDED market. Every row now reads its STAKE with a `refund` label. Before this, one row offered 16,745 to a player getting 5,000 back."],
  [/^void-.*-4-market/, "The market page immediately after voiding — status VOIDED, outcome → VOID."],
  [/^void-.*-1-queue/,  "The resolver queue before the void: overdue markets with real money held."],
  [/^ewura-market/,     "🔴 E-54 — the EWURA poll, 8 positions and TZS 59,450 held, on a question that could not be resolved until its source published five days later."],
  [/^source-wunderground/, "🔴 E-55 — the readable substitute source. 0.0 in every hour, both days, at the airport station — while the reanalysis said 0.20/0.70 mm. Opposite answers."],
  [/^updown-admin/,     "🔴 E-58 + E-59 — void rates of 100% on running chains, and a control cluster with Edit/Pause/Stop but NO DELETE anywhere."],
  [/^resolver-queue/,   "The resolver queue — single-admin resolution, one action seals it."],
  [/^fleet-\d+-wallet/, "A QA-fleet player's own wallet: TZS 500,000, credited through the ledger, visible in Activity."],
  [/^push-1-optin/,     "The push opt-in BEFORE — the toggle renders in its real state only once VAPID reaches the client BUNDLE (a rebuild, not a redeploy)."],
  [/^push-2-optin/,     "The push opt-in after pressing it."],
  [/^G3-board-phone/,   "⚠️ The markets board at 390px — the promo card and filters consume the entire first screen, so NO market is visible without scrolling."],
  [/^G3-updown-phone/,  "⚠️ Up & Down at 390px — live prices and the last-rounds strip read well, but the round card's UP/DOWN action sits below the fold."],
  [/^G3-/,              "G-3 player sweep — viewport shot (never fullPage), checked for horizontal overflow."],
  [/^bulkA-/,           "Leg A — the AI generation console before/after a batch run."],
];

const caption = (f) => (CAPTIONS.find(([re]) => re.test(f)) ?? [null, ""])[1];

const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const rows = files.map((f) => {
  const kb = Math.round(statSync(join(dir, f)).size / 1024);
  return `<figure>
  <a href="${f}" target="_blank"><img src="${f}" alt="${f}" loading="lazy"></a>
  <figcaption><b>${f}</b> <span class="kb">${kb} KB</span><p>${caption(f)}</p></figcaption>
</figure>`;
}).join("\n");

writeFileSync(join(dir, "index.html"), `<!doctype html>
<meta charset="utf-8"><title>50pick — live run ${dir}</title>
<style>
  :root { color-scheme: dark; }
  body { background:#0a0e27; color:#e8ecff; font:14px/1.5 ui-sans-serif,system-ui,sans-serif; margin:0; padding:24px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:#8b93b8; margin:0 0 24px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:20px; }
  figure { margin:0; background:#141a3a; border:1px solid #232a52; border-radius:10px; overflow:hidden; }
  img { width:100%; display:block; background:#000; }
  figcaption { padding:10px 12px; font-size:12px; }
  figcaption b { font-family:ui-monospace,monospace; font-size:11px; color:#9fb0ff; word-break:break-all; }
  .kb { color:#5c648f; font-size:10px; }
  figcaption p { margin:6px 0 0; color:#c9d1f5; }
</style>
<h1>50pick — live production run</h1>
<p class="sub">${files.length} screenshots · ${dir} · click any image for full size</p>
<div class="grid">
${rows}
</div>
`);

console.log(`contact sheet → ${join(dir, "index.html")} (${files.length} shots)`);
