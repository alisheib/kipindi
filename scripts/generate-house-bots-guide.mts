/**
 * Build `docs/house-bots-desk-guide.html` — the desk's admin guide — FROM THE PRODUCT'S OWN METADATA.
 *
 * ⛔ THE SETTINGS TABLE IS GENERATED, NOT WRITTEN. Every row's label, unit, range, default and recommended value
 * comes from `FIELD_META`, and every explanation comes from `CONSOLE_RULE_HELP` — the same sentence the officer
 * reads under that box on the screen. A printed guide that disagrees with the screen is worse than no guide, and
 * twenty-nine sentences copied by hand disagree within one edit.
 *
 * ⛔ IT REFUSES RATHER THAN SHIPS A GAP: a rules field with no explanation, or a section with no fields, stops
 * the build. A guide that quietly omits the one setting an officer needed is the failure this check exists for.
 *
 * The narrative sections — what the desk is, the order of operations, what each status means, why an account is
 * not betting — are written here, because they describe a FLOW rather than a field.
 *
 * Run: npm run docs:house-bots-guide      (then `node scripts/generate-pdfs.mjs` for the PDF)
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIELD_META, FIELD_ORDER, RULE_NUMBER_FIELDS, DEFAULT_RULES_V1, unitSuffix,
  type FieldId,
} from "../src/lib/house-bot/rules.ts";
import { CONSOLE_RULE_HELP } from "../src/lib/server/house-console-read.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A figure wearing its field's own face — "TZS 5,000", "30 seconds", "25%". */
function faced(id: FieldId, v: number | "LIVE_MIN" | null): string {
  if (v == null) return "—";
  if (v === "LIVE_MIN") return "the platform's own minimum stake";
  const u = FIELD_META[id].unit;
  if (u === "TZS") return `TZS ${v.toLocaleString("en-GB")}`;
  if (u === "%") return `${v}%`;
  return `${v.toLocaleString("en-GB")} ${unitSuffix(u, v)}`;
}

