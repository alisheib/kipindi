# Lane S6-SHIP — S6 to production right after S7, before Monday 2026-10-26 00:00 EAT (lead asheib-f3, OMEGA)

## Why now
Millionea is ACTIVE on production (Ali's ruling of 2026-10-23). ⛔ Before any week OPENS (earliest Monday 00:00 EAT =
Sunday 21:00 UTC) the Millionea rules page `/legal/rules/millionea` (a 404 on production today) and the Terms section must
be LIVE; before the FIRST settlement, S6's notices, tax-report lines and the payout-float alert must be live too. S6
stacks on S7: S7 goes first (lane S7-SHIP, agent named in the lead's message), then S6. Only the lead pushes `main`. You
make S6 READY: stacked on S7's final head and current `main`, the verified work in, every gate green at the exact commit.

## Tree, branch, budget
- Tree `C:/50pick-ssd/kipindi-mln-int` (real node_modules; on `claude/maswali-s6-release` at d5d20ccd3).
  `git fetch origin && git merge --ff-only origin/claude/maswali-s6-release` (→ f83e8de8c: S6-INT 29–34, the rules
  published as v2026-10-23 and the Terms page, D19a re-pinned, ADMIN's reds merged, fairness floor 77 — NOT gated yet).
- Work on `claude/maswali-s6-release`. Push after every commit (full refspec + ls-remote).
- Heavy jobs: `bash $S/mln-slot-s7c.sh s6ship <cmd…>` (slots 6 and 4, yours alone). Ports 3710–3719,
  `KP_SCRATCH_PORT=5492`, scratch `$F/s6-ship/`. One DB suite at a time in your tree.
- ⚠️ Next.js: when you merge `main` (moving to 16.4.2, the security patch), run `npm install --no-audit --no-fund` (NOT
  `npm ci`: this npm skips dependencies' install scripts, so a wiped tree loses the generated Prisma client) and check
  `node_modules/next/package.json` says 16.4.2.

## Read first
`$F/LANE-COMMON.md`, `AGENTS.md`, MASWALI-PLAN §7b S6 and §6.1, the hand-over `handover/maswali-2026-10-21/stop6-20261022/
README.md` top block (STOP 7: every S6 lane head and its state) on branch `maswali-handover-20261021`, and the S6 briefs
in `$F/briefs/S6-*.md` (their rulings bind; one change since: MB-11 is an alert before crediting and on the week page before
the release, NEVER a block — the other machine's lead ruled it and told S6-MONEY).

## The list, in order
1. Merge S7's head (`origin/claude/maswali-s7-s5`; again when S7-SHIP moves it) and `origin/main` into S6. Record each
   resolution.
2. Decide the content with the lead: S6's VERIFIED work goes in (the legal lane's rules + Terms, R, N, ADMIN 767662baf,
   DOCS 8b00c8e57, MONEY ce082dd5a once verified); the WIP heads S6-LINT `6f3bb08fd` and S6-NOTICES `7b541b891` go in only
   once finished and verified — otherwise they wait for a later release and nothing they would leave half-done ships.
   Send the lead your proposal with the reason before you merge a WIP head.
3. ⛔ The rules page and the Terms: rendered at FEATURE_MILLIONEA=ACTIVE in en/sw/zh at 320/360/768/1280, every word read
   against the binding text's hash (rules v2026-10-23), the objection door and the reversed-payment hold described as S7
   built them; the Terms section present; every legal guard (house-bot-disclosure D19a, rules-copy, maswali-law,
   fairness) green.
4. THE MIGRATION PROOF: S6 adds `20261018120000_maswali_winner_sms_once` (a unique partial index on "SmsMessage") on top of
   S7's fence. On a throwaway PostgreSQL: main's migrations, then S7's, then S6's — each applies exactly its own; a second
   deploy says "No pending"; `verify:backup-schema`; the backup round trip. The lead asks Ali's pre-approved ONE read-only
   production count of "SmsMessage" before the push (index build time) — never query production yourself.
5. The gates at the exact head: tsc; `next build`; GitHub CI (compare failing CASES with main's); the money suites on a
   throwaway PostgreSQL (e2e:money/fault/card, e2e:maswali-money/-fault, e2e:tax-report, report-reads, audit-roundtrip
   where they exist); S6's acceptance — test:maswali-reporting, test:maswali-notify, test:maswali-fairness,
   test:maswali-evidence, test:maswali-claims (+ reds), maswali-rbac, control-gates, admin suites, both stores where they
   run both; qa:live at ACTIVE and at the default; the door census; qa:maswali-admin-drive + -shots read by you.
6. Records as LANE-COMMON says (never §0/§1/NEXT-PLAN: tell the lead).

## Report to "main"
At each milestone and at the end: LANE-COMMON's six points, the exact head, every printed count, the content decision,
and "READY TO PUSH at <sha>" only when every item is green.
