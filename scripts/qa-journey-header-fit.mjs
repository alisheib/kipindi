/**
 * `qa:journey-header-fit` — DOES THE JOURNEY HEADER KEEP THE S4 RULES, AND FIT, AT EVERY WIDTH AND IN EVERY LANGUAGE?
 * (the Vodacom plan S6, `S6-PLAN.md` WP6b step 6 as amended by A5; S6's done-when "the header fits at 320/360/390/1024/
 * 1150/1279 × sw/en/zh × guest/signed-in").
 *
 *   KP_BASE=http://localhost:3041 npm run qa:journey-header-fit          (KP_ROUTE=/markets to measure another page)
 *
 * Through a real staff preview pass (`live/journey-pass.mjs`), per cell (`live/journey-header-fit.mjs`, the module its
 * red twin imports too):
 *   · the RULE probe — every S4 fit rule read as a computed value against its FIXED token: the gutter, the gaps, the
 *     home link's borrowed 9px, the "+", the pill's padding, the figure's size, the guest pills, the bar's 56px, the
 *     mark and the lockup. `red:journey-header-fit` proves each rule it mutates can fail here. A rule is asked only
 *     where its element is drawn: on the deposit screen and its return the header draws no pill, so a KP_ROUTE there
 *     skips the pill's rules rather than failing them.
 *   · the FIT probes — `live/clip.mjs`'s own rule over the header (no control past the edge), the row's and the bar's
 *     overflow, and the GUTTER SLACK: the px the rightmost control keeps before the row's right padding. ⭐ Slack is
 *     RECORDED, never a threshold (A5): it is the per-cell number VODACOM-PLAN §0i keeps.
 *   · below 1024, the journey rail's labels — none cut, and the lines each takes. A17 modelled "Tiketi zangu" on two
 *     lines below 360 and every label on one from 360; this is the measurement §0h point 18 is owed.
 * Cells: 320 · 360 · 390 · 768 · 1024 · 1150 · 1279 × sw · en · zh for a pass-holding guest and a player at TZS 999,999
 * (the widest figure a wallet shows: `formatBalancePill` compacts from TZS 1,000,000), plus at 320 and 1024 the widest
 * compact figure (TZS 9.9M), TZS 0, a held wallet and hidden balances — 66 cells.
 *
 * ⛔ REFUSES anything but `http://localhost:PORT` on an IN-MEMORY dev server (no DATABASE_URL) whose rollout a pass can
 * see. Start it after `rm -rf .next` (a stale build 404s the dev-test routes), with DISABLE_ADMIN_TOTP=true (the preview
 * door asks staff for the two-step check otherwise). It seeds a SUPPORT officer, mints a pass and moves the one demo
 * player's wallet, so never point it at a server another drive is using. It writes no file.
 */
import { chromium } from "playwright";
import { premise, mintStaffPass } from "./live/journey-pass.mjs";
import { STATES, JHF_LOCALES, cookiesFor, measureState } from "./live/journey-header-fit.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
const ROUTE = process.env.KP_ROUTE ?? "/";
const NL = String.fromCharCode(10);

const { refuse } = await premise(BASE);
if (refuse) {
  console.error(`REFUSED — ${refuse}`);
  process.exit(2);
}

