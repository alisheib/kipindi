# Marketing SMS and the contacts book — the rules in force

> **One page, plain English, as of 2026-10-09** — for any session or staff member who needs the rules of the marketing
> SMS programme (campaigns, tests, the send gate) and of the contacts screen. Each rule names its source in brackets:
> a dated ruling in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) (by its heading — the keys are listed at the
> foot of this page) or the code file that enforces it. ⛔ **This page decides nothing.** When it disagrees with its
> source, the source is right and this page is wrong — correct it in the commit that changes the rule. Where the work
> stands is the tracker's business ([`MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`](MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md)
> §0 and §1; the contacts screen's [`CONTACTS-SCREEN-PLAN.md`](CONTACTS-SCREEN-PLAN.md)), never this page's.

## 1 · What a marketing SMS carries — exactly what the officer wrote

- The text sent is the officer's message with `{jina}` (the first name) filled in, and **nothing is added**: no footer,
  no source line, no "50pick 18+", no helpline, no stop link. A test sends the same text as the campaign would.
  [D-1009a item 1 · [`footer.ts`](../src/lib/marketing/footer.ts) `marketingFooter()` is empty ·
  [`campaign-template.ts`](../src/lib/marketing/campaign-template.ts), the one renderer]
- The message must **begin with "50pick"** — the officer types it; the composer refuses a message that does not.
  [D-1009a item 1 · `footer.ts` `composeMarketing`]
- **One SMS long**: 160 characters in the GSM alphabet, 70 once any character needs Unicode, counted on the whole
  message. [D-1009a item 1 · [`sms-compose.ts`](../src/lib/sms-compose.ts) `SMS_MAX_SEGMENTS`]
- Every recipient row still gets an opt-out token and `/s/<token>` still works for a link sent before 2026-10-09 — but no
  message prints a link. [D-1009a item 2 · `footer.ts` header]

## 2 · Who may be sent offers

- **Anyone with a Tanzanian mobile number**, under the Gaming Board licence, while the licence-outreach record
  (`marketing.outreach.licence`, Admin → System) is open. Consent is recorded when given; it is not a condition. While
  the record is closed, only a recorded SMS consent reaches a number. [D-1007a · D-1009a item 2 ·
  [`consent.ts`](../src/lib/server/marketing/consent.ts) · [`outreach-record.ts`](../src/lib/server/marketing/outreach-record.ts)]
- A number no account holds (a contact-book number) needs a basis and 18+ evidence of its own: a list whose licence
  basis and 18+ confirmation are recorded on the Lists card, or a recorded consent with an import attestation — or, for
  one typed test only, the officer's 18+ confirmation (§4). [`consent.ts` step 3 · CONTACTS-SCREEN-PLAN §4.3 S15-1]
