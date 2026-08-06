/**
 * THE TRACKER CANNOT CONTRADICT ITSELF — the guard on `docs/LIVE-QA-CAMPAIGN.md` §6.
 *
 *   npx tsx scripts/tracker-hygiene.test.mts        (npm run test:tracker-hygiene)
 *
 * §0.1 of that document says: *"⛔ A tracker that lags the work is worse than none, because the
 * next session trusts it."* This is that sentence made mechanical, because it kept being broken:
 *
 *   · **E-46** (found session 16) — filed `🟡 OPEN` and again `✅ FIXED`, two rows, no
 *     cross-reference.
 *   · **E-50** (found session 20) — same shape: my own `OPEN` filing left standing after
 *     session 19 fixed it.
 *   · **E-53** (found session 20) — the resolution row said *FIXED + LIVE-VERIFIED*; the other
 *     row still said *"DECIDED BY ALI, NOT YET BUILT"* about the same shipped, live feature.
 *   · **E-58** (found session 20) — ⛔ the worst of the four. Session 19 **WITHDREW** it as a
 *     misdiagnosis, and the original row still read `🔴 HIGH — ⛔ ALI'S CALL, NOT BUILT`,
 *     claiming four chains void every round. A row inviting the OWNER to make a decision, on a
 *     finding its own author had retracted.
 *
 * ── WHAT IT CHECKS, AND WHAT IT DELIBERATELY DOES NOT ───────────────────────────────────────
 * §1 · Within **§6. Findings** — the canonical table — a finding id may appear more than once
 *      (the "original filing + resolution" convention is useful; the filing carries the RED
 *      measurement). But **no row may assert an UNRESOLVED status unless it is explicitly
 *      marked as superseded.** That is the exact shape of all four failures above.
 *      ⚠️ Duplication ACROSS sections is normal and is NOT flagged: narrative sections (§6x…)
 *      and §6b legitimately restate a finding. Only §6 is the register.
 * §2 · Every id the CURRENT handoff tells the next session to work on must exist in §6, so the
 *      resume list cannot point at a finding nobody documented.
 *
 * ⛔ A THIRD CHECK WAS WRITTEN AND DELETED, and the reason is worth keeping. It required every
 * row to carry a status this guard could classify as resolved-or-not. **It failed on 23 rows
 * that are perfectly correct**: the older half of the register puts only a SEVERITY in that
 * column (`MEDIUM`, `LOW`, `🔴 BLOCKER`, even `—`) and states the resolution in the body. I had
 * invented a convention and then tested the document against it. A guard that fires on correct
 * work is worse than no guard, because the next session learns to skip it — so §1 simply treats
 * a severity-only row as asserting NEITHER state, which is exactly what it does.
 *
 * ⛔ IT CANNOT CATCH SEMANTIC STALENESS, AND SAYING SO IS PART OF THE GUARD. **E-37** sat at
 * `🔴 HIGH · OPEN, measured` for two sessions after the digest shipped and sent four real
 * digests — ONE row, internally consistent, simply not updated. Nothing textual distinguishes
 * that from a genuinely open finding. It was caught by a human reading the table against the
 * narrative sections. §1 would not have caught it and does not pretend to.
 */
import { readFileSync } from "node:fs";
// ⛔ ONE locator for "where is the current handoff", shared with test:settlement-expectation and
// the RED harness. Four separate copies of this pattern drifted apart — see the file itself.
import { locateHandoff } from "./campaign-handoff.mjs";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const DOC = readFileSync(new URL("../docs/LIVE-QA-CAMPAIGN.md", import.meta.url), "utf8");
const lines = DOC.split(/\r?\n/);

