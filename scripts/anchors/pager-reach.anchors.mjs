/**
 * THE ANCHORS `red:pager-reach` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * The shared pager gained FIRST and LAST controls on 2026-08-25 (Ali's request: *"arrow
 * controls, not only numbers"*). Each mutation restores one way that can silently regress.
 *
 * ⭐ THE THIRD IS THE ONE TO READ, and it is the reason §1 is a sweep rather than three
 * examples. `window-lists-everything` makes `pageWindow` return every page from 1..total.
 * That is a WORSE pager — a 1,000-page list would render 1,000 buttons — and yet every
 * "page 1 and the last page are reachable" assertion passes more easily than before. A
 * reachability rule cannot see a pager that reaches too much; only the bound can.
 *
 * ⭐ AND THE FIFTH IS THE POSITIVE CONTROL FOR §3. That section only checks call sites that
 * ALREADY localise, so it passes vacuously the moment that set is empty — an i18n refactor
 * renaming `prevLabel` would do it. The mutation renames the prop the gate keys on, and the
 * gate must fail on the POPULATION assertion rather than report a clean sweep of nothing.
 *
 * ⚠️ SINGLE-LINE ANCHORS. This tree is CRLF and these declarations are LF, so a multi-line
 * anchor cannot match and the replace becomes a silent no-op — which reads as "the guard
 * failed to catch the defect" rather than "the harness never ran".
 * ⚠️ And no replacement may CONTAIN its own anchor, or the did-it-reach-disk check refuses a
 * mutation that applied correctly.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const PAGER = "src/components/ui/pagination.tsx";
const GATE = "scripts/pager-reach.test.mts";
const SITE = "src/app/results/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "last-jumps-one-page",
    why: "⭐ THE REGRESSION THAT LOOKS RIGHT: the LAST control is still there, still named, still a double chevron — and it steps ONE page instead of jumping to the end. Nothing about the row looks different, and a player on page 3 of 60 clicking » lands on page 4",
    file: PAGER,
    suite: "pager-reach",
    from: `        <Control to={totalPages} disabled={!hasNext} cls={\`\${btnBase} \${hasNext ? btnInactive : btnDisabled}\`} aria={lastLabel}>`,
    to: `        <Control to={safePage + 1} disabled={!hasNext} cls={\`\${btnBase} \${hasNext ? btnInactive : btnDisabled}\`} aria={lastLabel}>`,
    expect: "2: a LAST control targets the final page",
  },
  {
    name: "first-control-unnamed",
    why: "the FIRST control loses its aria-label. A double chevron is not self-describing, so a screen reader announces an unnamed link — and the control a blind player needs most to escape page 40 becomes the one they cannot identify",
    file: PAGER,
    suite: "pager-reach",
    from: `        <Control to={1} disabled={!hasPrev} cls={\`\${btnBase} \${hasPrev ? btnInactive : btnDisabled}\`} aria={firstLabel}>`,
    to: `        <Control to={1} disabled={!hasPrev} cls={\`\${btnBase} \${hasPrev ? btnInactive : btnDisabled}\`}>`,
    expect: "2: first carries an aria-label",
  },
  {
    name: "window-lists-everything",
    why: "⭐ `pageWindow` returns EVERY page. Every reachability assertion passes MORE easily — both ends are always present — while a 1,000-page list would render 1,000 buttons. A rule about reaching enough cannot see a pager that reaches too much; only the bound can",
    file: PAGER,
    suite: "pager-reach",
    from: `  if (totalPages <= 7) {`,
    to: `  if (totalPages <= 100000) {`,
    expect: "1: the window stays bounded",
  },
  {
    name: "first-not-disabled-on-page-one",
    why: "on page 1 the FIRST control stays live, so it renders as a real link to the page already being read. `Control` only emits a `<span aria-disabled>` when told to, so this is a navigable dead end rather than a greyed one",
    file: PAGER,
    suite: "pager-reach",
    from: `        <Control to={1} disabled={!hasPrev} cls={\`\${btnBase} \${hasPrev ? btnInactive : btnDisabled}\`} aria={firstLabel}>`,
    to: `        <Control to={1} cls={\`\${btnBase} \${hasPrev ? btnInactive : btnDisabled}\`} aria={firstLabel}>`,
    expect: "2: first is disabled when there is no previous page",
  },
  {
    name: "control-no-localising-sites",
    why: "⭐ POSITIVE CONTROL for §3 — the gate only inspects call sites that ALREADY localise, so it passes vacuously the moment that set is empty. An i18n refactor renaming the prop would do exactly this, and the gate must fail on the POPULATION rather than report a clean sweep of nothing",
    file: GATE,
    suite: "pager-reach",
    from: `  const localising = files.filter((f) => /prevLabel=\\{t\\./.test(decomment(readFileSync(f, "utf8"))));`,
    to: `  const localising = files.filter((f) => /prevLabelRenamedAway=\\{t\\./.test(decomment(readFileSync(f, "utf8"))));`,
    expect: "3: the population is not empty",
  },
  {
    name: "one-site-half-localised",
    why: "a single call site keeps prevLabel/nextLabel and drops the two new ones, so that pager announces \"Ukurasa uliopita\" and \"First page\" in the same row — half a translation, which reads as a bug in the language rather than in the code",
    file: SITE,
    suite: "pager-reach",
    from: ` firstLabel={t.common.firstPage} lastLabel={t.common.lastPage}`,
    to: ` lastLabel={t.common.lastPage}`,
    expect: "3: every localising call site passes firstLabel AND lastLabel",
  },
];
