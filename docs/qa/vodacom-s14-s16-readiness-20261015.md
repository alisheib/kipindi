# Vodacom S14–S16 execution record and evidence gate

**Status, 2026-10-15:** S14 has not been performed. The five deck frames have 52 element checks, all still open in
[`vodacom-s14-evidence.json`](vodacom-s14-evidence.json). `e2e:journey` is specified in
[`VODACOM-PLAN.md`](../VODACOM-PLAN.md) §5 S14, but no package command by that name exists on the `c8a982cd7` base of this
record. The S10 build lane may supply part of that drive; inspect its merged result before creating another. No real
staff payment, agency sign-off, owner override, S15 go, or S16 elapsed period is recorded here.

The plan and its dated amendments control behavior. The five agency PNGs control **element order and intended copy**;
[`DESIGN_AUTHORITY.md`](../DESIGN_AUTHORITY.md) controls 50pick appearance. In particular, use the later NDIO wording in
the live dictionary, the neutral estimate treatment, the TZS 500 betting minimum, the TZS 1,000 deposit minimum, and
the owner's removal of the helpline from the How-to sheet. Do not mark a frame wrong because its current approved
appearance differs from the old deck's palette or old `NDIYO`/helpline text.

## S14: proof before the flip

1. Integrate and verify S8–S13 on one exact commit. Keep `/api/health.simpleJourney` at `STAFF_PREVIEW` and the ordinary
   player on the classic route. Record the commit, build, full local gate, production read-back, and open defects.
2. Add/run the actual `e2e:journey` command on a **local, disposable** server with a mock payment rail and dev outbox.
   It must drive guest → sheet → registration → short balance → deposit → waiting → return → a separate player press
   to place exactly one bet. Check replay, failure and pending paths. Do not substitute the older
   `scripts/browser-journey.mjs`, which drives a different card flow and has an undefined `gateShown` summary variable.
3. Read viewport tiles at **320/360/390/768/1024/1280/1440 × sw/en/zh × guest/signed-in**, plus open keyboard and
   short height states. For each of the five frames, tick each ordered element in the JSON after reading the actual
   screenshot and source strings. Record the frame's redacted read report. The five images are under
   `docs/design-system/v5-2026-09-29-simplified-journey/frames/`. A collage alone does not count as the read.
4. Run an adversarial refute and mutation audit of the real flow: altered market/side/stake, repeated callback,
   stale pending bet, insufficient balance, return before confirmation, and a failed payment. Record observed
   positions and ledger consequences in local data. Prepare the **predeploy gate census**: each existing guard that
   assumes classic/preview behavior, the S15 replacement assertion, and the person responsible. `qa:live` must be
   dual-mode before the flip.
5. Arrange the **one real TZS 1,000 staff-preview journey** with Ali. Record the named operator and staff account
   privately, the production commit and preview state, funding path, stake, time, payment reference if a new deposit
   is made, bet reference, and before/after balance and ticket result. The pending bet must return and require a
   separate press; no automatic bet. Keep credentials, phone, and unredacted receipts out of Git. This is a real-money
   act and is not inferred from a local mock, a read-only QA login, or an existing player bet.
6. Prepare the seven-day private agency preview link and a side-by-side PDF using the **real** captured screens. Ali
   or an explicitly authorized sender shares them. File the agency's written sign-off, or Ali's explicit override, in a
   redacted record that identifies where the original is retained. A draft reply or an unsent preview is not sign-off.

`npm run test:s14-evidence` checks the record's shape and rejects unsupported completion claims. It is green while
honestly pending. `npm run red:s14-evidence` plants missing checks, fake evidence and premature approvals in memory.
`npm run gate:s14` deliberately exits nonzero until every S14 check and proof above is complete. A completed entry
uses an evidence object such as:

```json
{
  "path": "docs/qa/<committed-redacted-read-record>.md",
  "checkedBy": "<reviewer>",
  "checkedAt": "<actual ISO timestamp>",
  "commit": "<full 40-character Git SHA read>"
}
```

The path must exist under `docs/qa/`. The validator checks presence, shape, time and SHA format; it cannot authenticate
an email, payment or human approval. The integrator reads every linked artifact before treating the gate as passed.

## S15: launch decision and measurement

`npm run gate:s15` also requires four redacted records: (1) a full **14-day pre-launch** baseline of the five agency
measures; (2) the integrated S8–S13 exact-tip proof; (3) production configuration, including admin TOTP and signing
secrets for each enabled payment webhook; (4) the ready kill/rollback procedure. The separate `ownerGo` record must
name **Ali**. As observed on 2026-10-15, production had `DISABLE_ADMIN_TOTP=true` and absent or placeholder
SELCOM/AZAMPAY/MIXX webhook secrets; the owner and ops must resolve which rails are enabled and the safe configuration
before a public flip. Never put the secret values in the evidence file.

Only after those records and the S14 gate pass, prepare the one S15 flip commit (`simpleJourney=ACTIVE` plus all paired
copy, legal version, redirects, service-worker cache, manifest and gate rewrites in the plan). Verify the exact deployed
commit and dual-mode browser drive, then record `launchAt` and a real-player read-back. Watch the plan's rollback
triggers: any money-invariant alert; bets/day under 70% of baseline for three days; deposit-confirm rate down over
20%; or a P1 defect. Use the admin kill or env override if one occurs, and record the response. The approval to
launch is not implied by the user's general instruction to finish the plan.

## S16: wait for actual evidence

`npm run gate:s16` requires a real `launchAt` at least **seven full days** in the past, the S15 production read-back,
an agency acknowledgment, no rollback, and shelving proof. The measures record must show each of the five measures
at or above its 14-day baseline after day 7 and neither daily harm marker (rapid deposit escalation or chasing losses)
above its own baseline, per the 2026-10-14 owner ruling in
[`COMPLIANCE-DECISIONS.md`](../COMPLIANCE-DECISIONS.md). Only then unmount the old paths together and run
`test:shelved` with its red proof. A calendar estimate is never evidence that seven days elapsed.

## Owner/agency acts still open

| Act | Needed record |
| --- | --- |
| Name the staff operator, account and funding path for S14 | Real TZS 1,000 preview journey, with redacted money references |
| Agency written sign-off, or Ali's explicit override | Original retained privately; redacted decision record committed |
| Resolve admin TOTP and each enabled provider's webhook-signing configuration | Ops read-back with values masked |
| Ali's S15 go after reviewing the complete S14 and baseline evidence | Explicit dated approval |
| At least seven real days after S15, healthy measures and agency acknowledgment | Dated S16 report and `test:shelved` proof |
