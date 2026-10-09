# C8a — an erasure stands until a new consent (brief for the builder)

## Context — a LIVE data-protection defect
50pick (a licensed Tanzanian betting platform; push to main = live) erases a person on request. For marketing, the
erasure (src/lib/server/marketing/erase.ts — read its long header first, it is the design) does two things that matter
here: it EMPTIES every book row of the person (the row stays as a TOMBSTONE: `sourceRef` = `ERASURE_EVIDENCE`, no name),
and it appends an ERASURE MARKER to the consent ledger on the account's own number (a WITHDRAWN row, `source` OPERATOR,
`evidence` = `ERASURE_EVIDENCE`). The marker is deliberately NOT a stop: Tanzanian numbers are recycled, so "a later
GIVEN lifts it" — the number's next holder can still say yes (`test:campaign-privacy` P11).

Two defects, found by a read-only review against the live code (2026-10-09):
- **#2 — a later WITHDRAWN lifts the erasure.** The contacts importer's rule (src/lib/contacts/import-decide.ts
  `isErasedNumber`, ~line 409) and the facts it is fed (src/lib/server/contacts/import-check.ts carries only the
  number's LATEST ledger row) treat a number with NO book row as erased only while the ledger's LAST row is the marker.
  A later tap on an old `/s/` link writes WITHDRAWN `optout:…` (src/lib/server/marketing/optout-service.ts ~267) —
  after which an import of an old spreadsheet creates the person again with their name, e-mail, notes and tags. (A
  later GIVEN — Resume ~312, or a new consent — lifting it is BY DESIGN and stays.)
- **N2 — no marker at all.** erase.ts skips the marker when the number's latest row is already WITHDRAWN ("so a second
  pass appends nothing"), so a person who had OPTED OUT before being erased carries no erasure mark: the importer and the
  Add form (src/lib/server/contacts/contact-write.ts `lookupContactNumber` / add, ~236-300 — it checks the tombstone
  only) both create them again.
Numbers WITH a tombstone are safe today (the tombstone decides alone; an update cannot land on it; a create meets the
unique number). Keep that exactly.

## The decision (S15-15 — made, do not reopen)
- **ONE rule, "does an erasure stand on this number?"**: the latest of the number's ledger rows that is EITHER a GIVEN
  OR an erasure marker is an erasure marker. Any other row after it (an opt-out WITHDRAWN, a lapse, anything that is not
  a GIVEN) does NOT lift it; a GIVEN does. A number with a tombstone stands erased by the tombstone, whatever the ledger
  (unchanged). Put the pure rule beside `ERASURE_EVIDENCE` in src/lib/marketing/erasure-mark.ts (client-safe, pure) so
  `decide()` and every server caller read the same binding.
- **The facts carry it.** The importer's facts loader gets, per number, whether an erasure stands — through ONE grouped
  DAL read over the run's numbers (a new member on `db.messagingConsent`, in BOTH twins — src/lib/server/store.ts and
  src/lib/server/prisma-dal.ts — with a `test:dal-parity` section and its red-dal-parity mutation cases, and a case in the
  PostgreSQL probe `scripts/live/contacts-import-pg-probe.mts`). `decide()` reads that, not the latest row. The commit's
  per-step re-decision (src/lib/server/contacts/import-commit.ts) must read the SAME fact, so a marker written between the
  check and the commit still keeps the row (prove it).
- **The Add form asks the same rule** for a number with no book row: a number on which an erasure stands is refused
  exactly as a tombstoned number is today (same answer, same sentence, no id). (Whether that sentence itself reveals an
  erasure is a separate design question, C8b — do NOT change the sentence or the tombstone answer here.)
- **erase.ts marks every erasure:** the account's own number gets the marker unless its latest row IS ALREADY an erasure
  marker (a re-run still appends nothing). Keep every other rule of erase.ts exactly (other numbers: only a GIVEN is
  withdrawn; another live account's number untouched; idempotent).
- Find every other place that decides "erased" for a number (grep `ERASURE_EVIDENCE`, `isErased`, `sourceRef`,
  audience.ts, the dev seed) and make each either use the ONE rule or say in a comment why it needs only the tombstone.
- **Past erasures:** an account erased since U18b whose number had already opted out carries no marker, and its number
  is gone from `User` by design — it cannot be found now. Do not invent a backfill; say so in erase.ts's header (the
  integrator records it).

## Proof (house style — labels, red plants; every plant fails its OWN label)
- `decide()`: a ledger-only erased number followed by an opt-out WITHDRAWN stays erased (collapses to KEEP, shown as
  X22 says); followed by a GIVEN it is an ordinary new number; a tombstone decides alone.
- The facts read (both twins + dal-parity + the pg probe), the commit's re-decision (a marker written after the check).
- erase.ts: an account that opted out, then erased → the marker appended; a second pass appends nothing
  (`test:erasure`, `test:campaign-privacy` — read them and extend in their style).
- The Add form: a ledger-only erased number refused like a tombstoned one (`test:contacts-form` or its suite).
- Run (through the lock): typecheck, test:contacts-import + red, test:erasure, test:campaign-privacy (+ red if it has
  one), test:dal-parity, red:dal-parity (slow, ~8 min), test:contacts-form + red, test:contacts-staging, test:red-anchors,
  test:orphans (two landing-v3 panel scripts fail on main already — not yours), test:docs, and
  `npm run test:contacts-import-db` (embedded PostgreSQL; heavy — through the lock like everything else).

## Rules of the house (binding)
- Read docs/CONTACTS-SCREEN-PLAN.md §0, §1 (rows C3–C5, C8) and §4.3 first. Do NOT edit the plan doc or the marketing
  tracker (the integrator records the step); DO correct every comment your change makes untrue (erase.ts's header,
  import-decide.ts's rule 1, contact-write.ts's lookup).
- Never quote a number or a name in a sentence, a log or an audit row.
- Build control characters and backslashes from their codes (the editing tools decode escape text); never write source
  through a heredoc, sed or Python; never a class-shaped string in a comment in src (Tailwind scans comments); files are
  CRLF — use the Edit tool.
- ⛔ RAM: run Node ONLY through the lock, one job at a time:
  `bash /c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/2540536f-6d58-44e1-b079-609d2a18516a/scratchpad/fastlock.sh c8a-builder <command>`
  from your checkout (it waits — other builders and batteries hold it for up to 20 minutes; never touch the lock).
  NEVER next build, next dev, Playwright, npm install / npm ci (node_modules is a junction into another tree), prisma
  generate (the schema does not change in this step — if you find it must, STOP and say why in your final message).
- Git: only your checkout and branch; small commits; push each to its origin branch; never main, never force.
- Your final message is all that is returned: what you changed (files, functions), every decision beyond this brief with
  its reason, the exact results you saw through the lock (counts; red caught/total; any plant left green), the commits
  (sha + subject), and plainly what is NOT done or NOT run.