- **The one send gate** (`mayReceiveMarketingSms`) is asked for every number just before its message leaves, and it
  always refuses: a number on the stop list or whose holder withdrew · an agent applicant's referee who was promised no
  marketing · a self-excluded player · a player on a break or showing a sign of harm · a player under 25 with a
  self-exclusion or a break on record · anyone under 18 or whose age cannot be confirmed · a suspended or closed account,
  or one whose identity check was finally refused · an erased number. [D-1009a item 2 · D-1007a "What it does NOT
  change" · `consent.ts` · [`dispatch.ts`](../src/lib/server/marketing/dispatch.ts)]
- **An erased person's number stays blocked** until its holder signs up or agrees to offers again; an old spreadsheet
  never brings the name back. [D-1009b item 1 · [`erasure-mark.ts`](../src/lib/marketing/erasure-mark.ts)]
- **One message per number per campaign**, and no per-person frequency cap — management decides each campaign's
  audience and timing. [D-1007b item 2]

## 3 · Sending — the confirmation, the switch, the window, the money

- A campaign is authorised by **one officer's typed confirmation**; it never sends by itself — **Start** is a separate
  act. [D-1004a]
- **Nothing sends while the live switch is closed** (`marketing.sms.live`; absent means closed). It is opened for a set
  time — 2 hours unless another is chosen, between 30 minutes and 24 hours — and reads closed again when that runs out.
  [D-1004a · [`live-switch.ts`](../src/lib/server/marketing/live-switch.ts) ·
  [`sms-settings.ts`](../src/lib/marketing/sms-settings.ts)]
- **The send window**: messages leave only between 08:00 and 20:00 East Africa Time, unless the owner saves other hours
  on Admin → System → Marketing SMS; a test obeys the window too. [D-1007a (G3 · G9) ·
  [`window.ts`](../src/lib/marketing/window.ts) · [`campaign-test-send.ts`](../src/lib/server/marketing/campaign-test-send.ts)]
- **The money**, as defaults the owner can change on the same card: TZS 6 per SMS (the estimate's price until our own
  sends measure it) · TZS 20,000 of SMS credit always kept for login and withdrawal codes (marketing stops before the
  credit falls below it) · at most TZS 10,000 per campaign. [D-1007a (G3 · G9) · D-1007b item 1 · `sms-settings.ts`
  `MARKETING_SMS_SETTINGS_DEFAULTS`]
- No Gaming Board approval is needed to send marketing SMS. [D-0926 (OQ1)]

## 4 · Test sends — who may send one, and where

- Any officer who can open the composer may test a saved draft **on their own phone** (the one-tap default).
  [`campaign-test-send.ts`]
- **A test to a typed number is for the Owner (the ADMIN role) and Compliance only** — everyone else, GROWTH included, is
  told *"Tests to another number are for the Owner and Compliance only — send yourself a test."*
  [D-1009b item 2 · `campaign-test-send.ts` `mayTestTypedNumber`, `TEST_TYPED_ROLE_REFUSED`]
- A typed test needs the officer's 18+ confirmation, which counts only for a number no account holds, only for that one
  send and only while licence outreach is open — and never over a stop, a withdrawal or an erasure.
  [`campaign-test-send.ts` header · D-1005 (Q11)]
- Every test passes the same gate, switch and window as a campaign, and is budgeted (an officer: 3, then one every 10
  minutes) and audited. [`campaign-test-send.ts` · [`rate-limit.ts`](../src/lib/server/rate-limit.ts) `marketing.testSend`]

## 5 · How a person stops

- **A player:** Profile → Notifications, the offers switch. [D-1009a item 2 · D-1007b item 7]
- **Staff**, on the contacts screen's bulk bar: **Record a withdrawal** (a withdrawal in the consent record, in the
  officer's name, and a player's own switch turned off) or **Suppress** (a permanent stop nobody can lift).
  [[`contacts-copy.ts`](../src/app/admin/contacts/contacts-copy.ts) · D-1005 (G12)]
- **An old link:** `/s/<token>` from a message sent before 2026-10-09 still works. [D-1009a item 2]
- A stop is always honoured: the gate asks the stop list before anything else, and no licence basis overrides a
  withdrawal. A person's own stop is lifted only by their own "yes". [`consent.ts` steps 1, 2a′ and 3,
  `isPersonCreatedSuppression`]
- A campaign's results show **"Stopped since this campaign"** — everyone it reached who has stopped since, whichever
  way. [[`campaign-results.ts`](../src/lib/server/marketing/campaign-results.ts) ·
  [`live-copy.ts`](../src/app/admin/campaigns/[id]/live-copy.ts)]

## 6 · Live drives — the ledger cap

- A live drive (U52a) sends **at most 6 real SMS**, only to the approved test number, each counted in a gitignored ledger
  that refuses a seventh; the cap is a constant in the code, which no ledger file can raise. Anything beyond it, or a
  top-up of the SMS credit, waits for Ali's approval. [D-1009b (the live checks) · D-1005 (G3) ·
  `scripts/lib/marketing-u52a.mjs` `SEND_CAP` · the tracker's §11 item 4]
- Production sign-ins for live checks use Claude's QA logins, and Ali approves each sign-in himself. [D-1009b]

## 7 · Wordings and public lines — through the owner door

