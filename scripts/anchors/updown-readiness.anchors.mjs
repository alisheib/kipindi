/**
 * THE ANCHORS `red:updown-readiness` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ WHY A SIDECAR AND NOT A COMMENT, A MANIFEST, OR A CLEVERER AUDITOR.
 *
 * `test:red-anchors` has to answer *"does every anchor in the fleet still resolve, exactly
 * once?"* without executing anything — a harness rewrites real source, so an auditor that ran
 * one would be the mutation-in-the-tree hazard (§3.8) wearing a lab coat. That leaves three
 * shapes, and two of them are the defects this repo has already paid for:
 *
 *   · **A JSON manifest of anchors.** A list maintained by hand beside the list it describes.
 *     `docs/FAILURE-INVENTORY.md` §3.9 is that exact bug: a restore list kept next to a
 *     mutation list, which *"can only ever go stale, and it goes stale silently."*
 *   · **An auditor that parses the harness's source and guesses which array is the mutations
 *     and which key is the anchor.** It would have to know about `from`/`to`, `find`/`with`,
 *     `file` as a `URL` and `file` as a string — four shapes across 68 files — and it would
 *     report a harness it failed to understand as *clean*. A guess that fails open is worse
 *     than no check.
 *
 *   · ⭐ **ONE definition, imported by both.** The harness gets its mutations from here; the
 *     auditor gets its anchors from here. They cannot disagree, because there is nothing to
 *     disagree with. Adding a mutation adds it to the audit in the same keystroke.
 *
 * ⚠️ THIS FILE MUST HAVE NO SIDE EFFECTS. It is imported by a suite that runs inside
 * `test:all`. No `readFileSync`, no `writeFileSync`, no `execSync` — data only. The `file`
 * values are repo-relative POSIX paths, resolved by whoever imports them, so this module never
 * touches the filesystem to describe it.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string }} RedMutation */

