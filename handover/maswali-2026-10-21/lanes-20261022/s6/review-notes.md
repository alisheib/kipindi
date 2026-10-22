# S6 — my own review notes (core: exactly-once, hooks, migration, boot write, classic flag, money/audit)

Tree: C:/50pick-ssd/kipindi-mln-not @ bd74c982c (mln-s6-notices). Round 17 = 1d22c1e30..bd74c982c (17 commits).

## Findings (draft)

M-a (MEDIUM) winner SMS "failed" is never retried, and the re-run records it as "already" (complete):
  maswali-winner-sms.ts:151-156 (sentTargets = any SmsMessage row, FAILED included — prisma-dal findByTargets:4294, store.ts:3847);
  sms.ts sendBatch writes the QUEUED row first (~:915) then updates FAILED (REJECTED / thrown-before-wire) or UNKNOWN (TRANSPORT).
  maswali-notify.ts:105-106 doc "failed: retried by the reconcile" is false; :686 smsDone flips true on run 2 via tally.already.
  Fix: distinguish newest-row status in sentTargets (FAILED definite vs ACCEPTED/QUEUED/UNKNOWN/DELIVERED); count FAILED as a
  final outcome (`notResent`) — run complete at once, desk list keeps the winner (it already does: maswali-console.ts:280) —
  or (lead's call) allow ONE resend of a definite FAILED by claiming the row back (conditional update FAILED→QUEUED as the
  reservation). Correct the docs either way; case: a REJECTED first send, then a reconcile → no "already", truthful tally.

M-b (MEDIUM, predates r17) a letter whose send "failed" (any 4xx but 406, any 5xx but 502/504 for a non-money letter, 401 for
  all) is resent EVERY HOUR for 14 days with no cap: 2 audit rows (attempt + outcome) per holder per hour into the unprunable
  chain (maswali-notify.ts:505 doneIn→false on "failed"; :567-589 sendLetter; reconcile :1168-1170). A dead/rotated
  POSTMARK key (the 2026-10-21 Railway env-var rotation) = holders × 48 rows/day for every week settled/voided in 14 days.
  Fix: cap definite-refusal retries per letter (e.g. 3 "failed" outcomes → list it on the integrity card like an unresolved
  letter, no further sends), or skip sends while emailHealth() is DOWN except one probe letter per run. Case + plant.

L-c (LOW) lease without fencing: a run that stalls >~200 s between keep() and its attempt record can overlap a successor
  that took the expired lease → one holder's letter twice (SMS and bell are keyed; the letter attempt is not a reservation).
  maswali-notify.ts:249-255, :1073/:1106/:1148 (keep per holder), :570 (attempt). Fix: re-check the lease (strict read,
  holder === me) immediately before job.send, or make the attempt a reservation (unique per target+notice+attemptNo).

L-d (LOW) B2's `unread` holders are never surfaced: after 14 days the reconcile drops the week (NOTICE_RECONCILE_DAYS) and
  nothing lists the holder. Fix: the integrity card lists runs whose newest record has letters.unread>0 (as unresolved).

L-e (LOW) card sentence (integrity/page.tsx:191) true only for 2 of 5 unresolved causes: address changed / pepper rotated
  (never searched) and second "absent" (never resent) — "its own search could not say" + "may send once more" are false for
  those. And the card names no holder, so "check the provider's activity" is not actionable for refunds. Fix: per-cause
  counts or neutral wording; give the officer the tag + attempt dates (or the accounts, compliance-only).

L-f (LOW) clearUnresolvedLetterAction note ignores r.closed (actions.ts:~96): "Recorded: the letters were checked." also
  when 0 closed. Say "N letters closed — never searched for or sent again".

L-g (LOW) duplicated money/fact formulas: maswali-notify.ts:1062 `carried = rolloverIn + carryOut` = S5's carriedForwardOf
  (maswali-player.ts:569 on S5); :672 nextWeekOf duplicates S5's nextWeekOf; eat-day.ts eatWeekNumberOf duplicates S5's
  weekNumberOf. At the merge: one exported helper each.

L-h (LOW) hookContext masks "in a lock" inside ANY runCommitted callback, including afterCommit's run-now branch for a
  foreign tx (locks.ts:105-112: tx truthy but not ctx.tx → runs BEFORE that tx commits, with depth 1). No call site does it
  today (results-freshness census). Fix (optional): only the null-tx and queued paths count as committed.

L-i (LOW) the untagged refusal MILLIONEA_UNTAGGED (millionea-claims.ts:75) tells an officer to "tag the campaign Millionea"
  while Millionea is WITHDRAWN — a tag then refuses MILLIONEA_NOT_LIVE; and it names the dark product to marketing staff.