- Ali approves each marketing wording and each public policy line **in the Claude session**; Claude saves it from an
  approval file in [`marketing-approvals/`](marketing-approvals/) through the audited door
  `npm run ops:marketing-owner-save` (status → check → apply → one redeploy) — never with his login.
  [D-1007a "The owner's approvals given in the session the same day" · D-1009a item 5 ·
  [`owner-save.ts`](../src/lib/server/marketing/owner-save.ts)]
- Nothing approved is rewritten: every save appends a version, and the consent sentences pinned in
  [`consent-wording.ts`](../src/lib/marketing/consent-wording.ts) are only ever appended to. [D-1004b ·
  `consent-wording.ts` header]

## 8 · Never name the SMS company publicly

- No public or player-facing text names the SMS gateway's company: Privacy §4 says "Our SMS gateway in Tanzania…", and
  `npm run test:privacy-notice` (§2e) refuses the name in every language. Staff screens may still name the provider.
  [D-1009a item 5]

## 9 · The contacts book — what a masked officer may learn

A **masked officer** is a role whose `identity.contact` cell is not `read` — in practice GROWTH. The rules behind every
line below: a masked viewer learns no player fact (D19), a browser never learns a number was erased (X22), and a stop per
row is a player signal (OD54). [CONTACTS-SCREEN-PLAN §4.7 · D-1009b]
⏳ B1–B8 are **landing 2026-10-09 with S14's contacts push** (C8b); until then the live screen does not yet do all of them.

- **B1** · One test decides whether a number may be written: a number is blocked when its row was emptied by an erasure
  or an erasure stands on it; only the holder's own act lifts it (a new consent, or a new account at that number).
- **B2** · Add contact answers a blocked number "already in the book", and never hands a masked viewer a contact id.
- **B3** · A masked officer's whole-number search answers only "in the book" or "not in the book", never rows.
- **B4** · A masked officer's import puts on its list only the contacts that run created.
- **B5** · A list's figures are the viewer's: a masked officer counts every live member (the composer's count); a reader
  also sees how many have an account.
- **B6** · The /admin activity feed shows the contact book's sign-up rows only to a viewer who may view the compliance
  domain (C8b's `admin-overview-feed.ts`).
- **B7** · No tag or list is built from a filter on consent, stop, source or player — for any viewer.
- **B8** · "Added" is when the row entered the book; the 54 rows back-filled on 2026-10-03 are re-dated to that day (a
  production fix through an audited door).
- Only a role that can read numbers updates contacts already in the book from a file; everyone else imports with "keep
  what's in the book". [CONTACTS-SCREEN-PLAN §4.3 S15-10]
- The import check has five boxes and no "has a 50pick account" box, for any role. [CONTACTS-SCREEN-PLAN §4.3 S15-2]

## Sources — the dated rulings, by heading

- **D-1009a** · § "2026-10-09 · Privacy v2026-10-09 — a marketing SMS is sent exactly as the officer wrote it: no stop
  link, no 18+, no helpline, no source line (owner ruling)"
- **D-1009b** · § "2026-10-09 · An erased number stays blocked, a test SMS to a typed number is for Admin and Compliance,
  and the back-filled contacts are re-dated (owner rulings, put to Ali in the session)"
- **D-1007a** · § "2026-10-07 · Marketing SMS go to anyone with a phone — consent is not a condition (the owner's FINAL
  rule), and his approvals given in the session"
- **D-1007b** · § "2026-10-07 · Management's answers for the first marketing campaign — a small pilot, no frequency cap,
  two-step sign-in off, and the stop link (owner rulings, put to Ali in the session)"
- **D-1005** · § "2026-10-05 · Marketing outreach rulings — Ali answered twelve questions and three gates, put to him one
  at a time"
- **D-1004a** · § "2026-10-04 · Marketing campaigns are authorised by one officer's typed confirmation (U41; under the
  2026-07-24 single-admin ruling)"
- **D-1004b** · § "2026-10-04 · The marketing consent wordings are approved by saving them on Admin → System, every
  version kept (decided under Ali's delegation; G4)"
- **D-0926** · § "2026-09-26 · Marketing SMS rulings — no Gaming Board approval, no PDPA registration, and the helpline
  is the one 50pick already publishes (owner rulings on OQ1, OQ2, OQ4)"
