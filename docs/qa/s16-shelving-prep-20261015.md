# S16 shelving preparation — parked source, no launch claim

**Checkpoint, 2026-10-15:** `codex/s16-shelving-ready-1015` starts at S15 candidate
`b88f2d138d71039aa346f0dd294696bd494ee34a`. This branch prepares the
final gate only. It does **not** mark S14, S15 or S16 complete, and must not be
deployed. `docs/VODACOM-PLAN.md` §5 S16 and the 2026-10-14 owner decision in
`docs/COMPLIANCE-DECISIONS.md` control the final release.

## What is prepared

- `test:shelved-inventory` reads all **34** current six-column SHELVED rows. It
  requires each item exactly once, its source path to exist in place, a real
  shelving date, re-mount instructions, and every named `npm run` test to remain
  wired. Three older rows now explicitly say *shelved* or *unmounted* in their
  Files cell, as the document's own rule requires.
- `test:shelved` first runs TypeScript's `typecheck` so retained components
  compile, then checks the final active source. Its guards cover every row by
  its active parent: classic chrome, floating controls, tickets and ghosts,
  landing, ticker, primer, `/markets`, live wall, cards, deposit, guest question,
  and Up & Down. They also require removal of the preview cookie, link and
  owner toggle, while retaining the launch observation and the five-measure
  verdict rule. The source-only check is intentionally **red** while S15's
  classic branches and staff-preview machinery still exist.
- `gate:s16-release` checks the actual `launchAt` plus seven complete 24-hour
  periods, the order of S15 go/baseline/read-back and S16 observations, a
  recorded *in-bounds* verdict over five measures and two harm markers against
  the 14-day baseline, zero rollback events, written agency acknowledgment,
  and the shelving source and red proofs. It also runs the existing S14–S16
  evidence shape check and the source/inventory checks. This gate is first in
  `predeploy` **on this parked branch** and is deliberately red.
- `red:shelved` catches deleted inventory rows, lost source files, unwired
  tests, false dates, absent re-mount instructions, and still-mounted preview
  source. `red:s16-release` catches a six-day observation, early proof,
  out-of-bounds verdict, omitted harm marker, rollback event, missing agency
  acknowledgment and an early S15 production read-back.

The S16 evidence file must contain **only redacted metadata**. For
`s16.sevenDayMeasures`, add the existing evidence object (`path`, `checkedBy`,
`checkedAt`, `commit`) plus `verdict: "in-bounds"`, `baselineDays: 14`,
`afterDays: 7`, `measureKeys` in the order coded in
`scripts/lib/s16-release.mjs`, and `harmMarkerKeys` in that same file's order.
Keep the two harm markers' counts in the compliance system; the committed
record names the rule and the reviewed result, not the private counts. Add
`events: 0` to the `noRollback` proof, `acknowledged: true` to the agency's
written acknowledgment proof, and `testShelved: "passed"` and
`redShelved: "passed"` to `shelvingProof`. These fields are claims linked to
underlying records, not automated authentication of a human decision.

## Required final source pass, after S16 becomes eligible

1. Read the live launch observation, actual production SHA, all seven full
   post-launch days, the five agency measures, two private harm markers,
   rollback log and the agency's written acknowledgment. Do not infer a date
   from a schedule. The app's `inBoundsVerdict` result must be *in-bounds*;
   its two measures with no pre-launch figure by design remain explicitly
   excluded, never treated as zero.
2. Unmount classic branches from active routes, keeping their component files
   and unit tests in place. Replace both `/markets` document and flight
   redirects with real 308 behavior. Restrict ticker routes to `/live` and
   `/results`. Keep the separate Card route operational when changing the
   direct mobile-money deposit page.
3. Remove preview pass reading, signing, link issuance, `/admin/journey`
   toggle and `FEATURE_SIMPLEJOURNEY` together. Keep the S15 launch-observation
   record and S13 measurement rule. Rewrite the rollout suite to assert the
   preview state is gone. Update any classic/preview source guards and the
   privacy notice with the actual behavior. Do not delete shelved components
   or their dictionary keys; list newly unused keys in SHELVED.md.
4. Run `test:shelved`, `red:shelved`, `red:s16-release`, full predeploy,
   responsive and money browser gates, and production read-back at the exact
   release SHA. Inspect every linked proof before entering completion fields.
   After S16, revert that single S16 commit or re-mount the SHELVED rows for
   rollback as the plan specifies. Record the actual deployment and agency
   acknowledgment in the readiness record, then close LANDING-TEN with its
   pointer to SHELVED.md.

**Current source check:** `test:shelved-inventory` passes 34/34. The final
source check refuses 31 still-mounted/preview conditions at this checkpoint.
`red:shelved` passes 9/9 and `red:s16-release` passes 7/7. A final
`test:shelved` pass is not claimed; it must wait for the source pass above and
the seven actual days.