Sound (checked): locks.ts committing.depth (sync-only, finally-balanced, only hookContext reads it); B1 rename + census (no
global name declared with two types across S5/S7/int/R/N — scratch globals-all.txt); B2 counter; M1 awaited check; M5
lock/lease order (check refuses beside running()/checks()/another lease; holds lease+checks while closing and recording;
records read whole first; 11d.1–11d.6 incl. PG lease); search window ±day; digest metadata; boot write never throws (outer
try + inner catch-all), runs after the schedulers; migration guard/retry/recovery shape (S2-BOOT-1 precedent).

Classic-campaign flag: flag path changes nothing sent (render with MILLIONEA_EXEMPT, audit row once a run, card sentence);
changes: (1) epoch unreadable + only the rules refuse → slice WAITS rules_unreadable (until null) — a malformed stamp row
waits such campaigns forever (millionea-lint-epoch.ts: malformed → null, never stamped over); (2) started/resumed after the
epoch → judged in full: untagged body with a Millionea signal (incl. "milioni", jackpot, a figure ≥ 1M) refused/paused;
(3) any Han-script body refused (L4) for every campaign. These ship LIVE with Millionea WITHDRAWN.

MERGE SEMANTICS found by me (N × S5, maswali-service.ts — S5-FIX-SRV "audits after the commit", recordOwed :725):
  · S5's owed payloads for maswali.question.sealed (:781-782), .confirmed (:823), .corrected (:886-887) carry NO sealedAt;
    N's notices key voids/corrections on payload.sealedAt (maswali-notify.ts sealSteps :819-833, lastFinalBefore :840-851,
    becameVoidAt :858-869). Dropped → a VOID→VOID ground change is told again; a two-officer correction is never told
    (lastFinalBefore returns the current record). MERGE MUST add sealedAt (seal: at; confirm: q.sealedAt; correct:
    correctedAt) to S5's owed rows.
  · Launch order: noticeQuestionVoided / noticeQuestionCorrected / noticeCloseMoved must be launched AFTER
    `await recordOwed(res.owed)` (the records they read land there; auditFlush cannot flush a row not yet queued);
    noticeCloseMoved only when `recorded` is true (else it ALARMs and tells nobody anyway). moveClose's S5 signature
    (expectedClosesAt, {recorded}) wins.
  · closeWeek: keep N's afterCommit(currentLockTx(), hookContext …) inside the seal, after the stamp, in S5's shape.
R × S5 (H.10e): R's harm-watch H.10e scans COMPLIANCE-DECISIONS.md, marketing/rg.ts, rg-doors.test.mts,
  campaign-audience.test.mts (harm-watch-cases.mts:436-446 on R). main's 2026-10-21 entry "Harm markers muted" says "the
  automatic harm marker `LATE_NIGHT_PLAY` (5 and 9 bets between 00:00 and 06:00 EAT in seven days, from staff testing)"
  → a marker name + a time unit + a counted figure in one sentence → H.10e RED after R lands (and it publishes the
  marker's window in a public repo). Reword in R's merge commit (Ali's quotes verbatim; say what the markers enforce,
  point at the published RG policy). rg.ts conflict (R-S5): keep main's MUTED line + R's comment ("the only detector").
Perf (LOW): unreachedWinners per console load = per-winner reads (seenFor, holderOf, existsWithHref per ticket) — S7's
  7,000-winner final week → tens of thousands of queries per /admin load; reachedByDeskOf limit 500 unchecked.
Lead-key (LOW): result bell key uses lead = paid[0] ?? won[0] (maswali-notify.ts:1080): a hold/forfeit/release between a
  run and its reconcile re-run changes the lead → a second WIN bell (letter/SMS keyed per account, so only the bell).
  Fix: key on won[0] (stable), link may still prefer paid[0].
Acceptance gap: S7's S17 rush and S16 10k settlement were measured WITHOUT N (S7 has no maswali-notify reference): re-run
  both on the integrated head (each purchase now launches a receipt: import + existsWithHref + dedupe read + insert), and
  time a result notice run at 7k winners / 10k holders on Postgres (lease renewals, Postmark pace).

Migration: 20261018120000 < production's applied 20261018150000_counts_as_by_hand (out of order; S7's 20261018130000 too) →
prove `prisma migrate deploy` on a throwaway DB holding production's exact set + verify:backup-schema; measure prod
"SmsMessage" size read-only (Ali approves).
