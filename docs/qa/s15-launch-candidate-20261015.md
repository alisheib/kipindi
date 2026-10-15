# S15 ACTIVE source candidate — 2026-10-15

This branch prepares the public journey flip from the exact integrated preview
candidate `b1f1ce32b00c2af8b716642fc63c05dd7268a08a` and the parked S15
source `f54c65e` (`codex/s15-preflip-rebased-1015`). It is a review and local
verification checkpoint, **not** a launch record or approval.

## What is in the candidate

- `SIMPLE_JOURNEY_SHIPPED` is `ACTIVE`. The stored rollout and environment can
  still lower it. `WITHDRAWN` and `STAFF_PREVIEW` controls remain exercised.
- The S15 legal, tagline, share image, manifest, service-worker cache and
  discovery-copy work from the parked branch is integrated. The action-key
  wording uses ticket/Tiketi/注单 consistently on player surfaces.
- Bare `/markets` keeps the existing journey redirect to the home. Query and
  attribution preservation remain covered by `test:markets-redirect` and its
  red control; S16, after seven real days, is when the redirect becomes 308.
- The new `qa:s15-active-rulings` audits the ACTIVE first card, qualified
  estimates, the negative first-claim rule, a single Deposit per visible money
  region, the one-tap Withdraw paths and four tabs across Swahili, English and
  Chinese at 360, 390, 768 and 1280 pixels. Its DOM red plants cover each
  ruling. Classic `qa:landing-ten` remains a local rollback control.
- `test:deploy-skew` now reads the owner-keyed waiting page as well as the
  open bet sheet; money actions are never replayed by a resumption.
- `gate:s15-release` is a fail-closed predeploy gate. Its publication date is
  `null` in this candidate and **must not be filled early**.
- `s15-launch-build-gate` also runs before npm builds and starts, and from
  Next's own config-load path. An ACTIVE commit with missing publication proof
  therefore cannot build or boot on Railway or a direct main push. For an
  isolated, in-memory local candidate drive, set `S15_PRELAUNCH_LOCAL=1`;
  the gate rejects that bypass on Railway, with a database URL, or in a main
  push. Pull-request CI uses the same review-only bypass and does not confer
  publication approval.

## Finish on the actual launch day

1. Finish the S14 checklist and its redacted proof: the real TZS 1,000 staff
   journey and the agency's written sign-off, or Ali's explicit override.
   The user will arrange the operator and agency. The evidence validator checks
   file shape, not the authenticity of a transaction or approval; inspect the
   underlying records before marking a box.
2. After **2026-10-15 21:00 UTC** (2026-10-16 00:00 EAT), calculate and file
   the full October 2–15 prelaunch baseline from production counters. Verify
   completeness and all five measures. A missing day keeps the gate closed.
3. Recheck the integrated exact SHA, production config and rollback readiness.
   Ali intentionally left admin two-factor authentication disabled during
   preview. Record a fresh security decision and a masked read of the enabled
   Selcom webhook signing; do not copy secret values into Git. Obtain Ali's
   fresh, dated S15 go only after he has seen the S14 and baseline records.
4. Read `/api/health` and the signed rollout switch **immediately before the
   ACTIVE push**. On 2026-10-15 around 19:43 UTC, production had no
   `FEATURE_SIMPLEJOURNEY` override and `journey.rollout.switch` was ABSENT.
   This is time-sensitive, not a launch-day assumption. `ISSUE_LINK` from
   ABSENT writes an `ACTIVE` stored cap, held at preview only by the currently
   shipped ceiling. If an Owner CAP later sets `STAFF_PREVIEW`, use the
   documented Owner Resume ceremony to move it to `ACTIVE`; never bypass that
   ceremony with a direct database write. If the stored cap is `ACTIVE` or
   ABSENT, shipping this code would make the public flip immediate.
5. Set `docs/qa/s15-publication.json` to the **actual East Africa calendar
   date** of publication. Set `TERMS_VERSION`, all three displayed versions on
   `/legal/rules`, `/legal/rules/yes-no` and `/legal/rules/up-down`, and a dated
   `docs/COMPLIANCE-DECISIONS.md` S15 publication entry to the same date.
   Remove the parked status from the legal draft. Do not backdate or claim
   agency/staff approval that has not occurred. Run `npm run gate:s15-release`.
6. Run the source gates and red controls, then build an isolated local ACTIVE
   server with an in-memory database and no production secrets. Run
   `KP_BASE=http://localhost:3047 npm run qa:s15-active-rulings`, the ACTIVE
   `qa:live` drive, the dual-mode money/route checks and the exact-SHA visual
   matrix. The active ruling script refuses a production host or configured
   database. A code source pass cannot replace the browser, human or money
   proof.
7. Push the single reviewed flip commit only after the above gates are green.
   Verify the exact deployed SHA and public journey pages. Ali has authorized
   **one new mobile01 staff run for S15 after the S14 proof**: the named staff
   operator performs the separate real deposit → return → bet journey. This
   authorization does not advance the run before S14 closes or supply payment
   credentials. Record redacted references and the actual `launchAt`. Send the
   agency real screenshots and the first report.

Watch the rollback triggers in `docs/VODACOM-PLAN.md` §5. S16 can begin only
after seven full days from the recorded launch, with healthy measures and
agency acknowledgment; `gate:s16` must pass on real evidence.