const results = [];
const ok = (name, pass, detail = "") => {
  results.push(!!pass);
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const msg = (e) => String(e?.message ?? e).split(NL)[0].slice(0, 240);
const listOf = (items) => (items.length ? `${items.length}: ${items.slice(0, 6).join(" · ")}${items.length > 6 ? " …" : ""}` : "");

console.log(`qa:journey-header-fit — ${BASE}${ROUTE}`);
const expected = STATES.reduce((n, s) => n + s.widths.length * JHF_LOCALES.length, 0);
const cells = [];
const browser = await chromium.launch({ headless: true });
try {
  console.log(`${NL}§0 · a staff preview pass`);
  let pass = null;
  try {
    pass = await mintStaffPass(browser, BASE);
    ok("0.1 a SUPPORT officer turned their preview on, and the pass is in hand", true);
  } catch (e) {
    ok("0.1 a SUPPORT officer turned their preview on", false, msg(e));
  }
  if (pass) {
    for (const state of STATES) {
      console.log(`${NL}§1 · ${state.what}`);
      let cookies = null;
      try {
        cookies = await cookiesFor(browser, BASE, state, pass);
      } catch (e) {
        ok(`1.${state.id} the state is set up`, false, msg(e));
        continue;
      }
      for (const locale of JHF_LOCALES) {
        try {
          const got = await measureState(browser, BASE, state, locale, cookies, { route: ROUTE, fit: true });
          cells.push(...got);
          for (const c of got) {
            const rail = (c.rail ?? []).map((l) => `${l.text}/${l.lines}${l.cut ? " CUT" : ""}`).join(" ");
            const fit = c.fit ? `slack ${c.fit.slack}px (${c.fit.rightmost || "?"})` : "no header";
            const flags = [
              c.violations.length ? `${c.violations.length} rule(s) broken` : "rules ok",
              c.clipped.length ? `${c.clipped.length} clipped` : "",
              c.fit && (c.fit.rowOverflow > 0 || c.fit.barOverflow > 0) ? `overflow row ${c.fit.rowOverflow} bar ${c.fit.barOverflow}` : "",
            ].filter(Boolean).join(" · ");
            console.log(`  ${locale} ${String(c.width).padStart(4)} ${state.id} — ${fit} · ${flags}${rail ? ` · rail ${rail}` : ""}`);
          }
        } catch (e) {
          ok(`1.${state.id}.${locale} the cells were measured`, false, msg(e));
        }
      }
    }
  }
} finally {
  await browser.close();
}

const where = (c) => `${c.locale} ${c.width} ${c.state}`;
console.log(`${NL}§2 · the verdict`);
ok(`2.0 every cell was measured (${cells.length} of ${expected})`, cells.length === expected);
const broken = cells.flatMap((c) => c.violations.map((v) => `${where(c)}: ${v.text}`));
ok("2.1 every S4 rule holds in every cell — the RULE probe, against fixed tokens (A5)", broken.length === 0, listOf(broken));
const clipped = cells.flatMap((c) => (c.clipped ?? []).map((x) => `${where(c)}: ${x}`));
ok("2.2 no header control is clipped in any cell — live/clip.mjs's rule", clipped.length === 0, listOf(clipped));
const overflow = cells.filter((c) => c.fit && (c.fit.rowOverflow > 0 || c.fit.barOverflow > 0))
  .map((c) => `${where(c)}: row ${c.fit.rowOverflow} bar ${c.fit.barOverflow}`);
ok("2.3 neither the header row nor the bar overflows in any cell", overflow.length === 0, listOf(overflow));
const cut = cells.flatMap((c) => (c.rail ?? []).filter((l) => l.cut || l.offscreen).map((l) => `${where(c)}: ${l.text}`));
ok("2.4 no journey tab label is cut or pushed off the screen below 1024 (A17)", cut.length === 0, listOf(cut));

console.log(`${NL}§R · recorded, not judged — the gutter slack (px) by state and language, across its widths`);
for (const state of STATES) {
  for (const locale of JHF_LOCALES) {
    const row = cells.filter((c) => c.state === state.id && c.locale === locale && c.fit);
    if (row.length) console.log(`  ${state.id.padEnd(14)} ${locale} · ${row.map((c) => `${c.width}:${c.fit.slack}`).join("  ")}`);
  }
}
const measured = cells.filter((c) => c.fit);
if (measured.length) {
  const least = measured.reduce((a, b) => (b.fit.slack < a.fit.slack ? b : a));
  console.log(`  least slack: ${least.fit.slack}px at ${where(least)} (rightmost: ${least.fit.rightmost || "?"})`);
}
const twoLine = cells.flatMap((c) => (c.rail ?? []).filter((l) => l.lines > 1).map((l) => `${where(c)}: ${l.text} (${l.lines} lines)`));
console.log(`  rail labels on more than one line: ${twoLine.length ? twoLine.join(" · ") : "none"}`);

const failed = results.filter((r) => !r).length;
console.log(`${NL}${results.length - failed}/${results.length} passed — qa:journey-header-fit · ${cells.length} cells`);
process.exit(failed ? 1 : 0);
