# C8b — what a masked officer may know: the technical half (brief for the builder)

## Context
50pick (a licensed Tanzanian betting platform; push to main = live). A privacy survey of the contacts book and the
importer (2026-10-09) is recorded in docs/CONTACTS-SCREEN-PLAN.md §4.7 — READ IT FIRST, whole: the rules (D19: a
masked officer never learns a player fact; X22: a browser never learns a number was erased), the fourteen surfaces, the
model, B1–B8, the residuals, and the surfaces SHARED with another session's campaign lane. A "masked officer" is a role
whose `identity.contact` cell is not `read` (src/lib/server/roles.ts); in practice GROWTH. Step C8a (already on main when
you start — read its commits) made "does an erasure stand on this number?" ONE rule and made erase.ts always write the
marker. You build the technical calls that are DECIDED: **B1 (the rest), B2, B5, B6, B7.** B3, B4 and B8 wait for the
owner — do NOT build them.

## What to build
- **B1 — `bookBlocks(n)`, one test.** A number is blocked when it has a tombstone (`sourceRef` = the erasure evidence)
  or an erasure stands on it (C8a's rule). Use it in the Add form's lookup and Save, in `decide()`'s facts, and wherever
  else a "may this number be written?" question is asked (grep). The block is lifted ONLY by the holder's own act: a later
  GIVEN (C8a), or a NEW ACCOUNT registering the number — then `registration-contact.ts` (read it whole; it is the one
  writer of a sign-up's book row) REVIVES the tombstone as the new client's linked row (link, name, the row a sign-up
  writes today) in ONE transaction, instead of today's `kept_erased`; and erasure (erase.ts) DELETES the tombstone's list
  memberships when it empties a row, so a revived row inherits no old list or coverage. Both twins; dal-parity; the pg
  probe if the DAL changes; `test:erasure` / `test:campaign-privacy` / `test:registration-contact` extended in their style.
- **B2 — the Add form.** A blocked number answers exactly like a number already in the book ("already in the book",
  `CONTACT_DUPLICATE`) at the lookup AND at Save — never `CONTACT_ERASED`'s "can't be added". A masked viewer's lookup and
  Save answers NEVER carry a contact id: the "Open the existing contact" link becomes a reader's control (a masked
  officer reads the sentence only). Readers keep the link for O/P/S; for a blocked number a reader gets the same
  "already in the book" with no link (there is no row they may open). Fix every test, copy and comment that described the
  old behaviour (`test:contacts-form`, contact-form.tsx, contacts-copy.ts, contact-write.ts).
- **B5 — list figures by viewer.** Today `live` (store.ts ~4077, prisma-dal.ts ~4760) leaves out account-linked rows,
  so a masked officer learns from a list's figure whether a number is a player's. New: a masked viewer sees ALL live
  members, linked included (tombstones still out), with coverage counted over the same set — it must EQUAL the campaign
  composer's count for that list (read composer-loader.ts / audience.ts to match it exactly); a reader sees today's exact
  figures plus "N with an account". Surfaces: the Lists card (lists-loader.ts, lists-card.tsx), the importer's list
  picker (import-commit.ts / import-decision-panel.tsx), the import result's coverage sentence (import-done-panel.tsx,
  import-copy.ts). ONE new DAL member in both twins (+ dal-parity + the pg probe). The list-basis COMPLIANCE audit row
  keeps the exact figures it records today.
- **B6 — the overview feed.** `/admin`'s feed (admin-overview-feed.ts, admin/page.tsx) shows SYSTEM rows
  `contacts.contact.registered|linked · MarketingContact#…` to every staff role — which book rows are players, live. Make
  those actions visible to COMPLIANCE (and the Owner, ADMIN, if the feed's existing rule for compliance rows includes
  them — follow that rule exactly) only; prove a GROWTH viewer's feed never carries them.
- **B7 — no shared label from a protected filter.** A READER can today build a tag or a list from a filter a masked
  officer may not use (consent, stop, source, player), which the masked officer then filters by. Refuse "tag" and
  "add to list" for EVERY viewer when the audience uses any of those axes (read `roleRefusal` / `campaignAudienceRefusal`
  in audience.ts — ⚠️ SHARED with the campaign lane: add a contacts-bulk-only refusal or extend the shared one without
  changing what the campaign path refuses today, and say which); a reader hand-ticking rows stays allowed (it is an
  audited choice). Its sentence names the way on ("Tag these by hand-picking them, or filter by something else").

## Proof and rules
- House style: labels + red plants, every plant failing its OWN label for its stated reason. Suites to extend and run
  (through the lock): typecheck, test:contacts-form + red, test:contacts-page + red, test:contacts-bulk + red,
  test:contacts-lists + red, test:contacts-import + red, test:contacts-audience + red, test:erasure + red,
  test:campaign-privacy + red, test:registration-contact, test:dal-parity + red:dal-parity (~8 min), test:red-anchors,
  test:read-tiers, test:pii-logs, test:rbac + red, test:orphans (two landing-v3 panel scripts already fail on main — not
  yours), test:docs, test:source-bytes, and `npm run test:contacts-import-db` once if the DAL changed.
- Shared files (another session's campaign lane reads them): change their behaviour for the campaign path NOT AT ALL;
  say in your final message every shared file you touched and why.
- Do NOT edit the plan doc or the marketing tracker (the integrator records the step); correct every comment your change
  makes untrue. Never quote a number or a name in a sentence, log or audit row.
- Build control characters and backslashes from their codes (the editing tools decode escape text); never write source
  through a heredoc, sed or Python; never a class-shaped string in a comment in src; files are CRLF — use the Edit tool.
- ⛔ RAM: Node ONLY through the lock, one job at a time:
  `bash /c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/2540536f-6d58-44e1-b079-609d2a18516a/scratchpad/fastlock.sh c8b-builder <command>`
  from your checkout; never touch the lock. NEVER next build/dev, Playwright, npm install/ci (node_modules is a junction),
  prisma generate (if the schema must change, STOP and say why).
- Git: only your checkout and branch; small commits; push each; never main, never force.
- Final message (all that is returned): what you changed, decisions beyond the brief with reasons, exact results seen
  through the lock (counts, red caught/total, plants left green), commits (sha + subject), and what is NOT done or run.