/* The numeric rule leaves, in the console's own order, grouped by the console's own section. */
const ids = FIELD_ORDER.filter((id) => RULE_NUMBER_FIELDS.includes(id));
const missing = ids.filter((id) => !CONSOLE_RULE_HELP[id] || CONSOLE_RULE_HELP[id].trim() === "");
if (missing.length > 0) {
  console.error(`REFUSING — ${missing.length} rule field(s) have no explanation, so the guide would ship a gap:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

const sections = new Map<string, FieldId[]>();
for (const id of ids) {
  const s = FIELD_META[id].section;
  if (!sections.has(s)) sections.set(s, []);
  sections.get(s)!.push(id);
}
if (sections.size === 0) { console.error("REFUSING — no rule sections found"); process.exit(1); }

const settingsTables = [...sections.entries()].map(([section, fieldIds]) => `
<h3>${esc(section)}</h3>
<table>
  <thead><tr><th style="width:26%">Setting</th><th style="width:48%">What it means</th><th style="width:13%">Allowed</th><th style="width:13%">We recommend</th></tr></thead>
  <tbody>
${fieldIds.map((id) => {
  const m = FIELD_META[id];
  const range = m.min == null || m.max == null
    ? "—"
    : `${typeof m.min === "number" ? faced(id, m.min) : "platform minimum"} to ${typeof m.max === "number" ? faced(id, m.max) : "platform maximum"}`;
  /* ⛔ "—" IS NOT AN ANSWER. A field with no recommendation still has a right thing to do, and for a nullable
     one that is to leave it empty — the very mistake that killed every Counter on the live desk was a 0 typed
     into a box whose correct state was blank. Say it. */
  const rec = m.recommended != null ? faced(id, m.recommended)
    : m.default != null ? `${faced(id, m.default)} <span class="q">(default)</span>`
    : m.nullable ? `Leave empty <span class="q">(no limit)</span>`
    : "—";
  return `    <tr><td><b>${esc(m.label)}</b></td><td>${esc(CONSOLE_RULE_HELP[id])}</td><td>${range}</td><td>${rec}</td></tr>`;
}).join("\n")}
  </tbody>
</table>`).join("\n");

const d = DEFAULT_RULES_V1;
const generatedNote = `Generated from the console's own field list — ${ids.length} settings across ${sections.size} groups.`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>50pick · House Desk — Admin Guide</title>
<style>
  /* Self-contained: no web fonts, no network. A PDF must render identically offline. */
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; font-size: 9.8pt; line-height: 1.42; color: #16233d; margin: 0; }
  h1 { font-size: 21pt; margin: 0 0 1mm; letter-spacing: -0.4pt; }
  h2 { font-size: 12.5pt; margin: 6mm 0 2.2mm; padding-bottom: 1.2mm; border-bottom: 1.1pt solid #1e3a8a; color: #1e3a8a; page-break-after: avoid; }
  h3 { font-size: 10.2pt; margin: 4mm 0 1.2mm; page-break-after: avoid; color: #1e3a8a; }
  p { margin: 0 0 1.9mm; }
  ul, ol { margin: 0 0 2.2mm; padding-left: 5.2mm; }
  li { margin-bottom: 0.9mm; }
  .sub { color: #5a6577; font-size: 9.4pt; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; page-break-inside: avoid; }
  th, td { text-align: left; vertical-align: top; padding: 1.5mm 2mm; border-bottom: 0.5pt solid #ccd5e6; }
  th { background: #eef2fb; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.3pt; color: #1e3a8a; }
  td { font-size: 9.1pt; }
  .q { color: #6b7688; }
  .box { border: 0.7pt solid #1e3a8a; background: #f5f8ff; padding: 2.3mm 2.8mm; margin: 0 0 3mm; border-radius: 1.2mm; page-break-inside: avoid; }
  .warn { border-color: #a2600a; background: #fdf6e9; }
  .stop { border-color: #9b1c2e; background: #fdf0f1; }
  .good { border-color: #146c43; background: #eef8f2; }
  .box p:last-child { margin-bottom: 0; }
  .box b.lead { display: block; margin-bottom: 0.8mm; }
  footer { margin-top: 5mm; padding-top: 1.6mm; border-top: 0.5pt solid #ccd5e6; font-size: 8.4pt; color: #6b7688; }
  .pb { page-break-before: always; }
  .steps { counter-reset: r; }
  .steps > div { position: relative; padding: 1.9mm 2.6mm 1.9mm 8.4mm; margin-bottom: 1.6mm; border: 0.5pt solid #ccd5e6; border-radius: 1.2mm; background: #fbfcff; page-break-inside: avoid; font-size: 9.2pt; }
  .steps > div::before { counter-increment: r; content: counter(r); position: absolute; left: 2.4mm; top: 1.9mm; width: 4.4mm; height: 4.4mm; border-radius: 50%; background: #1e3a8a; color: #fff; font-size: 7.6pt; line-height: 4.4mm; text-align: center; font-weight: 700; }
  .steps b { color: #1e3a8a; }
</style>
</head>
<body>

<h1>The House Desk</h1>
<p class="sub">A guide for admins · 50pick</p>

<p>The desk lets the house take part in its own markets from ordinary player accounts, under limits you set. This
guide explains what every control does, what to set it to, and what to check when an account is not betting.</p>

<div class="box"><b class="lead">The one rule that matters most</b>
<p>An account only bets when <b>every</b> condition is satisfied at once: the master switch is on, the account is
Active, its limits are filled in, it has money, and its rules point at markets that actually exist. If any one of
those is missing, it stays silent — and that is by design.</p></div>

<h2>1 · Getting an account betting</h2>
<p>Do these in order. Each step is a screen on the desk.</p>

<div class="steps">
  <div><b>Designate an account.</b> Pick an existing player account the desk will stake from, and confirm you have
    the holder's permission. The desk never creates accounts of its own.</div>
  <div><b>Fill in the money limits.</b> On the <b>Limits</b> tab. Every limit must have a number — an empty limit
    is treated as "refuse", not as "no limit", so a blank box stops the account betting.</div>
  <div><b>Choose the markets.</b> On the <b>Rules</b> tab, under Markets: tick <b>Up &amp; Down</b> and/or
    <b>Polls</b>, then tick at least one <b>chain</b> or <b>category</b> underneath. Ticking a product without
    ticking anything under it reaches no market at all.</div>
  <div><b>Choose how it enters.</b> Tick at least one of Counter, Fill or Opener for each product you enabled.
    These are explained in section 2.</div>
  <div><b>Press Save.</b> Nothing on the Rules tab saves by itself.</div>
  <div><b>Press Start.</b> Read the sentence it answers with — if the account still cannot bet, it says why.</div>
  <div><b>Turn the master switch on.</b> Until it is on, nothing is staked by any account.</div>
</div>

<div class="box warn"><b class="lead">Ticking a product is not enough</b>
<p>Up &amp; Down on with no chain ticked, or Polls on with no category ticked, reaches nothing. The desk will look
completely healthy — Active, funded, limits set — and never place a bet. Always tick something underneath.</p></div>

<h2>2 · The three ways an account enters a market</h2>
<table>
  <thead><tr><th style="width:18%">Mode</th><th>What it does</th><th style="width:34%">When it is useful</th></tr></thead>
  <tbody>
    <tr><td><b>Counter</b></td><td>Answers a player's stake by taking the other side of the same market, a short
      while after they bet.</td><td>Keeps both sides of a market moving once players are already betting.</td></tr>
    <tr><td><b>Fill</b></td><td>Evens up a thin side shortly before a market closes.</td><td>Stops a market
      finishing badly one-sided.</td></tr>
    <tr><td><b>Opener</b></td><td>Places the first bet on a market nobody has bet on yet.</td><td>Gives players
      something to join. This is the only mode that acts on an empty market.</td></tr>
  </tbody>
</table>

<div class="box"><b class="lead">If nothing is happening, check Opener first</b>
<p>Counter and Fill both need players to have bet already — on a quiet market they correctly do nothing. Opener is
the mode that starts things off, so an empty desk with only Counter and Fill enabled is working exactly as told.</p></div>

<h2>3 · What each status means</h2>
<table>
  <thead><tr><th style="width:22%">Status</th><th>Meaning</th><th style="width:34%">What to do</th></tr></thead>
  <tbody>
    <tr><td><b>Active</b></td><td>Started and allowed to bet, subject to the master switch and its limits.</td>
      <td>Nothing. If it is not betting, see section 5.</td></tr>
    <tr><td><b>Paused</b></td><td>An officer stopped it. It keeps its settings.</td><td>Press Start when you want
      it back.</td></tr>
    <tr><td><b>Auto-paused</b></td><td>The platform stopped it for a reason it will name — most often the holder
      changed their password, which withdraws their consent.</td><td>Read the reason on the account, put it right,
      then re-verify and Start.</td></tr>
    <tr><td><b>Removed</b></td><td>Taken off the desk. Its record stays for the audit trail.</td><td>Designate it
      again if you need it back.</td></tr>
  </tbody>
</table>

<h2 class="pb">4 · Every setting, and what to set it to</h2>
<p>These are on the <b>Rules</b> tab. Each one also shows this explanation, its allowed range and its recommended
value on screen, under the box. <b>Use starting values</b> fills every empty box with the recommended figure at
once; it does not save by itself.</p>
<p class="sub">${esc(generatedNote)}</p>
${settingsTables}

<h2 class="pb">5 · An account is Active but not betting</h2>
<p>Work down this list. The account's own row on the roster, and the panel beside the Rules form, will usually
name the reason for you.</p>
<table>
  <thead><tr><th style="width:38%">Check</th><th>Why it stops the account</th></tr></thead>
  <tbody>
    <tr><td><b>Is the master switch on?</b></td><td>With it off, nothing is staked by any account, however healthy
      each one looks.</td></tr>
    <tr><td><b>Is a chain or category ticked?</b></td><td>A ticked product with nothing ticked underneath reaches
      no market at all. This is the most common cause.</td></tr>
    <tr><td><b>Is at least one entry mode on?</b></td><td>With none of Counter, Fill or Opener ticked, the account
      has no way to enter a market.</td></tr>
    <tr><td><b>Is every money limit filled in?</b></td><td>A limit left empty is treated as "refuse". Blank boxes
      stop bets rather than allowing them.</td></tr>
    <tr><td><b>Does the account hold enough money?</b></td><td>Its balance must stay above the balance floor after
      the stake, or the bet is refused.</td></tr>
    <tr><td><b>Is a pool ceiling set to 0?</b></td><td>A pool maximum of 0 means "only bet when the pool holds
      nothing", which a Counter can never see. Leave it empty for no ceiling.</td></tr>
    <tr><td><b>Is it inside its schedule?</b></td><td>Outside the days and hours you chose, it waits.</td></tr>
    <tr><td><b>Has it already hit a limit today?</b></td><td>Its row shows what it has used of each limit. Once a
      cap is reached it stops until the cap resets.</td></tr>
    <tr><td><b>Are there markets open at all?</b></td><td>Up &amp; Down chains must be running, and only Opener
      acts on a market with no bets yet.</td></tr>
  </tbody>
</table>

<h2>6 · Money limits</h2>
<p>On the <b>Limits</b> tab, at two levels: limits on one account, and desk-wide limits that no account may exceed
between them. The tighter of the two always wins.</p>
<div class="box stop"><b class="lead">An empty limit refuses; it does not permit</b>
<p>Leaving a money limit blank does not mean "no limit" — the desk treats an unset limit as a reason to refuse the
bet. Fill every one in. This is deliberate: a limit nobody set should never be a limit nobody has.</p></div>

<h2>7 · The master switch</h2>
<p>One switch governs the whole desk. Turning it off stops every account immediately; bets already placed stand and
settle normally. Turning it on or off is recorded with who did it and why.</p>
<div class="box good"><b class="lead">Safe to use</b>
<p>Turning the switch off is the safest thing you can do if anything looks wrong. It stops new bets at once and
changes nothing that has already happened.</p></div>

<footer>50pick · House Desk — Admin Guide. The settings table is generated from the console's own field list, so it
cannot disagree with the screen. If this guide and the screen ever differ, the screen is correct.</footer>

</body>
</html>
`;

const out = resolve(root, "docs/house-bots-desk-guide.html");
writeFileSync(out, html, "utf8");
console.log(`▸ docs/house-bots-desk-guide.html — ${ids.length} settings across ${sections.size} groups`);
for (const [s, f] of sections) console.log(`    ${s}: ${f.length}`);
void d;