const SYMBOLS = "src/lib/server/updown-symbols.ts";
const DURATIONS = "src/lib/updown-durations.ts";
const CONFIG = "src/lib/server/updown-config.ts";
const PAGE = "src/app/admin/updown/page.tsx";
const CONTROLS = "src/app/admin/updown/updown-controls.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  // ── ⭐ THE MEASURED PER-ASSET GATE (2026-08-05) ────────────────────────────
  // The engine existed for a session with NO caller. Every mutation below leaves it existing
  // and correct while disconnecting it, which is exactly how it shipped unused the first time.
  {
    name: "measured-block-ignored — the record says ③ and the symbol reads ready anyway",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  if (measured && measured.level === 3) return { level: 3, reason: measured.message };`,
    to: `  if (false && measured && measured.level === 3) return { level: 3, reason: measured.message };`,
  },
  {
    name: "measured-caution-dropped — the record's ② never reaches the operator",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  if (measured && measured.level === 2) caveats.push(measured.message);`,
    to: `  if (false && measured && measured.level === 2) caveats.push(measured.message);`,
  },
  {
    // ⛔ THE SHAPE THIS SESSION STARTED IN: the console greys it, the server takes it.
    // ⚠️ RE-ANCHORED 2026-08-15 — the gate grew two more axes (movement, playbook) and wrapped
    // across three lines, so from that day this mutation could not be injected at all.
    name: "server-gate-unmeasured — the console greys the pairing and the server accepts it",
    file: CONFIG,
    suite: "updown-readiness",
    from: `    asset.symbol, input.durationMinutes, measured, movement, toReadinessAdvice(playbook),`,
    to: `    asset.symbol, input.durationMinutes, undefined, movement, toReadinessAdvice(playbook),`,
  },
  {
    // Keyed on the symbol, the lookup finds nothing, reads UNMEASURED, and disarms the gate
    // while every screen still looks right. `asset.key` is OURS ("BTC"), `asset.symbol` is the
    // PROVIDER's ("BTC/USD") — "no record" renders exactly like "a clean record".
    name: "record-keyed-on-symbol — the lookup finds nothing and everything reads unmeasured",
    file: CONFIG,
    suite: "updown-readiness",
    from: `    feedAdviceFor(asset.key, input.durationMinutes),`,
    to: `    feedAdviceFor(asset.symbol, input.durationMinutes),`,
  },
  {
    name: "console-half-unmeasured — the Add-chain duration list stops reading the record",
    file: PAGE,
    suite: "updown-admin-options",
    from: `                    const r = symbolReadiness(findSymbol(a.symbol), d, feed?.advise(a.key, d), feed?.movement(a.key, d),
                      toReadinessAdvice(book?.choice(a.symbol, d, findSymbol(a.symbol)?.minDurationMinutes ?? null)));`,
    to: `                    const r = symbolReadiness(findSymbol(a.symbol), d);`,
  },
  {
    // ⛔ A-5. Two readings produce a median as readily as two thousand, and on screen the two
    // are indistinguishable — so an unmeasured asset showing "+132s typical" is a fabrication.
    name: "unmeasured-shows-a-median — the asset table quotes an average off two readings",
    file: PAGE,
    suite: "updown-admin-options",
    from: `                                  {advice?.unmeasured
                                    ? "not measured yet"
                                    : <>`,
    to: `                                  {false
                                    ? "not measured yet"
                                    : <>`,
  },
  {
    // E-85: the band trigger clipped "(recommended)" away, on the field that decides whether
    // rounds pay or refund.
    //
    // ⚠️ RE-ANCHORED **AND RE-AIMED** 2026-08-15, and the second half is the point. This used
    // to narrow `lg:grid-cols-6` → `5`. The form runs ten columns now, so re-pointing it at
    // `grid-cols-10` was the obvious repair — and would have produced a mutation NOTHING
    // CATCHES: `updown-admin-options` §6.11 was deliberately rewritten on 2026-08-07 to pin the
    // RATIO rather than the literals, precisely because pinning numbers had failed a tree on
    // which the invariant had got STRONGER. So the mutation attacks the band's own span, which
    // is the clip this case exists for. ⛔ A re-anchor that restores the INJECTION without
    // restoring the PROOF turns an honest ANCHOR NOT FOUND into a silent MISS.
    name: "band-column-narrowed — the winning band clips back to \"Smallest possible…\"",
    file: CONTROLS,
    suite: "updown-admin-options",
    from: `        <Field label="Winning band" className="lg:col-span-4">`,
    to: `        <Field label="Winning band" className="lg:col-span-1">`,
  },
  {
    name: "record-column-removed — the operator cannot see what refuses their duration",
    file: PAGE,
    suite: "updown-admin-options",
    from: `                    <th className="px-4 py-2.5 font-semibold">Feed record</th>`,
    to: `                    <th className="px-4 py-2.5 font-semibold">Feed</th>`,
  },
  {
    name: "measurement-overrides-the-catalogue — a good record lifts gold's 15-minute floor",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  // ③ beats everything: the platform genuinely cannot feed it.
  if (spec.unsupported) return { level: 3, reason: spec.unsupported };`,
    to: `  // ③ beats everything: the platform genuinely cannot feed it.
  if (spec.unsupported) return { level: 3, reason: spec.unsupported };
  if (measured && measured.level === 1) return { level: 1, reason: "" };`,
  },
  {
    name: "gold-minimum-removed — gold is offered at 3 and 5 minutes again",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `    minDurationMinutes: 15,
    minDurationWhy:
      "Gold's own price feed disagrees`,
    to: `    minDurationWhy:
      "Gold's own price feed disagrees`,
  },
  {
    name: "gold-reason-dropped — an option is greyed with no explanation",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `        spec.minDurationWhy ??
        \`\${spec.symbol} needs rounds of at least \${spec.minDurationMinutes} minutes.\``,
    to: `        \`\${spec.symbol} needs rounds of at least \${spec.minDurationMinutes} minutes.\``,
  },
  {
    name: "unknown-symbol-passes — an uncatalogued symbol reads as ready",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `  if (!spec) {
    return {
      level: 3,`,
    to: `  if (!spec) {
    return {
      level: 1,`,
  },
  {
    // The gate removed: the dropdown still greys the option, the server takes it anyway.
    // ⚠️ RE-ANCHORED 2026-08-15 to the wrapped call.
    name: "server-gate-removed — the console greys it and the server accepts it",
    file: CONFIG,
    suite: "updown-readiness",
    from: `  const durationErr = validateSymbolDuration(
    asset.symbol, input.durationMinutes, measured, movement, toReadinessAdvice(playbook),
  );
  if (durationErr) return { ok: false, error: durationErr };`,
    to: `  const durationErr: string | null = null;
  if (durationErr) return { ok: false, error: durationErr };`,
  },
  {
    name: "catalogue-tick-below-the-floor — the form prefills a value the server refuses",
    file: SYMBOLS,
    suite: "updown-readiness",
    from: `    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 2, group: "Crypto" },
  { symbol: "ETH/USD"`,
    to: `    category: "crypto", iconKey: "crypto", decimals: 2, minMoveTicks: 1, group: "Crypto" },
  { symbol: "ETH/USD"`,
  },
  {
    name: "lattice-rule-loosened — a duration that does not divide the day is admitted",
    file: DURATIONS,
    suite: "updown-durations",
    from: `  return Number.isInteger(minutes) && minutes > 0 && MINUTES_PER_DAY % minutes === 0;`,
    to: `  return Number.isInteger(minutes) && minutes > 0;`,
  },
  {
    name: "duration-added-off-lattice — 7 minutes, whose boundaries drift across midnight",
    file: DURATIONS,
    suite: "updown-durations",
    from: `export const ALLOWED_DURATIONS = [3, 5, 10, 15, 30, 60] as const;`,
    to: `export const ALLOWED_DURATIONS = [3, 5, 7, 10, 15, 30, 60] as const;`,
  },
];
