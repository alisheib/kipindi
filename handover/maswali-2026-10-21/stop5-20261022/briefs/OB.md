# Lane OB — the Millionea objection door (MB-23, MR-16; FAILURE-INVENTORY §9 OB.0)

Lead asheib-f3. Built by the DOORS agent in its tree `C:/50pick-ssd/kipindi-mln-ddoor` (package-lock and schema identical to
`claude/maswali-s7-s5`, so node_modules and the Prisma client stay valid): `git fetch origin && git switch -c
claude/maswali-s7-ob origin/claude/maswali-s7-s5`, push it at once. Step name `S7-OB <n>`; ports 3530–3539;
`KP_SCRATCH_PORT=5483`; slots `bash $S/mln-slot-s5x.sh ob …`; scratch `$F/ob/`. It lands with S7 (the S7 lane keeps working
on `claude/maswali-s7-s5` — TK.2, RD.5 — so merge that branch into yours whenever it moves; for a shared block in
`maswali-service.ts`, the adversarial child or the money-path plants, tell the lead first). Read `$F/LANE-COMMON.md` and
`$F/briefs/S5-R2-COMMON.md`'s design rules first.
Order: the server (filing + decision + grading re-run + window restart) and its tests on both stores first; then the
officer console; the PLAYER door last, as its own component file(s) mounted by a one-line hunk in the ticket page (TICKETS
is still changing that page on the S5 side — the lead merges the S5 round 2 into S7 later).

## The rule (MASWALI-PLAN §3 MR-16, MB-23's resolution — read both on the branch)
- Any holder of a non-cancelled ticket in the week may object, PER QUESTION (`Objection.questionOrdinal` 1..15: M1–M10 =
  1..10, R1–R5 = 11..15), keyed (week, ordinal, player) — one per key, open or decided (the partial unique index exists).
- Millionea's own window, frozen in the week's rules: 24 hours, opening when the graded set becomes final, never closing
  before 12:00 EAT (`objectionWindowEnd`, `week.objectionsCloseAt`) — not the platform's live setting.
- Remedies REVERSE, VOID and REINSTATE (an upheld objection can bring a voided question back).
- An officer OTHER than the one who sealed that question rules; the Owner is the fallback.
- Settlement refuses while any objection is OPEN (exists: OB.1–OB.5). An upheld objection that changes the graded set re-runs
  MR-17 and restarts the window ONCE. A SETTLED week is final.

## What exists (reuse, never duplicate)
`prisma` `Objection` (reason, detail, status OPEN|UPHELD|REJECTED, remedy, outcomeAtFiling, questionOrdinal);
`src/lib/server/objections-service.ts` (OBJECTION_REASONS, DETAIL_MAX, countOpenObjections, objectionEligibility,
fileObjection, rejectObjection, upholdObjection, holdSettlementAsOfficer …) — the classic door; the Millionea settlement's
OPEN-objection refusal; the admin week page's window line; the adversarial known-red OB.0
(`scripts/lib/maswali-adversarial-child.mts` ~587) with its declared fixture.

## Build
1. Server: the Millionea filing (eligibility above, the window, the reason list, detail ≤ DETAIL_MAX, one per key) and the
   officer's decision (the sealer refused; REVERSE/VOID/REINSTATE; grading re-run + one window restart), through the
   platform's objection service where it fits (extend, don't fork); both stores; audited; race-safe (two officers deciding,
   a filing racing the window's close, a filing racing settlement) — proven on PostgreSQL cross-instance.
2. Player door: on the ticket page per question (and only while the window is open and the reader holds a live ticket in
   that week), a kit dialog (reason + detail, confirm, Enter rules), the result, the objection's state on the ticket; the
   player's objections where the platform lists them; en/sw/zh with the decided vocabulary; RG-calm wording; 10/10 by the
   critics' lenses (tiles 320–1920 × sw/en/zh, every state: none, open, upheld with each remedy, rejected, window closed).
3. Officer console: the week's objection queue (by question, with the seal, the filer's reason and detail), decide with the
   kit's typed confirmation, the sealer's own question refused, the Owner fallback; admin drive + tiles.
4. Notices (S6-N's registry): objection received / decided — coordinate with the lead (S6 lands after S7).
5. Tests: OB.0 becomes a real passing case; new cases for every rule above on both stores; a red twin plant per guard;
   test:maswali-adversarial, the settle/void/engine suites at their floors; FAILURE-INVENTORY §9 OB.0 closed.