// ── Scope to §6. Findings — the register. Bounded by the next `## ` heading. ─────
const start = lines.findIndex((l) => /^## 6\. Findings/.test(l));
ok("§0 the findings register was located", start >= 0, "no '## 6. Findings' heading");
let end = lines.length;
for (let i = start + 1; i < lines.length; i++) if (/^## /.test(lines[i])) { end = i; break; }
const register = lines.slice(start, end);
ok("§0 …and it holds rows", register.some((l) => /^\| \*\*[EGAH]-\d+\*\*/.test(l)));

type Row = { id: string; line: number; status: string; superseded: boolean };
const rows: Row[] = [];
for (let i = 0; i < register.length; i++) {
  const m = register[i].match(/^\| \*\*([EGAH]-\d+)\*\*(.*?)\| (.*?) \|/);
  if (!m) continue;
  const [, id, afterId, status] = m;
  rows.push({
    id, line: start + i + 1, status,
    // The convention: an older row kept for its evidence says so, next to the id or in status.
    superseded: /original filing|superseded|closed by the/i.test(afterId + status),
  });
}
ok("§0 rows parsed", rows.length > 40, `parsed ${rows.length}`);

// A row whose status matches NEITHER pattern is severity-only (`MEDIUM`, `🔴 BLOCKER`, `—`),
// which is the older half of the register's convention. Such a row asserts nothing about
// resolution and is therefore never a contradiction — see the deleted-§3 note in the header.
//
// 🔴 THE LOOKBEHINDS ARE THE WHOLE CORRECTNESS OF THIS FILE. Without them `BUILT` matches
// inside **`NOT BUILT`** and `FIXED` inside `NOT FIXED`, so a row reading
// `🔴 HIGH — ⛔ ALI'S CALL, NOT BUILT` classified as RESOLVED and §1 skipped it. That is not
// hypothetical: the first version of this guard was run against all four real contradictions
// and **silently passed three of them**, while a sloppy RED harness printed "✓ RED" because it
// only checked that the file had changed. Two lies stacked into a false all-clear.
const RESOLVED = /(?<!NOT )(?<!NOT YET )(?:FIXED|BUILT)|SHIPPED|WITHDRAWN|NOT A DEFECT|BY DESIGN|✅/i;
const UNRESOLVED = /\bOPEN\b|NOT FIXED|NOT BUILT|NOT YET BUILT|ALI'S CALL|AWAITING|PENDING/i;

// ⚠️ A status of the shipped form `🟡 OPEN → ✅ FIXED …` contains BOTH markers on purpose — it
// records the transition. A row asserting a RESOLVED token anywhere is claiming resolution, so
// RESOLVED wins; `claimsOpen` therefore requires the ABSENCE of any resolved token. This also
// keeps a row safe when its commentary quotes the words (my own E-37 row explains that it
// "read `OPEN, measured` for two sessions", and must not be flagged for saying so).
const isResolved = (s: string) => RESOLVED.test(s);
const claimsOpen = (s: string) => !RESOLVED.test(s) && UNRESOLVED.test(s);

// ── §1 · ⭐ THE RULE. A multi-row finding may not leave an unresolved row unmarked. ──
{
  const byId = new Map<string, Row[]>();
  for (const r of rows) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);

  for (const [id, rs] of byId) {
    if (rs.length < 2) continue;
    if (!rs.some((r) => isResolved(r.status))) continue;   // genuinely open everywhere — fine

    // Some row says this is done. Every OTHER row that still claims it is open must say it is
    // the superseded filing, or a reader cannot tell which one is true.
    for (const r of rs) {
      if (!claimsOpen(r.status)) continue;
      ok(`§1 ⛔ ${id} line ${r.line} claims it is open while another row says it is resolved — mark it superseded`,
        r.superseded,
        `status "${r.status.slice(0, 60)}" — add "(original filing — closed by the row above)" or update it`);
    }
  }
  pass++; // the loop above records its own failures; count the sweep itself as one check
}

// ── §2 · the handoff cannot point at a finding that is not in the register ───────
{
  const ids = new Set(rows.map((r) => r.id));
  // ⚠️ ANCHOR ON A STRUCTURAL PROPERTY: the handoff marker STARTS A LINE. Not on the bare words
  // "RESUME AT:" — §0.1a of the document describes this very check, sits in §0 (which precedes
  // §6b), and so became the FIRST match; this silently began measuring a 900-character window of
  // §0.1a and its count fell from 14 to 8 while still reporting GREEN. Nor on the literal marker
  // text either: the fix-up note in §0.1a *quotes* the marker inside backticks, which broke it a
  // SECOND time within the same edit. Prose can mention any string; only a real handoff begins a
  // line with it. `^…` + `m` is therefore the only stable anchor.
  // §6b is newest-first, so the first line-initial match is the current handoff.
  //
  // 🔴 …AND THE ANCHOR STILL DRIFTED, because "starts a line" was too narrow. From session 23
  // the handoff began being written as a HEADING — `#### ⏭️ **RESUME AT:` — which this pattern
  // cannot match. So the first line-initial match silently became a SUPERSEDED handoff from an
  // earlier session, and both this check and `test:settlement-expectation` §5 spent two sessions
  // validating a block nobody was going to read. Proven, not inferred: with `E-999` injected
  // into the CURRENT handoff, this suite reported 12 passed / 0 failed.
  // ⭐ The lesson refines the one above it. "Anchor on structure" is right, but the anchor has to
  // admit every form the structure legitimately takes — a handoff marker is the same marker
  // whether or not it is also a heading. Optional `#`s, and prose still cannot match it.
  //
  // 🔴 AND IT DRIFTED A FOURTH TIME — found 2026-08-06, and the pattern above is the culprit.
  // From session 23 the marker carries its session number (`RESUME AT (session 32):`), which
  // `RESUME AT:` cannot match, so ALL EIGHT most recent handoffs were invisible and this check
  // fell through to a block from session ~16. Worse, `tracker-hygiene-red.mjs` was mutating that
  // same dead block, so the RED "proof" was exactly as stale as the check — **a guard and its
  // own proof can agree with each other and both be wrong.**
  // ⛔ The pattern, the block bounds and the topmost-block assertion now live in ONE place
  // (`campaign-handoff.mjs`), imported here, by `test:settlement-expectation` §5 and by the RED
  // harness — because every previous fix was applied to one copy and propagated the next bug to
  // the others by copy-paste. And the window is the WHOLE block: the old 900 characters covered
  // about a tenth of the instruction a session is actually told to act on.
  const handoff = locateHandoff(DOC);
  const resume = handoff.text;
  ok("§2 the current handoff has a RESUME AT list", handoff.found && resume.length > 0,
    `no '⏭️ **RESUME AT' marker (${handoff.total} found in the document) — has the handoff format changed?`);
  // ⭐ §6b's own rule is that ONLY the topmost block is current truth. A locator that finds a
  // marker further down has failed even though it found one — which is precisely what happened
  // three times before anyone noticed.
  ok("§2 …and it is §6b's TOPMOST block, not a superseded one",
    handoff.found && !handoff.stale,
    "the marker matched outside the newest handoff block — the anchor has drifted again");
  const referenced = [...new Set((resume.match(/\b[EGAH]-\d+\b/g) ?? []))];
  ok("§2 …and it names findings", referenced.length > 0, "no finding ids in the resume list");
  for (const id of referenced) {
    ok(`§2 ${id} (named in RESUME AT) exists in the findings register`, ids.has(id),
      "the handoff points at a finding with no row — file it or correct the id");
  }
}

console.log(`\nTRACKER HYGIENE — ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
