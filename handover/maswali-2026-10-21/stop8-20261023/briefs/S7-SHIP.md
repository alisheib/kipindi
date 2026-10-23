# Lane S7-SHIP — S7 to production, verified, before Sunday 2026-10-25 18:00 UTC (lead asheib-f3, OMEGA)

## Why now
Millionea is ACTIVE on production since 2026-10-22 23:32 UTC (Ali's ruling, COMPLIANCE-DECISIONS § "2026-10-23 · Maswali
Millionea — switched ON for everyone ahead of the launch gate …"). The binding Millionea rules (S6, v2026-10-23) describe
S7's objection door and its reversed-payment hold, and they must be live before any week opens (the earliest: Monday
2026-10-26 00:00 EAT = Sunday 21:00 UTC). So S7 goes to `main` first, this weekend, fully verified; S6 follows on it.
Only the lead pushes `main`. You make S7's head READY: merged with current `main`, every gate green at the exact commit,
every red fixed by its owner rule (never by weakening a guard), every record written. Then report "ready at <sha>".

## Tree, branch, budget
- Tree `C:/50pick-ssd/maswali-s7-integrate-20261019` (real node_modules; it sits on `claude/maswali-s7-s5` at a7feccbef).
  `git fetch origin && git merge --ff-only origin/claude/maswali-s7-s5` (→ 75b20ccde, S7-F9 21), push nothing yet.
- Work on `claude/maswali-s7-s5` itself (it is S7's release branch). Push after every commit (full refspec + ls-remote).
- Heavy jobs: `bash $S/mln-slot-s78.sh s7ship <cmd…>` (slots 7 and 8 are yours alone). Ports 3700–3709,
  `KP_SCRATCH_PORT=5491`, scratch `$F/s7-ship/`. Free RAM is plentiful today (no other lanes); still one DB suite at a
  time in your tree, one server per port.
- ⚠️ Next.js: `main` is moving to 16.4.2 (the security patch, ac9fd7c21) and then to S5 round 2. When you merge `main`, run
  `npm install --no-audit --no-fund` (NOT `npm ci`: this npm skips dependencies' install scripts, so a wiped tree loses
  the generated Prisma client) and check `node_modules/next/package.json` says 16.4.2.

## Read first
`$F/LANE-COMMON.md` (rules; its last section: every change is a recorded FINAL rule), `AGENTS.md` at your tree root,
`docs/MASWALI-PLAN.md` §7b S7 and §6.1 line 14, the hand-over branch `maswali-handover-20261021`
`handover/maswali-2026-10-21/stop6-20261022/README.md` top block (STOP 7: S7's list) and the S7 lead notes there.

## The list, in order
1. `git merge --no-ff origin/main` (and again whenever `main` moves before the push). Resolve by owner rules; record
   each resolution in the merge commit.
2. S7's owed items (STOP 7 / a7feccbef's body): test:house-bot-disclosure; qa:maswali-objection-console on a fresh
   in-memory server; S7-F9 14 (RULES §2.12's sunset paragraph states MR-30's final-week rule — script
   `$F/s7/ed-rules-sunset.mjs`), then maswali-law, rules-copy, maswali-config.
3. THE MIGRATION PROOF (S7 adds `20261018130000_maswali_product_line_fence`; its name sorts before main's latest
   `20261018150000_counts_as_by_hand`): on a throwaway PostgreSQL (db-scratch) — `prisma migrate deploy` with main's
   migration folder first, then the candidate's: it applies exactly the one new migration; a second deploy says "No
   pending migrations"; the SQL replays cleanly; `npm run verify:backup-schema`. Then the backup tooling: `test:backup`
   and a `db:backup` → `db:verify-backup` round trip with the fence present. Print every result.
4. The gates at the exact head: tsc; `next build`; GitHub CI (`gh workflow run CI -R alisheib/kipindi --ref
   claude/maswali-s7-s5`; compare failing CASES with main's own run on the same day — never suites); e2e:money,
   e2e:fault, e2e:card and e2e:maswali-money, e2e:maswali-fault on a throwaway PostgreSQL (the recipe:
   `$F/lead/s5-money-inner.sh` run through `npx tsx scripts/db-scratch.mts --run bash <file>`); every two-store suite S7
   touches (engine, purchase, settle, void, close-race, shared-paths, integrity, player, adversarial, objections,
   house-bot-reports, house-bot-money, house-bot-console) at or above its floor; the red twins: red:maswali-money-path
   (99 plants), red:dal-parity, red:maswali-fence, red:maswali-objections (23), red:house-bot-console; red:house-bot-c5
   (long: start it early in its own slot run). qa:live on fresh in-memory dev servers at FEATURE_MILLIONEA=ACTIVE
   (production's setting) and at the default; the door census (qa:maswali-door-dark WITHDRAWN + STAFF_PREVIEW).
5. Classic parity: ask the lead for the baseline file of the main you merged (the lead captures it at each new main in
   `$F/lead/r2gate/parity/`), then compare your head with `--allow-base`; name every difference.
6. Records: MASWALI-PLAN §7b S7 (Closes), §8 rows, FAILURE-INVENTORY §9, RULES — never §0/§1 or NEXT-PLAN (tell the
   lead what §0 should say).

## Report to "main"
At each milestone (merge done; migration proof; gates green or a red you cannot fix) and at the end: LANE-COMMON's six
points, the exact head sha, every printed count, and "READY TO PUSH at <sha>" only when every item above is green.
