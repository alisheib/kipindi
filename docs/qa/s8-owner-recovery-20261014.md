# S8 account recovery preparation — 14 October 2026

Review candidate in `C:\Users\asheib\.codex\worktrees\vodacom-s10\kipindi-main`, on `codex/vodacom-s10`.
The clean f7 auth-carry checkpoint was merged with `origin/codex/vodacom-s8`, without reset, yielding
`26b5df69b53fe8f6995bd2fcc32ec110cd57f97b`. This is recoverable preparation for root integration, not a LIVE release.
The unrelated dirty `C:\kipindi-main` checkout is preserved. Root owns final integration, branch parity, CI and release.

## Problem and policy

The old host recovered unfinished request keys from one ownerless, 24-hour `kp-pending-bet` envelope. In a retained
browser tab, a different account's authenticated key read returns null. That null could eventually retire the first
account's outstanding key, and a later return could mint a different request for a bet whose outcome was unresolved.
A cached root shell could also apply a private wallet/answer from a different active account.

The reviewed policy uses three distinct namespaces, each with exact readback before a new dispatch:

| Key | Contents and lifetime |
| --- | --- |
| `kp-pending-bet` | Keyless unplaced question/side/amount, original referral/campaign tags, time, and optional signed-in owner. The original 24-hour selection boundary remains. Keyed historic data never becomes an ordinary prefill. |
| `kp-sheet-intents:v2:<viewerId>` | This authenticated account's original unfinished quote/key/time. No age or quota eviction. Another owner's writer changes only its own namespace. Remove a pending entry only after its owned receipt or a successful owned null check after the existing conservative 10-minute recovery wait. |
| `kp-sheet-intents:legacy:v1` | Complete old ownerless envelopes and exact authenticated positive receipt proofs, retained until tab close. Never assign to the first account that signs in. Foreign/null/expired reads cannot adopt or retire a key. A matching original-account key/question/side/amount receipt ends only that entry's block; historic bytes stay archived. |

Each recovery envelope is bounded to 64,000 string units; browser quota is finite too. Corrupt, conflicting, oversized,
or unreadable storage refuses dispatch without choosing or evicting a key. Identical legacy duplicates within each
original envelope retain its earliest timestamp; the archive deduplicates equal tuples across envelopes in record order.
Conflicting same-key tuples, including conflicts across archived envelopes, fail closed.
A failed write/readback attempts to restore the prior bytes and leaves the runtime recovery lock closed.

## Implementation to review

- AppShell passes its authenticated `viewerId` and keys the host by that identity. Guest host activation is unchanged.
- Every successful private sheet read carries the authenticated viewer ID. Positive key reads carry their original
  market/side/stake tuple, including closed questions. The public response contains no viewer data.
- Missing identity and bare 404 are unreadable, not an owned null. A foreign private identity or a known 401 invalidates
  the runtime epoch, clears private runtime maps, and refreshes the document without clearing another account's cookie.
  Late action and private responses cannot revive that epoch. Durable keys stay in their original namespaces.
- Explicit sheet taps include `expectedOwnerId`. `buyPositionAction` authenticates its own session first and refuses a
  missing/different sheet hint before any money call. The hint grants no authority; classic callers retain their own
  authenticated session behavior. `SESSION_CHANGED` is explicitly classified as a conservative key-holding fallback;
  the host handles it by invalidating its account epoch.
- Receipt/null retirement must verify durable saving before allowing a new runtime request. A quota/readback fault
  restores the runtime record and keeps the new-commit lock closed. This includes a known positive receipt.
- SessionPresence handles a different active owner before the old inactive-session 60-second escape throttle. Rapid
  A→B→A changes refresh both owners without signing out the valid account. Stale disposed checks do nothing.
- Root's exact native-event-only `flushSync` change from `11d7fb8e1` is carried in the isolated host; no effect/lifecycle
  flush was added.

## Measured evidence

All paths below are under `F:\50pick-work`; no real database or production account was used.

| Check | Result | Evidence |
| --- | --- | --- |
| New storage/controller/action/published-word contracts | 36 assertions pass, including actual source callback and money-action plants | `s10-owner-recovery-unit-final-20261014.log` |
| Actual owner browser | 9/9, zero uncaught page errors, matched Next16.2.4 before the shared ancestor upgrade | `generated\qa-s10-owner-run4-20261014\evidence.json`, `s10-owner-browser-run4-20261014.log` |
| Existing host source controls | 36 controls and 53 actual source plants pass | `s10-owner-bet-sheet-host-red-final-20261014.log` |
| Existing sheet matrix/census | 114/114 red controls caught | `s10-owner-bet-sheet-red-final-20261014.log` |
| Private/public API contracts | 41/41 red controls caught | `s10-owner-journey-sheet-red-final-20261014.log` |
| Auth carry | 20 actual source plants caught | `s10-owner-auth-carry-red-20261014.log` |
| Privacy facts and plants | 116/116 | `s10-owner-privacy-checks-20261014.log` |
| Published legal words | 64/64 | `s10-owner-published-words-checks-20261014.log` |
| Legal saved-line/version contracts | 11/11 | `s10-owner-policy-lines-20261014.log` |
| Layout/session staleness | 75/75 | `s10-owner-layout-staleness-20261014.log` |
| Client graph | 6/6, no client-reachable Prisma | `s10-owner-client-graph-checks-20261014.log` |
| Source bytes | 7/7 | `s10-owner-source-bytes-final-20261014.log` |
| Comment reader | 22/22 | `s10-owner-decomment-checks-20261014.log` |
| TypeScript | Exit 0 | `s10-owner-typecheck-final-20261014.log` |
| Existing selected browser (once/host/lifecycle/lock, en/390) | 62 passed, 0 failed, 0 outstanding; 17 tiles inspected; matched Next16.2.4 | `s10-owner-existing-coherent-20261014.log`, `generated\qa-s10-owner-existing-coherent-20261014\evidence.json` |

