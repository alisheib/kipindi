# Player Market Proposals → Instant Approval Bonus

_Last rebuilt 2026-07-05. Supersedes the old "prize on listing + resolution" model._

Players propose markets; an officer reviews. The reward for a good proposal is a
**non-withdrawable bonus-wallet grant paid the instant an officer approves** —
there is exactly ONE reward path and it fires at approval, never at
listing/resolution.

## Lifecycle

```
REVIEW ──approve──▶ APPROVED ──go live──▶ LISTED ──market resolves──▶ RESOLVED
   │                (bonus paid here)      (market created here)       (status only)
   ├──request changes──▶ CHANGES_REQUESTED ──approve──▶ APPROVED
   └──decline──▶ DECLINED
```

- **REVIEW / CHANGES_REQUESTED** — open states. Votes only *rank* the queue; an
  officer always decides. Players may vote here.
- **APPROVED** — officer approved; the proposer's bonus has been granted. The
  market is **not** live yet. Terminal for the reward: no further bonus is ever
  paid for this proposal.
- **LISTED** — officer published it live (separate action); the real Market now
  exists and accepts predictions. No bonus logic here.
- **RESOLVED** — the market settled. `onMarketResolved` only flips the status for
  display; it moves **no money**.
- **DECLINED** — terminal; no bonus.

## Source link (required)

A proposal cannot be submitted without a valid `sourceUrl` (http/https, ≤ 500
chars). Validated client-side (create-form) and server-side (`validateSourceUrl`
in `proposals-service.ts`, single source of truth). At go-live the officer
confirms/edits the URL and it is checked against the trusted **source registry**
(`/admin/sources`) exactly like a direct market create.

## Reward = bonus-wallet grant, exactly-once

`approveProposal(proposalId, officerId)`:
1. Runs under `withLock("proposal:<id>")`.
2. Only a **REVIEW / CHANGES_REQUESTED** proposal can be approved. Once it is
   `APPROVED` the status guard makes a re-approve a no-op → the reward is paid at
   most once (double-click / retry / re-review safe).
3. Grants `prizeTzs` via `creditBonus(..., { source: "PROPOSAL", sourceRef:
   "proposal:<id>" })`. The `sourceRef` gives a second, independent idempotency
   layer (a partial failure where the grant landed but the status write was lost
   cannot double-credit — the retry dedupes on `sourceRef`).
4. If the bonus program is disabled / the wallet can't take a bonus, it falls
   back to a real credit (`creditInternal`) and audits it — the promised reward
   is never silently lost. If even that fails, approval is refused so an officer
   retries (no half state).
5. Records `bonusGrantedTzs`, `bonusGrantId`, `approvedAt` on the proposal;
   notifies + emails the proposer.

`prizeTzs = 0` approves cleanly with no grant.

The bonus follows the standard bonus-wallet rules (default 5× wagering, 30-day
expiry, sequential queueing) — see [bonus-wallet-plan.md](./bonus-wallet-plan.md).

## Design decision — market created at go-live, not at approval

Approval does **not** create a hidden draft market. The market is created only at
the explicit **go-live** step (`goLiveProposal`). Rationale: one market-creation
path, no orphaned/hidden drafts cluttering the markets store, and the officer
gets a final source-trust check at publish time. Approval is purely: pay the
reward + mark `APPROVED`.

## Notifications & email (mirrors the KYC pattern)

- **On submit** — proposer: in-app + email ("we're reviewing"). Officers
  (ADMIN/COMPLIANCE/MODERATOR): in-app bell + email with the source link,
  proposer, and titles, deep-linked to `/admin/proposals`.
- **On approve** — proposer: in-app + email ("approved, bonus TZS X credited").
- **On go-live** — proposer: in-app + email ("your proposal is now a live market").
- **On changes / decline** — proposer: in-app + email with the officer's note/reason.

All best-effort (never block the mutation). i18n: en/sw/zh parity enforced by
`npm run test:i18n`; email bodies are bilingual EN+SW inline.

## Data model (Prisma `Proposal`)

New / changed columns (migration `20260705120000_proposal_approval_bonus`):
- `status` enum gains `APPROVED`.
- `sourceUrl String?` — player-supplied source (required at app layer).
- `bonusGrantedTzs` — bonus granted at approval. **Reuses the old `prizePaidTzs`
  column** via Prisma `@map("prizePaidTzs")` (no data migration).
- `bonusGrantId String?`, `approvedAt DateTime?` — audit/idempotency trail.

## Tests

`npm run test:proposals` (`scripts/proposal-approval-bonus.test.mts`, in-memory,
wired into `predeploy`) covers: source-URL validation, approve exactly-once +
re-approve blocked (no double-credit), decline/changes grant nothing, go-live
grants no extra bonus, resolution moves no money, and the `prizeTzs = 0` path.

Runtime E2E over HTTP: `POST /api/dev-test/proposals-e2e` and
`/api/dev-test/proposals-security` (404 in prod).
