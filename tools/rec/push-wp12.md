# Pushing WP12 live — the procedure (asheib-c5, 2026-10-07; re-ordered ~19:20Z)

ORDER (marketing's turn runs to ~20:25Z): B (typecheck of the rebased tip + parity ×8) → **push WP12 (its 12 commits,
WITHOUT the db:scratch fix)** → A2 (main + the db fix on top: test:all with the DB suites, the failed reds, both
controls on main) → push the db fix → B2, C, D, E, F against main.

⚠️ B took the lock early (19:33 PC time) and measured 311a03da (WP12 on b2e9db81, BEFORE a3312e74): my rebase onto
marketing's STEP 50 (88792619, live 19:41Z) landed just after B read the branch. The push is WP12 on 88792619
(wp12-rb d2fe85d5): WP12's four served files are byte-identical between the two stacks, marketing's 23 commits share
only package.json (separate hunks), and nothing outside shortfall.ts/its test names the removed fields (git grep). So
before the push: `npx tsc --noEmit` in F:/kipindi-wp12 (at d2fe85d5) must be 0 errors — a minute, right after B.
The PC clock is ~96 s behind real time (marketing, checked against 50pick.tz's Date header): log times are PC times.

Preconditions for the push: wb-chain.done exit=0, and runs/wb-chain.log: typecheck 0 errors; every parity run as
designed — prove-red 0, the null compares 0, the compares at the tip 0 (or --allow-base with every served commit since
attributed). Turn A (rec/turnA-results.md): WP12's own suites and reds green; the failures are main's (A2's control
names them by measurement afterwards).

1. rec/proofs-final.json — fill the WP12 keys from A and B (the db-fix key stays TBD: it is not in this push; the
   filler only needs keys for commits in the range it rebuilds). Keys = subject starts:
   - "Vodacom S6 WP12: the shell's proof tools" → typecheck (A, and B on the rebased tip); test:all 437/467 with WP12's
     suites green and the failures main's (12 DB suites on the old sweep); red:all 185/234 with every WP12 red green
     (journey-shell 161/161, implicit-submit 61/61, enter-where-pressed 103/103, simple-journey-flag 37/37, shortfall
     12/12) and the rest main's or the two overlaps' (all 2,151 declared anchors resolve the same on main and WP12);
     parity (B). Owed after it lands: A2's controls, B2-F, production qa:live.
   - "Vodacom S6 WP12: qa:classic-shell-parity's 2.9" → B's runs.
   - "Vodacom S3 engine: shortfallPlan asks no email step" → {proof: "test:shortfall green and red:shortfall 12/12 again
     on WP12's tree in turn A (OMEGA-COMPILE01, 2026-10-07).", append: "Its test's header now reads the same …"}.
   - the others as already written in the file (turn C/E/F owed).
2. Build the push stack WITHOUT the db fix: in F:/kipindi-c5docs, `git replay --onto <the db fix commit> ...` is the
   wrong way round; instead replay the 12 WP12 commits (`<db fix>..wp12-rb`) onto `<db fix>^` (= 88792619) → ref
   wp12-nofix; check `git diff 88792619 wp12-nofix` equals `git diff <db fix> wp12-rb` (WP12's patch alone).
3. node rec/fill-proofs.mjs F:/kipindi-c5docs 88792619 wp12-nofix rec/proofs-final.json --write wp12-final
   (trees identical; every {PROOF} of the 12 filled). The filler refuses TBD/{…}: remove the db-fix key first.
4. git fetch; git replay --onto origin/main --ref refs/heads/wp12-push --ref-action print 88792619..wp12-final →
   update-ref; the patch equals wp12-final's. Main is 88792619 (marketing STEP 50) as B tests it — if anything
   else, typecheck + the touched suites first.
5. git push origin wp12-push:main (fast-forward only; never force). Rejected → fetch, step 4 again.
   Then: force-push vodacom-wp12 to wp12-push; and REBUILD wp12-rb = the db fix replayed onto the pushed tip
   (`git replay --onto wp12-push <db fix>^..<db fix>`), so A2's `checkout -B vodacom-wp12 wp12-rb` gives main + fix.
   Then: echo "exit=0" > runs/wp12-pushed.done — A2 waits for it, then moves vodacom-wp12 to wp12-rb (main + fix).
6. Deploy: poll https://www.50pick.tz/ and https://50pick.tz/ for dpl=<short sha of the pushed tip>, /api/health 200
   on both. Railway ~5-10 min.
7. Tell peers (asheib-25 marketing, asheib-0d) BEFORE: production qa:live signs mobile01 in once (ends any other
   mobile01 session). Then in a checkout at the pushed tip with node_modules (F:/kipindi-a8j detached there — NOT while
   a chain uses it: B2-F use kipindi-a8j; run it between turns or from kipindi-c5docs with a junction... decide then):
   copy F:\kipindi-main\.env.qa.local to its root (gitignored; never print/commit), LIVE_BASE=https://www.50pick.tz
   npm run qa:live → [E2]/[E3]; remove the copy afterwards.
8. Records commit (docs only) on main: rec/apply-pairs.cjs with rec/pairs-ruling-tracker.json, the WP12 §0h points
   61-63 and the §0i bullet (rec/wp12-records-draft.md, filled), IN FLIGHT. §1 S6 stays 🔨 until C/D read back.