The actual browser result includes a 36-hour-old owned request, A→B→A on the same question with different keys,
a foreign authenticated null after the recovery wait, zero bets on observation, one explicit original-key retry,
positive/null retirement failures under injected storage quota, and an expired legacy key held under B then resolved
only by A's exact positive receipt. It reads the player's real local positions and BET_PLACED rows; it fabricates no
money result. The receipt and locked-storage screenshots were visually inspected at 390px: readable figures and
status, aligned borders, retained disabled stake/action, and the existing kit's sheet/receipt structure.

The actual source cases also cover 401→late A private positive answer and commit→401→late A success, while preserving
the original durable key. Exact namespace/lifetime/owner/legacy-retention word changes in all three languages are
rejected by the published-word comparator; unrelated legal words continue to compare against `origin/main`.

The 9/9 evidence file was completed at 2026-10-14 04:28:30 UTC and has SHA256
`AFB5A8214233AFF3588D90FD9E1E86A737D584FF37E0C4788F2A2BDC26ED0EBC`. The coherent candidate's Git blob identities
(line-ending-normalized source, before any checkpoint) are:

| Source | Git blob |
| --- | --- |
| BetSheetHost | `57daad2c3799a05b601282f85f3563fb73993123` |
| Account/legacy storage | `69e21a0d147dc74e9d6678c33046e8780983e845` |
| Owner source contracts | `8b25a904d1972fbc483fb8e7ee2cfaf0668fc57c` |
| Owner browser driver | `148004727c0c32ba3e6ee99509b6d340d882c0ec` |
| Existing selected browser driver | `e650ef5c376830dfb67adf0bf9d2cc669f2d9ac2` |

The first browser runs are retained as failed premises: the diagnostic write-fault init order, a client-clock advance
before swapping cookies, and a reused local fixture nonce across fresh owners. The final driver derives unique UUIDs
per run, advances the recovery clock only after the new authentic cookie is installed, and installs the quota fault
from a diagnostic tab flag before application scripts. No product rule was weakened to make those drives pass.

## Privacy scope and continuation

Only the three separately marked technical §7 paragraphs and the matching version labels change. The page and
`POLICY_PAGES.privacy.codeVersion` are 2026-10-14. Whole English block: `ec751bf6da90`; exact marked paragraphs:
English `fb825bd6a8a3`, Swahili `8b4d6871dca3`, Chinese `6e4b8029bd17`. The dated compliance entry describes the
actual account namespaces, indefinite unresolved-key lifetime, and complete historic archive through tab close.
The existing 59 journey dictionary additions and all unrelated policy prose remain pinned.

Existing `qa:bet-sheet` storage probes were updated to read the current authenticated owner's v2 namespace. Its former
foreign-ownerless-key case now requires quarantine and a disabled new dispatch. Its slow-null criterion is measured
before resuming the diagnostic browser clock for the screenshot's two paint frames; the comparator/criterion does not
change. The first selected run passed the assertions through slow-null, then stalled at that paused capture seam.
That incomplete run is not a completed gate. Subsequent fresh Turbopack and webpack attempts correctly refused a bad
fixture premise: generated F output resolved external Next to root's upgraded16.4.0 through the shared ancestor,
while this tree's real C compiler was16.2.4. The mixed runtime requested missing `preview-props.json`; its failed
logs/output are retained under `s10-owner-existing-final/fresh/webpack-20261014.log` and their corresponding folders.
No product code or generated manifest was patched to absorb this failure.

The fresh coherent F output has its own `node_modules` junction to this tree's real C dependencies; the shared F
ancestor and root dependency installation were untouched. Actual generated health-route resolution now binds
`C:\Users\asheib\.codex\worktrees\vodacom-s10\kipindi-main\node_modules\next\package.json`,16.2.4, matching its compiler.
Health answers the local memory premise (database unconfigured, STAFF_PREVIEW). The fixed full selected run
(once/host/lifecycle/lock, en/390) completed with exit0, 62 passed, 0 failed and 0 outstanding, in
`s10-owner-existing-coherent-20261014.log`, output `generated\qa-s10-owner-existing-coherent-20261014`.
All 17 tiles were inspected: receipt rows/amounts, editable and locked stakes, retry/disabled actions, unknown balance,
low-balance rows and the reduced-motion reopen retain the existing kit geometry and readable borders/figures.
Its evidence SHA256 is `D76E82FCD942D35C2E9A123285F2CA857BD1D6D59256C87519C0C07446CAC413`.
Only those selected en/390 sections are passed; this does not complete all WP11 locales, widths, production budget,
or unselected rows. Root's production16.4.0 and final release gates remain separate.

The exclusive local memory fixture is on 3049, with real C dependencies and `.next` on F. No scratch database was
started. Final root branch parity, full release CI/build, production commit/host/health/chunk verification, required QA,
external approvals and elapsed observation remain root's gates. These local preparation proofs do not mark them passed.
