# RUN-EVERYTHING — the single prompt for the ONE implementation session

Paste the block below into a **fresh Claude Code session opened on `F:\kipindi-main`**.
You are the ONLY session working this repo now — you own everything (money, Up & Down, the whole
platform, and all design work). It is self-locating: it reads the plan and resumes from wherever the
trackers say, so it is safe to paste again if a session is interrupted.

---

```
You are the SOLE implementation session for the 2026-08-07 UX + design work on 50pick
(repo F:\kipindi-main, Next.js 16 / React 19, deploys LIVE to a real-money platform on every push).
There is no other session running — you own money code, Up & Down, the whole platform, AND all
design-system work. Do not wait on or coordinate with any other owner.

━━ STEP 0 — ORIENT (every time you start or resume) ━━
Read, in order, before writing code:
  docs/ux-audit-2026-08/MASTER-PLAN.md      ← the control file; its "PICK UP HERE" block + trackers say where we are
  CLAUDE.md, docs/NEXT-PLAN.md, and the skills 50pick-standards + 50pick-audit
  docs/ux-audit-2026-08/SESSION-A-EDIT-SPECS.md
  docs/ux-audit-2026-08/UPDOWN-UX-AUDIT-HANDOVER.md
  docs/ux-audit-2026-08/PLATFORM-UX-AUDIT-HANDOVER.md
Then `git fetch && git log --oneline -15` to learn HEAD. The census workflow never completed — do
NOT wait on it; work from the code.

━━ HOW YOU WORK (every item) ━━
- Find the next unchecked box in MASTER-PLAN (§5 → §6 in the phase order below).
- Re-verify its file:line against HEAD. If it no longer reproduces, mark it [S] SUPERSEDED with a
  one-line note and move on. Never force a dead finding.
- Make the change using the report/spec for that item. One finding (or one staged commit) at a time.
- TEST: run the relevant `test:*` suites, then `qa:live`, then live-drive the affected surface on
  production after push. Run the FULL `npm run test:all` before ANY push that touches a money file
  (all of B-1…B-5, B-9, DA-5/E-115, and Up & Down money-adjacent changes). Red test → fix before
  moving on. Never tick a box with a failing suite.
- UPDATE THE PLAN IN THE SAME COMMIT: tick the box(es) in MASTER-PLAN §5/§6, bump the §4 counters,
  and rewrite the "PICK UP HERE" block (status / active session / next action / last updated). This
  is how a resume works — treat the plan as part of the deliverable.
- Commit AND push after each item (Railway auto-deploys; Ali reviews live). Never leave work unpushed.

━━ PHASE ORDER (do not reorder) ━━
1) SESSION A — money-safety & ops (§5, 7 items). Use SESSION-A-EDIT-SPECS.md verbatim (exact
   before→after edits, verified at HEAD). Server actions + admin only. Do this FIRST — it protects
   real money and has no design dependency.
2) CORE DESIGN SET — define the new toast/popup/modal system in the kit primitives so everything
   downstream conforms to a finished target: DA-1 toast (rung 4; borders from composed tints not
   per-variant literals; add sticky durationMs:0 + role=alert for danger), DS-1..DS-4 (toast, Modal
   +ConfirmModal with loading state, OperationResultModal, confirm-dialog), DA-2 (178 glyphs onto
   the 4 primitives), DA-6 ATOM J (fold M1–M8 into DESIGN_AUTHORITY.md, delete EXTEND.md + merged
   material.css — ⚠️ M6 text must say THREE gates, delivery says two), DA-8 (remove dead win-*
   classes — ⛔ KEEP badge-seal-rays, reused by .seal-sheen), DA-9 (--bg-elevated2 26% → 24% cap).
3) SESSION B — Up & Down (Report 1, all 22, four staged commits). The toast/kit from phase 2 is now
   ready, so UD-3 (sticky failure toast) + UD-4 use it. Fold in DA-3 (E-112: stake chips 26px →
   40px money-control floor, with UD-9) and DA-4 (E-114: refund tick → factual variant, with UD-12).
4) SESSION C — platform front-end sweeps (Report 2 remaining), by the 5 root patterns + freshness +
   auth robustness. §7 appendix lists every occurrence.
5) CONSISTENCY + REMAINING ATOMS — DS design-consistency sweep across ALL 24 signal surfaces (every
   confirm/result popup, banner, inline signal, notifications panel, drawer conforms to the new set
   and uses the kit primitive, obeying the toast-vs-popup matrices); the VISUAL set V-1…V-7; and the
   remaining DA atoms: DA-10 share-button → kit Modal (= DS-25), DA-7 .gilt-ink (money-as-struck-
   type), and ⛔ DA-5/E-115 the MONEY atom — it crosses into src/lib/server/ and moves money, so
   gate it under the Session A money rules (ledger verification + fresh money census + full test:all
   before push); .gilt-ink sequences after/with it.
6) SWEEP GATES — DS-25 (grep: no hand-rolled toast/popup remains, migrate any), DS-26 (audit every
   consequential mutation platform-wide routes to OperationResultModal; failures persist; toast
   secondary), DS-27 (screenshot pass 360/768/1280 light+dark — needs the Chrome extension + login;
   report to Ali).

━━ NON-NEGOTIABLE RULES ━━
- Money-engine math untouched (buyPosition/deposit/withdraw settlement, locks, admission, pricing,
  payout, refund) except the exact admin-action/plumbing lines the specs name. E-115/DA-5 is the one
  atom that touches server money — treat it with the money protocol above.
- Guardrails: repeat taps = repeat bets; Up & Down results in-app only; keep the 4-channel bet
  feedback (test:updown-bet-feedback); gold budget (gold = earned money only); kit-only primitives;
  ALL new player copy in EN+SW+ZH; no emoji in UI copy.
- BLOCKED-ON-ALI items (MASTER-PLAN §9): DA-Q (README Q5–Q8: gold icon tint, 360px title clamp,
  Gold/Silver artwork, Up & Down top-nav) and DA-P (Modal photograph needs a live open market).
  Surface these to Ali, park them, and keep going on everything else. Record answers in §9 when given.

━━ DONE + CLEANUP (MASTER-PLAN §7 — required) ━━
When every §5/§6 box is [x] or [S], all suites + qa:live green, prod clean:
  (a) Fold each durable LESSON (one line, not the whole report) into the doc that owns the subject (§7a).
  (b) Closing commit (§7b): KEEP MASTER-PLAN.md (add "STATUS: COMPLETE — <date>" banner). `git rm`
      the now-stale working docs: SESSION-A-EDIT-SPECS.md, both *-HANDOVER.md, SESSION-PROMPTS.md,
      both *-brief.html, and RUN-EVERYTHING-PROMPT.md. Scan docs/ for anything THIS work made stale;
      delete the clearly-dead ones, list every removed file in the commit message, and for anything
      ambiguous leave a one-line note for Ali instead of guessing.
  (c) Commit message: "UX audit + design 2026-08: complete — lessons folded, stale docs removed" + list.
Never delete a report while any item is still open.

Start now: STEP 0, then the first unchecked item in MASTER-PLAN §5. Report progress by updating the
plan; ping Ali only for a §9 decision or an ambiguous stale-doc deletion.
```
