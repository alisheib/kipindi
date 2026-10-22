# MR-16 as built (OB lane, 1c8b42284) — the S7 lane applies this in MASWALI-PLAN when it merges claude/maswali-s7-ob

## 1. §3 — replace MR-16 (from its heading line through "- A SETTLED week is final.") with:

**MR-16 · Objections — one 24-hour window per week, one question at a time.** `[Ali 2026-10-16; OD-05; corrected by MB-23; built S7-OB 2026-10-22; the author bar: the lead's ruling under Ali's "separation stays absolute"]`
- Any holder of a live (non-cancelled) ticket in the week may object, **per question**: `Objection.questionOrdinal` 1–15 (M1–M10, A1–A5), keyed (week, question, player) — **once per question**, open or decided (a partial unique index) — with a reason from the platform's list and 10–1,000 characters of their own words, from the ticket's page.
- ⭐ Millionea has its own window, frozen in the week's rules: **24 hours, opening when the graded set becomes final, never closing before 12:00 EAT**. It is not the platform's live `objectionWindowHours`. A filing at the close itself is refused; only a question with a result can be objected to.
- Rulings: **REJECT**, or uphold with **REVERSE**, **VOID** (a ground from the closed list, MR-15; by default `criterion_objection`) or **REINSTATE** (a voided question back, with its result). A void is never REVERSEd.
- A Compliance officer rules on `/admin/maswali/integrity` (control `ruleMaswaliObjection`); the Owner is the fallback. The bars: never the officer who sealed the question or confirmed its seal, never the officer whose upheld ruling set its present result, never the objector, never an officer holding a live ticket in the week. The ruling is a typed confirmation on the result the officer reviewed (a result changed since is refused). Its note is shown to the player. Every act is audited.
- Settlement and the week void refuse while any objection is OPEN, failing closed. An upheld ruling re-runs MR-17; when the graded set changes, the window restarts **once** per week, from the ruling; a later change re-grades but keeps the window. Filing, ruling and release serialize on the chain lock.
- A SETTLED or VOIDED week is final: no objection is filed or ruled on it.

## 2. Also in the same commit
- **OD-05** (§9): add the as-built note — the ruling officer is "an officer other than the sealer", and also not the officer whose upheld ruling set the question's present result (the author bar, audited `maswali.objection.author_blocked`; test:maswali-objections 2.17, plant (22)); the lead's ruling under Ali's "separation stays absolute", 2026-10-22.
- **MB-99(b)** (§8): it says the window "reopens on any change" — correct it to MR-16's rule: the window restarts ONCE per week, from the ruling; a later change re-grades but keeps the window.
- **§6.1 line 14** (OB.0): tick it (☑) citing the OB merge commit, once the merged tree is green.
- Every other place that still states the old objection rule (grep docs/ for "objection" near Millionea/Maswali, the RULES §2.12 paragraph is already OB's): corrected or pointed at MR-16.
