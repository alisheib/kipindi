# Support & Customer Care — the campaign, and its planner

> 🟢 **THIS FILE IS BOTH THE BRIEF AND THE PROGRESS LEDGER.** §2 is the planner: it answers
> *"where did we reach?"* on any machine, in any session. ⛔ **Tick your row in the SAME commit
> that ships the work.** A tracker that lags is worse than none, because the next session trusts it.
>
> Opened 2026-09-10. Owner: Ali (Dar es Salaam). Target `https://50pick.tz` — the LIVE money app.
> There is no staging.
>
> **Grounding:** a six-reader source survey (79 findings) plus a live probe of the public surfaces
> and the admin console. ⚠️ **Read §5 before trusting any geometry claim** — almost nothing here
> was rendered.

---

## §0 · ⭐ THE AUTONOMY CONTRACT — you finish this, and you ship it

⛔ **THE OWNER IS AWAY. DO NOT ASK FOR APPROVAL TO COMMIT, PUSH OR PROCEED.** Standing authority
was given for exactly this shape of work: *"you always commit + push and continue, you have full
access… stop asking me each phase — test completely & perfectly, push and proceed."* Reconfirmed
2026-09-10 for this campaign: **finish, validate, push live.**

⛔ **AND THAT AUTHORITY IS THE REASON TO BE STRICTER, NOT LOOSER.** Every push to `main` is a LIVE
DEPLOY of a real-money platform serving real players, with no staging and nobody watching. The
contract below is what makes an unattended push defensible.

### 0.1 · The unit of work is ONE unit, sealed

Per ledger unit, in this order, no batching:
1. **Read the surface before you change it.** Not the file — the SURFACE, as a player or an
   officer meets it.
2. **Write the guard FIRST and PROVE IT RED** against today's tree. ⭐ Ask the standing question:
   ***"would this still pass if the feature were absent?"*** If the answer is yes, the guard is
   decoration — rewrite it. A guard that goes green without ever having gone red proves nothing,
   and this repo has been burned by that class repeatedly.
3. **Fix it.** Smallest change that seals the CLASS, not the instance. ⛔ Fixing a constant is not
   fixing the class — that mistake is why one of these units exists at all.
4. **Prove the guard GREEN**, and prove it still goes red if you re-break the fix.
5. **Run the full board:** `npm run test:all`. ⚠️ **Baseline is 311/324** and the 13 reds are named
   in `docs/LIVE-QA-CAMPAIGN.md`. **Anything else red is yours** — do not push past it, and do not
   re-baseline a ratchet to make your own red go away.
   ⚠️ **Two caveats before you trust that number.** The denominator drifts as suites are added, so
   compare the NAMED red list, not the count. And `test:orphans` may already be red in your
   checkout from **untracked files belonging to the other session** — ⛔ neither natural remedy is
   safe: do not grow `scripts/orphan-allowlist.json` (it may only shrink) and do not delete files
   you did not create in a shared tree. Confirm with the peer, then leave it.
6. **Update the docs in the SAME commit** — this file's §2 ledger row ticked, plus any doc whose
   statements your change makes false.
7. **Commit by explicit path.** ⛔ Never `git add -A`.
8. **Push, then VERIFY THE DEPLOY** (§0.3).

⭐ **If a unit turns out to be bigger than one commit, split it into sealed sub-units** — each with
its own red-then-green guard and its own push. Never leave an unsealed half on `main`.

### 0.2 · The push gate — ALL of these, every time

- `git branch --show-current` — must be the branch you intend
- `git fetch origin`
- `git rev-list --left-right --count origin/main...HEAD` — know what moved under you
- `npm run test:all` — 311/324 baseline, nothing NEW red
- `npm run test:docs` — 2 pre-existing (the MONEY-GATE placeholder names); a 3rd is YOURS
- `git status --short` — nothing foreign staged
- `git commit --only <your paths>` — ⛔ never `-A`

⛔ **`git add <your-file>` followed by `git commit` still sweeps the OTHER session's staged files
into your commit.** That has happened in this repo. `--only` is not a style preference; it is the
fix.

### 0.3 · Deploy verification — a 200 is NOT proof your commit is live

After every push:
1. `https://www.50pick.tz/api/health` — confirm **`uptimeSec` RESET** (a low number). A healthy 200
   from the OLD container satisfies every naive check.
2. **Re-read the actual surface you changed** and confirm the new behaviour is present.
3. ⛔ If the deploy did not take, **stop pushing more units** and diagnose. Stacking commits on a
   failed deploy hides which one broke it.

### 0.4 · Two sessions, one `main` — the coordination protocol

Two sessions run these campaigns in parallel. **They cannot see each other, and every collision is
SILENT — you find out by losing work, not by an error.**

- ⭐ **TALK FIRST. `ListAgents` lists the other local sessions; `SendMessage` reaches them.** This is
  the METHOD, not the fallback. Inferring the peer's state from commits is what you do only if no
  peer answers.
- **Open with a state message, and state what you have DONE, never what you are about to do**
  (replies cross mid-flight):
  > *"I am running &lt;THIS CAMPAIGN&gt;. Files I own: &lt;list&gt;. I have pushed: &lt;shas, or none&gt;.
  > `test:all` is &lt;n&gt;/324 in my tree. Tell me your file set and your last push."*
- ⛔ **WORKTREES, NOT A SHARED DIRECTORY.** `F:\kipindi-main` holds the Railway CLI link — run
  `railway …` from there even when working elsewhere. The second session takes its own
  `git worktree` with its own branch and its own `.next`. `git worktree list` shows who is where.
  A shared directory has already made one session's files vanish mid-edit under the other's
  `git checkout`.
- ⛔ **NEVER `git checkout` in the other session's tree.**
- **PUSH SEQUENCING — the two campaigns must not push at the same instant.** Before pushing:
  `git fetch`, integrate `origin/main`, **re-run `test:all` AFTER integrating**, then push. If the
  push is rejected, integrate again and re-validate. ⛔ **Never `--force`, and never `--theirs` a
  file the trunk moved** — that silently reverts every trunk fix.
- **Announce each push** to the peer with the sha and one line on what it changes. If your change
  touches a file in THEIR set, message them BEFORE you touch it.
- ⚠️ **A merge can create a coupling neither side can see alone.** After merging a shared file, ask
  what the two changes do to EACH OTHER — not just whether git resolved the text.
- ⛔ **ONE LIVE SESSION PER ACCOUNT.** A second admin sign-in REVOKES the first, and the revoked
  context silently gets the sign-in page at **HTTP 200** — every assertion then passes against a
  login screen. **Live drives must be serialized.** Message the peer, take the account, run, hand
  it back. Never run two live drives at once.
- ⚠️ **Shared-machine hazards:** port :3000 is often the peer's (check `netstat`, kill only your own
  PID); their `npm install` empties `node_modules/.bin` under your running gate and produces a mass
  of `'tsx' is not recognized` failures that are **not** product defects — ⭐ **read the FIRST
  failure's text before believing a mass failure**, the cure is one `npm install`; and there is
  **ONE database**, so a seeding run is visible to the peer's app.
- **Claim your finding-id range by message** before filing anything. Tie-break, if it comes to one:
  **`docs/LIVE-QA-CAMPAIGN.md` §6 is the authority** — whichever finding has a ROW there keeps the
  id, the other moves. An id recorded only in a prompt or a code comment is *announced*, not *filed*.

### 0.5 · When you are blocked, you do NOT stop

The owner is away; a blocked session that idles wastes the whole window.
1. **Do every unit that is not blocked**, in ledger order.
2. Record the blocker in §2 as a `⛔ BLOCKED` row **with the reason and what would unblock it**.
3. Keep going. Report at the end.

⛔ **Do not invent an answer to an owner decision.** If a unit genuinely needs a ruling, mark it
BLOCKED and move on — do not guess, and do not quietly shrink the unit to something you can finish.

### 0.6 · The hard stops — the only things you may NOT do unattended

- ⛔ **Do not re-enable QR / Selcom Lipa payment.** Withdrawn by owner ruling.
- ⛔ **Do not change the statutory helpline `0800 11 0011` or the licence number `OUS00000202602`.**
  They are pinned constants by design.
- ⛔ **Do not use GitHub's secret-scanning unblock link.** If push protection fires, CHANGE THE
  FIXTURE.
- ⛔ **Do not write to production money tables with raw SQL.** `AuditLog` is an append-only HMAC
  chain: a raw write leaves NO audit, and forging one reads as tampering. Use the audited admin
  path, or leave it and file it.
- ⛔ **Do not take a player-facing surface down** to make a gate pass.
- ⛔ **Do not re-baseline a ratchet** to swallow your own regression.

### §0a · How to SEE — traps this platform has already paid for

- ⛔ **`html { overflow-x: clip }` makes `documentElement.scrollWidth - clientWidth` VACUOUS.**
  Proven 2026-09-10: a 2000px block injected at a 360 viewport left it at **0**. Use
  `clippedControls` from `scripts/live/clip.mjs`, plus a bounding-box read.
- ⛔ **Scope the bounding-box population.** Unscoped, it reported **22,345px** of "overflow" on
  `/help` — the live ticker, a marquee legitimately ~22,000px wide. Exclude `[role="region"]`
  (a `ScrollX` child is wider than the viewport BY DESIGN) and the ticker.
- ⚠️ **The locale cookie is `kp-locale`, not `locale`.** Always assert a known SW/ZH string as a
  positive control, or a page that silently served English satisfies every other assertion.
- ⚠️ **ONE live session per account.** A second sign-in revokes the first; the revoked context gets
  the sign-in page at **HTTP 200**. Sequential only.
- ⚠️ **Two sign-in pages, two field ids:** `/auth/admin` → `#phone`, `/auth/login` → `#identifier`.
  Both mirror into a same-named HIDDEN input, so `[name=…]` selects the invisible twin and `fill`
  times out. Select by **id**.
- ⚠️ **Soft navigation needs `waitForURL`,** not `waitForLoadState` — client transitions inside one
  layout have no document load to idle on.
- ⛔ **Writing about a bad command REPRODUCES it.** `docs-links.mjs` scans prose for the invocation
  pattern, so a sentence quoting a broken script name becomes a new violation. It did, on
  2026-09-10. Describe such things; do not quote them. Same family as a block comment in a data
  file arming a latent unterminated one (`scripts/design-gate/eyebrow-roles.mjs`).
- ⭐ **A screenshot proves a surface renders. It does not prove a control is reachable, a `tel:`
  dialable, or a field editable.** Measure alongside looking.

### §0b · The instruments

- ⛔ **`npm run qa:support-shots` IS NOT A NEUTRAL BASELINE REFRESH.** It signs into
  **PRODUCTION** as **ADMIN** (`BASE` defaults to `https://50pick.tz`), which by the one-session
  rule above **REVOKES whoever is currently signed in on that account** — plausibly the care
  officer whose report opened this campaign. Tell the peer session before you run it, and do not
  run it during Tanzanian office hours if you can avoid it. It also needs `.env.qa.local`, which is
  gitignored — on a fresh clone it will crash until that file exists.
- **`npm run qa:support-shots`** (`scripts/live/support-surface-shots.mjs`) — run it first, with
  that warning understood. Signs in
  sequentially, captures every support surface at 360/1280, and reports what a screenshot cannot:
  every `mailto:`/`tel:` href, every input's `disabled`/`readonly` state, text claiming a field is
  locked, clipped controls, scoped overflow. Output in `scripts/live/.shots/support/`.
- ⛔ Any new file under `scripts/` needs an npm key or `test:orphans` fails.

---

## §1 · THE ASK, in the owner's words

> *"how people reach us, our support contacts, our emails, how they are displayed, are they properly
> routed, we should have perfect display, perfect support user management. All fields changeable,
> support lines, phone etc. They report some fields are not changing maybe readonly. **If anything
> cannot be changed, show a warning why.** …places where we have notifications, chatbots, everywhere
> where we have details, the warning to keep playing or take a break. The popup that comes at the
> beginning of the first login that has steps — is it consistent with our UI theme kit, is it
> perfectly rendered… info in the side, middle, borders, footers, tags, icons, slogans."*

**Three scope decisions, taken 2026-09-10 — do not re-open:**
- ⛔ **AUDIT-AND-FIX ONLY.** A ticket system was specified (Jay unit K #12) and never built; there
  is no `/admin/support`. OUT of scope, Ali's explicit call.
- ⛔ **The statutory helpline and licence number stay PINNED.** ⚠️ **Measured live, 2026-09-10 —
  the row STILL carries it**, present tense:
  `{email:"msaada@50pick.tz", phone:"+255769777877", helpline:"+255769777877",
  phoneTel:"+255769777877", helplineTel:"+255769777877"}`. Those two `helpline*` keys are 50pick's
  OWN desk number, and they are inert **only** because `migrate()` in
  `src/lib/server/support-config.ts` strips them at read time. ⭐ **The defence is a read-time
  filter over live data, not a cleanup** — restore that row into any code path that does not run
  `migrate()` and a self-excluding player is routed straight back to the operator. **Keep the
  pinning; make the form say WHY; and decide explicitly whether the row itself gets cleaned.**
  ⭐ **The safe method already exists and is NOT raw SQL:** an ordinary save at `/admin/system`
  full-replaces the JSON value with `{email, phone, phoneTel}`, so it drops the two `helpline*`
  keys by itself — audited, chained, nothing forged. ⛔ A raw `UPDATE "SystemConfig"` leaves NO
  audit row, which is the exact failure that rule exists to prevent.
  Every other field must be genuinely editable; any that silently refuses is a defect.
- ⭐ **THE SUPPORT NUMBER IS `0769777877`** — the owner's ruling, 2026-09-10. ⭐ **This is what
  the `phone`/`phoneTel` split exists for:** `phone` is what a player READS and must become
  `0769777877` (the local form a Tanzanian actually dials); `phoneTel` is what a tap DIALS and
  must stay E.164 `+255769777877`, so the same tap works from any carrier and from abroad. ⛔ **A
  cold session must not "simplify" these into one field** — they are two facts, and the repo
  already models them correctly.
  ⛔ **AND OBEYING IT NAIVELY BREAKS THE DIAL TARGET — READ THIS BEFORE YOU TOUCH THE VALUE.**
  `system-client.tsx:121-122` renders **one** control (`<Input name="phone" />`), and
  `admin/system/actions.ts:70` DERIVES the other from it:
  `const phoneTel = phone.replace(/[\s\-()]/g, "");` — it strips spaces, dashes and brackets and
  **nothing else**. It does **not** convert a local `0…` number to E.164. So typing the ruled
  `0769777877` into the form today sets `phoneTel` to `0769777877`, and the only `tel:` href in
  `src` (`help/page.tsx:70`) becomes `tel:0769777877` — which dials from a Tanzanian handset and
  **fails from abroad** — silently, with a green success toast.
  ⭐ **So the ORDER is fixed: make the derivation locale-correct FIRST (`0…` → `+255…`), surface
  the derived `tel:` in the form as a preview, and only THEN change the displayed value.** That is
  ledger row **4.3**, and it is a **prerequisite of 1.5**, not a follow-up.
  ⚠️ The form's hint reads *"E.g. +255 22 211 5811"* — the retired landline default — so the
  console also steers an operator toward the format this ruling retires.
  ⚠️ `actions.ts`'s own comment concedes the gap: *"`phone` is optional here and has no refusal of
  its own, so there is nothing to point at for it."* See Unit 4.
  ⚠️ And the form's own hint reads *"E.g. +255 22 211 5811"* — the retired landline default — so
  the console steers an operator toward the format the ruling retires.
- ⭐ **`msaada@50pick.tz` IS THE SUPPORT EMAIL** — the owner's ruling, 2026-09-10. It is already
  what the live `support_config` row holds; what is wrong is everything that does not read that
  row. ⛔ The ruling is therefore NOT "update a value" — it is Unit 1, in full: the **default** must
  move too, because the default is what a cold process, a fresh database and a restored backup
  publish. `support@50pick.tz` survives only where it is history (a comment recording what was
  once served) — never as a value.

---

## §2 · THE PLANNER — where we reached

| Unit | What it seals | Done |
|---|---|---|
| 1 | 🔴 The ruled contacts vs the six wrong values still shipping | ☐ 0/7 |
| 2 | 🔴 The operator's number carries a free-helpline framing at 5 sites | ☐ 0/6 |
| 3 | 🔴 A save that never lands looks exactly like one that did | ☐ 0/4 |
| 4 | 🔴 What the admin screen promises, validates, and won't explain | ☐ 0/5 |
| 5 | 🟠 Config frozen at module eval, and a gate on the forbidden primitive | ☐ 0/2 |
| 6 | 🟠 Two chat SAFETY mechanisms are unreachable when signed in | ☐ 0/3 |
| 7 | 🟠 A cooling-off break can be SHORTENED, and the copy deterring it is false | ☐ 0/3 |
| 8 | 🟠 Five suites are not on the deploy path; one asserts a retired value | ☐ 0/3 |
| 9 | 🟠 The first-login primer blocks its own photographer | ☐ 0/3 |
| 10 | 🟡 Routing and chrome — dialability, badges, duplicated constants | ☐ 0/7 |
| 11 | 🟠 "Perfect support user management" — the DESK, which nothing here audits | ☐ 0/4 |

<details><summary><strong>Row ledger — tick these</strong></summary>

| | Unit 1 · Email | where |
|---|---|---|
| ☐ | **1.1** `SUPPORT_DEFAULTS.email` is `msaada@50pick.tz` — the default matches the ruling | `src/lib/support-config.ts:47` |
| ☐ | **1.2** `email.ts` reads `SUPPORT_EMAIL()`; no `support@` literal survives as a VALUE | `email.ts:31,364,511` |
| ☐ | **1.3** the DSAR bundle stops inventing a third address | `privacy.ts:285,301` |
| ☐ | **1.4** the web-push VAPID subject stops naming a fourth | `push-service.ts:41` |
| ☐ | **1.5** `SUPPORT_DEFAULTS.phone` is `0769777877` — not the retired landline | `src/lib/support-config.ts:48` |
| ☐ | **1.6** `SUPPORT_DEFAULTS.phoneTel` is `+255769777877` — E.164, dials from anywhere | `src/lib/support-config.ts:49` |
| ☐ | **1.7** a guard fails on any support contact literal outside `src/lib/support-config.ts` | new |

| | Unit 2 · Helpline framing | where |
|---|---|---|
| ☐ | **2.1** `/help`'s "Call us" card | `help/page.tsx:68-69` |
| ☐ | **2.2** the problem-gambling FAQ | `help/page.tsx:118` |
| ☐ | **2.3** the chatbot's RULE 2 hands out the STATUTORY line | `chat.ts:134,140` |
| ☐ | **2.4** §3's unit is the ELEMENT / prompt STRING, not the source line | `support-contact.test.mts:158` |
| ☐ | **2.5** `test:support-contact` AND `test:cert-c1` are on `predeploy` | `package.json` |
| ☐ | **2.6** `CAPACITY_MESSAGES` lose *"(free, 24/7)"* / *"(bure, saa 24)"* / *"（免费，全天候）"* — land with 5.1 | `chat.ts:78-80` |

| | Unit 3 · Saves | where |
|---|---|---|
| ☐ | **3.1** `save()` is awaited and its failure reaches the caller | `define-config.ts:162` |
| ☐ | **3.2** a failed write yields a danger toast and NO audit row | `config-store.ts:88` |
| ☐ | **3.3** the form re-renders from the row, not from the keyboard | `system-client.tsx:119,122` |
| ☐ | **3.4** proven by forcing the write to fail, not by reading the diff | drive |

| | Unit 4 · The admin screen | where |
|---|---|---|
| ☐ | **4.1** every destination named in the card copy actually renders the value | `system/page.tsx:346` |
| ☐ | **4.2** phone is validated; blank/undialable refused with an addressed error | `actions.ts:60` |
| ☐ | **4.3** `phoneTel` HAS a control (it has none today) and the `tel:` target previews | `system-client.tsx:121` |
| ☐ | **4.4** a locked field LOOKS locked and states the REASON | `input.tsx` has no `disabled:` styling |
| ☐ | **4.5** `LICENCE_NUMBER` appears read-only with the same treatment | new |

| | Unit 5 · Frozen config | where |
|---|---|---|
| ☐ | **5.1** no module-scope value captures a `defineConfig` getter | `chat.ts:77-81` |
| ☐ | **5.2** `ai-controls` uses `loadConfigResult`, flag set LAST on `ok` | `ai-controls.ts:33-35` |

| | Unit 6 · Chat safety | where |
|---|---|---|
| ☐ | **6.1** at-risk input renders the RG card signed-in AND signed-out | `ChatRoot.tsx:147` |
| ☐ | **6.2** the escalate path can fire on the live path | `chat.ts:149` |
| ☐ | **6.3** `handoffBody` asserts nothing the product does not do | `i18n-dict.ts:1824` |

| | Unit 7 · Cooling-off | where |
|---|---|---|
| ☐ | **7.1** a shorter break cannot overwrite a longer one | `responsible-gambling.ts:271-280` |
| ☐ | **7.2** the RG page renders the ACTIVE break and its end date | `profile/responsible-gambling` |
| ☐ | **7.3** no RG string claims a sign-in block for cooling-off | `i18n-dict.ts:1899` |

| | Unit 8 · Gates | where |
|---|---|---|
| ☐ | **8.1** the five omitted suites are on `predeploy`, and it passes | `package.json` |
| ☐ | **8.2** `multi-persona-test.mjs` asserts `LICENCE_NUMBER()` or is deleted | `:261` |
| ☐ | **8.3** a guard fails if the rendered footer licence ≠ the constant | new |

| | Unit 9 · The primer | where |
|---|---|---|
| ☐ | **9.1** it can be photographed — the UA block is addressed | `onboarding/first-visit-primer.tsx:282` |
| ☐ | **9.2** the render guard tests `SUPPRESS_ON`, not only the mount effect | `:281` vs `:322` |
| ☐ | **9.3** a wired drive asserts a RECTANGLE at 360/393/768 × en/sw/zh | new |

| | Unit 10 · Routing and chrome | where |
|---|---|---|
| ☐ | **10.1** the self-exclusion refusal gives a DIALABLE number | `auth-service.ts:169,185` |
| ☐ | **10.2** the reality-check helpline is a `tel:` | `reality-check.tsx:183` |
| ☐ | **10.3** legal pages open the address they cite a deadline against | `terms:151,280,388` |
| ☐ | **10.4** the footer email label is a dict key in all three locales | `public-footer.tsx:98` |
| ☐ | **10.5** both 18+ badges measure the same rectangle | `globals.css:4802` vs `w-7` |
| ☐ | **10.6** `global-error.tsx`'s four helpline copies read the constant | `:48,60,72,300` |
| ☐ | **10.7** the AML email states `≥`, matching the code | `email.ts:913` vs `payments.ts:197` |

| | Unit 11 · The support desk | where |
|---|---|---|
| ☐ | **11.1** what a SUPPORT grant can actually see and do is written down | `roles.ts:198-201,242` |
| ☐ | **11.2** every control a SUPPORT user cannot use is disabled WITH ITS REASON, not absent | `/admin/players` |
| ☐ | **11.3** the desk is measured signed in AS SUPPORT, not as ADMIN | `QA_SUPPORT_PASSWORD` |
| ☐ | **11.4** anything the role cannot do that it plainly SHOULD is filed, not silently accepted | new |

</details>

---

## §3 · ⭐ THE OWNER'S REPORT — EIGHT CAUSES, AND HOW TO TELL THEM APART

*"Some fields are not changing, maybe readonly"* is **eight distinct mechanisms**, four of them
invisible on every screen. ⛔ **Do not start fixing until you know which one.**

| # | Cause | What the officer sees | Cheapest discriminator |
|---|---|---|---|
| **H** | ⭐ **The field genuinely IS read-only** — the pinned helpline (`system-client.tsx:135`, `<Input value={HELPLINE()} readOnly disabled />`) — and `src/components/ui/input.tsx` paints **no disabled state at all**, so it looks identical to the two editable boxes | The value never changes whatever they type. No error, no toast, no explanation | ⭐ **ASK WHICH BOX.** If it is the helpline, it is **H** and nothing is broken but the styling and the missing reason. **The owner's own words — *"maybe readonly"* — point straight here.** Unit 4.4 fixes it |
| **A** | Field DID change; the page they checked never showed it (**register**, **reality-check** — both named in the card's own copy) | Nothing moved | ⛔ **NOT a text search for the address** — `PublicFooter` renders `SUPPORT_EMAIL()` on every non-admin page (`app-shell.tsx:269` → `public-footer.tsx:98`), so a search ALWAYS hits and returns a guaranteed false negative. Search instead for the address **inside the page's own `<main>`**, excluding the footer landmark |
| **B** | Changed on web, **not in email** (`REPLY_TO`) | Web moved; replies land in the old inbox | Trigger a password reset **on a fleet QA persona, never on a player identifier** (`fleetPersona` in `scripts/live/harness.mjs`) — a real reset email to a real player is a support incident of its own. ⚠️ Read the **`ReplyTo` header**, not the footer: both are the same constant today, so a footer check cannot separate B from a correct system |
| **C** | Save **never reached the row**, reported success | Green toast, new value on screen, **reverts after restart** | `SELECT value FROM "SystemConfig" WHERE key='support_config'` immediately after saving |
| **D** | Save **refused** by the hydration gate | Red toast: *"Settings have not finished loading yet"* | Ask what colour the toast was. This one is honest |
| **E** | Step-up 2FA lapsed mid-save | Bounced to `/admin/totp-verify`, old values, no unsaved-changes prompt | Audit shows a TOTP verify and NO `config.support_updated` |
| **F** | View-only `ops` grant | Full-page `AdminError`, edits gone, a `privilege_escalation_blocked` SECURITY row | Look for that row; check their grant at `/admin/roles` |
| **G** | Chatbot capacity message frozen at module eval | Chat quotes the old number; the bot's other answers quote the new one | ⛔ **Do NOT cold-start production and burn the daily cap to see this.** `chat.ts:77-81` is module-scope by inspection — two `sed -n` calls settle it for free, and the observable path sits behind four earlier `return null` gates anyway |

### The first step, and its one unsound branch

**RUN THIS BEFORE TOUCHING CODE** — at the timestamp the officer reported:
`SELECT value FROM "SystemConfig" WHERE key='support_config'`, then the ADMIN audit rows for
`config.support_updated`.

- Audit row present, value **matches** ⇒ the write landed. Cause is **A/B/G/H** — a READER or
  PRESENTATION problem, not a save problem.
- Audit row present, value **differs** ⇒ **C**. The write was lost and the console lied.
- Audit row **absent** ⇒ **D/E/F/H** — ⛔ **but this branch is NOT sound on its own.** `audit()`
  fails open (`audit.ts:443-448`) through the **same Prisma client** as `saveConfig`, so the pool
  timeout, failover or read-only replica that causes **C** loses BOTH writes and presents as an
  absent audit row. ⭐ **An absent row means "D, E, F, H — or C wearing C's own failure."** Separate
  them by reading the row's VALUE against what the officer typed, and by checking the app logs for
  the swallowed `console.error` at `config-store.ts:88`.

⛔ **Until Unit 3 lands, no screenshot from an officer is evidence about persistence** — the form is
uncontrolled, so a field that did NOT change can look changed, and one that did looks changed for
the wrong reason.

## §4 · THE UNITS

### Unit 1 🔴 · The ruled contacts, and the six wrong values still shipping

⭐ **THE OWNER'S RULING (2026-09-10): `msaada@50pick.tz` is THE support email.** Measured against
the tree, **four different addresses are in play** and only one of them is that one:

| Where | Address | Status |
|---|---|---|
| the live `SystemConfig` row | `msaada@50pick.tz` | ✅ **the ruling** — already correct |
| `src/lib/support-config.ts:47` `SUPPORT_DEFAULTS` | `support@50pick.tz` | 🔴 **the default is wrong** |
| `email.ts:31` `REPLY_TO` | `support@50pick.tz` | 🔴 hard-coded, ignores the row |
| `privacy.ts:285,301` | `privacy@50pick.tz` | 🔴 in no config, no admin field |
| `push-service.ts:41` | `support@50pick.tz` | 🔴 VAPID subject fallback |

**And the same again for the number ruled `0769777877`:**

| Where | Value | Status |
|---|---|---|
| live row `phone` | `+255769777877` | 🟠 right number, **wrong form** — ruling says `0769777877` |
| live row `phoneTel` | `+255769777877` | ✅ correct E.164 dial target — keep |
| `src/lib/support-config.ts:48` default `phone` | `+255 22 211 5811` | 🔴 **a different number entirely** — a landline |
| `src/lib/support-config.ts:49` default `phoneTel` | `+255222115811` | 🔴 same landline |
| `system-client.tsx:121` hint | *"E.g. +255 22 211 5811"* | 🔴 steers the operator to the retired format |
| `phoneTel` admin control | **does not exist** | 🔴 the ruling is not settable from the console |

⛔ **The default phone is not a stale format — it is a DIFFERENT NUMBER.** `+255 22 211 5811` is a
landline that appears nowhere in the live row. Every state that serves defaults instead of the row
(§ above) publishes a support line the operator does not answer. ⭐ **Nine surfaces read
`SUPPORT_PHONE()` and exactly ONE reads `SUPPORT_PHONE_TEL()`** (`help/page.tsx:70`), so in the
default state the app shows a wrong number in nine places and offers a wrong dial target in one.

⛔ **THE DEFAULT IS NOT COSMETIC.** `SUPPORT_DEFAULTS` is what gets served whenever the row is not
in hand: a process between start and hydration, a **de-hydrated** process, a fresh database, **a
restored backup that predates the row**, and any client component that ever reads it directly — a
browser bundle's module cache can never be hydrated server-side.
⚠️ **That last path is CLOSED today, so do not go hunting it:** `layout.tsx:167` and
`app-shell.tsx:269` pass `SUPPORT_EMAIL()` DOWN as a prop from server components, and
`test:support-contact` §4/§5 already fail on any client component that reads or imports the getter.
**The live exposure is the cold or de-hydrated SERVER process, not a client bundle.**
So today the wrong address is one cold start away from the `/help` page, and it is already the
address in every one of the **61** email footers. ⭐ **Fixing the row would have fixed nothing; the row was already right.**

`email.ts:31` — `const REPLY_TO = "support@50pick.tz"` is the `ReplyTo` on **every** outbound
message (`:364`), the footer of all **61** templates (`:511`), and the inline contact link in at least
seven more places (`:577, :645, :1707, :1724, :1738, :1877, :1889`) including both
account-compromise warnings. The file already imports `HELPLINE` from `support-config` and does
**not** import `SUPPORT_EMAIL`. ⭐ **The site publishes one inbox and every email replies to
another** — and a player who hits reply on a compromise warning reaches an address the operator may
not even be reading.

`privacy.ts:285,301` hands the DSAR correction and erasure instructions a **third** address,
`privacy@50pick.tz`, which appears in no config, has no admin field, and contradicts
`/legal/privacy §1`. ⚠️ These are statutory response paths with deadlines attached — an address
that does not resolve is a compliance failure, not a typo.

`push-service.ts:41` — `process.env.VAPID_SUBJECT || "mailto:support@50pick.tz"` is the contact a
**push service** (Google, Mozilla, Apple) is given for abuse reports about this origin. Nobody
player-facing sees it, which is exactly why it will stay wrong.

⚠️ **Layout is NOT a blocker for this ruling — the opposite.** `forgot-password/page.tsx` carries a
derived-and-driven analysis (DG-P-08) showing `support@50pick.tz` is 17 characters of JetBrains
Mono at a 0.6em advance = **112.2px**, in a post-fix box of **112px**. `msaada@50pick.tz` is
**16** characters = **105.6px**, so the ruling gains **6.6px** of slack on the tightest surface in
the app — one character × 0.6em × 11px, on the comment's own derived model. ⛔ Do not subtract the
DERIVED width from the harness's MEASURED box; those are two instruments, and the paragraph telling
you to correct someone's arithmetic is the wrong place to mix them. ⛔ But that analysis was tuned to a default the ruling is about to change, so **re-read the
comment and correct its arithmetic in the same commit** — leaving prose that reasons about a
retired string is how this repo's comments rot (see the standing rule in §0a).

**Accept when:** `SUPPORT_DEFAULTS.email` is `msaada@50pick.tz`; `email.ts`, `privacy.ts` and
`push-service.ts` carry no support-address literal as a **value**; a guard fails on any such literal
outside `src/lib/support-config.ts` and is proven RED against today's tree first; and the DG-P-08 comment
describes the string the app now actually serves.

### Unit 2 🔴 · The operator's number carries a free-helpline framing — five sites, two surfaces
- `help/page.tsx:68-69` — `value={SUPPORT_PHONE()}` under `sub={t.help.freeHelpline}` =
  *"Free helpline · 24/7"*. Public, no session.
- `help/page.tsx:118` — the FAQ whose question is ***"I think I have a problem with gambling"***
  appends ` ${SUPPORT_PHONE()} (${t.common.free}).` — rendering as *" 0769777877 (free)."*, lowercase
- ⛔ `chat.ts:78-80` — `CAPACITY_MESSAGES` says *"call … (free, 24/7)"* / *"piga … (bure, saa 24)"* /
  *"致电 …（免费，全天候）"*, the same false framing in all three locales. ⚠️ **The brief files the
  FREEZING of these strings under Unit 5 and their WORDING here — they must land together** (row 2.6).
- ⛔ `chat.ts:134` — `Helpline ${SUPPORT_PHONE()} (free, 24/7)`, and **`chat.ts:140` RULE 2
  instructs the model to give that number to a self-identifying problem gambler.**
  `grep -n HELPLINE src/app/_actions/chat.ts` → nothing.

The number is **not the free line**: `0800 11 0011` is the pinned statutory helpline
(`src/lib/support-config.ts:57`); `SUPPORT_PHONE()` is the operator's own desk. ⚠️ **Whether that
desk line is charged at a normal rate is NOT asserted anywhere in the tree** — do not put a tariff
claim in player copy you cannot source. The defensible statement is that it is not the statutory
free line, and that is enough to make *"Free helpline · 24/7"* wrong.
**Why the guard missed all three:** `support-contact.test.mts:158-171` resolves `t.*` paths **on the
same line** as an operator getter. Case 1 spans two lines of one JSX element; case 2's label is
`t.common.free` ("Free"), which the helpline regex does not match; case 3 writes "Helpline" as an
English literal in a prompt string, so `resolveEn` is never called. The guard even says *"The line
is the unit because that is the unit a player reads."* ⭐ **A player reads a CARD and a PARAGRAPH.**
⚠️ And `predeploy` does **not** contain `test:support-contact` (measured).
⛔ **AND DO NOT MISTAKE RULE 2 FOR THE SAFETY MECHANISM.** `chat.ts:140` is an instruction to an
LLM, not a code path — rewording it makes the model *more likely* to say the right number, never
certain. The only deterministic at-risk classifier runs in the BROWSER (`send-message.ts`, imported
by the `"use client"` `ChatRoot.tsx`) and **has no Chinese patterns at all**. ⭐ **A static-text
accept clause can therefore go green on all six rows while a self-identifying problem gambler still
has no guaranteed safety response — and a Chinese-speaking one has none by construction.** Seal the
deterministic path, then reword the prompt.

**Accept when:** no surface renders `SUPPORT_PHONE()` under helpline/hotline/free framing — t-key,
English literal, or computed; §3's unit is the element or prompt string; and moving a label onto the
getter's line keeps it red **for the same reason**. `predeploy` includes the suite.

### Unit 3 🔴 · A save that never lands looks exactly like one that did
Two mechanisms compound; **fixing either alone leaves the officer blind.**
1. `define-config.ts:162` does `void save(key, merged)` — never awaited — then returns `{ok:true}`.
   `config-store.ts:88-104` catches every error and only `console.error`s. A failed upsert (pool
   timeout, failover, read-only replica) produces a **green toast**, a mutated in-process registry
   so the page re-renders the new value, **and an ADMIN audit row claiming a change that is not on
   disk.** It reverts at the next restart.
2. `system-client.tsx:119,122` are uncontrolled `defaultValue`; `router.refresh()` never remounts
   the form. ⭐ **The input is a mirror of the keyboard, never of the database.**

**Accept when:** with the write forced to fail — a danger toast, the input reverts to the stored
value, and **no** audit row. After a success, changing the row out-of-band and reloading shows the
row's value. Proven by execution.
⛔ **DO NOT INDUCE A DATABASE FAILURE IN PRODUCTION to prove this.** The seam already exists and is
already used: `define-config.ts:41-54` takes injectable `deps`, and `scripts/define-config-gate.test.mts:45`
drives it that way. Make the injected `save` reject, and assert the toast, the revert and the
absence of an audit row **in the suite** — that is a stronger proof than a live outage would be,
and it can go red on demand for ever after.

### Unit 4 🔴 · What the screen promises, validates, and won't explain
- `system/page.tsx:346` promises changes reach *"help, chatbot, login, register, legal, KYC,
  account, forgot-password, footer, reality-check."* **Three of ten are wrong:** `register` shows no
  support contact at all (`auth/register/page.tsx:17` is a dead `HELPLINE` import); `reality-check`
  renders only the **pinned** helpline this form cannot move; `chatbot` is half-true (Unit 5).
  ⭐ **This is the most likely direct source of the owner's report.**
- `actions.ts:60` refuses only a blank **email**. `phone` has no `required`, no `type="tel"`, no
  pattern. Clearing it saves `""` → `/help` renders an empty `<p>` inside a live `<a href="tel:">`,
  and `auth-service.ts:169` tells a permanently self-excluded player *"Support: "* with nothing
  after it. Free text yields `tel:+255222115811ext204`; `phoneTel` has no field and no preview, so
  a dead dial button is **unobservable from the console**.
- ⛔ **The owner's literal ask is unmet.** `system-client.tsx:134` renders the helpline through the
  same `<Field>`/`<Input>` as the editable boxes, and **`input.tsx` has no `disabled:` styling at
  all** — it sets `text-text` explicitly, overriding the UA grey. Same border, same fill, same
  hover. The hint states the FACT; the REASON lives only in a code comment. `LICENCE_NUMBER()` has
  no admin field or mention anywhere, yet renders in every footer.
**Accept when:** every named destination renders a value this form moves, or leaves the sentence;
blank/undialable phone is refused with an addressed `fieldError`; the derived `tel:` is shown before
save; a screenshot shows the locked field differing in **border AND fill AND ink**; and it states
the reason, not the fact.

### Unit 5 🟠 · Config frozen at module eval
`chat.ts:77-81` — `CAPACITY_MESSAGES` is module-scope, calling `SUPPORT_PHONE()`/`SUPPORT_EMAIL()`
**once at import**. Hydration is fire-and-forget, so the capture is always `SUPPORT_DEFAULTS`,
frozen for the process's life — while the **same file** reads the getters correctly per-request at
`:134`. One feature disagrees with itself.
⚠️ **And it is a Unit 2 defect as well:** all three locales of that frozen
string say *"(free, 24/7)"* / *"(bure, saa 24)"* / *"（免费，全天候）"* about the operator's
normal-rate number. Unfreezing it without rewording it just makes the false claim current.
`ai-controls.ts:33-35` sets its hydrated flag **before** the await and reads through `loadConfig` —
the function whose own docblock says *"DO NOT BUILD A HYDRATION GATE ON THIS"*. One boot blip pins a
container on `chatbotEnabled: true` for life. `define-config.ts:120` is the corrected ordering.

### Unit 6 🟠 · Two chat SAFETY mechanisms are unreachable when signed in
`ChatRoot.tsx:147` calls `chatWithClaude` first and falls through to `sendMessage` on `null`.
⚠️ **That fallthrough has FOUR conditions and only the first is unknowable from the tree:** no
`ANTHROPIC_API_KEY` (`chat.ts:149`), the operator kill-switch off (`:155`), no session (`:159`), or
a tripped **burst limiter** (`:163` — the file's own docblock records the bucket as 10 burst,
2/min). ⭐ **So the stub path IS reachable in production: a signed-in player who types quickly falls
into it.** Which means everything in `send-message.ts` is live too, including the invented
`ticketId`/`etaMinutes` (`:293-294`) that §5 had filed as speculative. ⛔ **Discriminate on the live
call's OUTCOME, not on whether a session exists.** On the ordinary path with the key set, So the at-risk pre-filter and `RgRedirectCard` (whose contract
says *"at-risk language always renders this card"*) **never fire for a signed-in player**; the raw
text goes to the model governed by RULE 2, which hands out the operator's number. ⭐ **Sign out and
the same input renders the card. Opposite behaviour for identical input.** And the live reply has no
`unresolved` field, so `EscalateHandoff` — the one card carrying the hydrated address — can never
auto-fire. Separately `handoffBody` promises attached history, a pick-up notification and an
availability window; the action is a bare `mailto:` and there is no ticket model.

### Unit 7 🟠 · A cooling-off break can be shortened
`responsible-gambling.ts:271-280` — `coolOff()` writes `coolingOffUntil` **unconditionally**, never
`max(existing, new)`, and `COOLED_OFF` is deliberately absent from the sign-in gate, so the form
stays reachable for the whole break. **A 1-week break is cancelled by starting a 1-hour one.** The
policy says *"One-way until expiry"* in all three locales. The RG page never renders the active
break, so a player mid-break sees the form in its default state.
`t.rg.breakDescription` says *"You cannot bet, deposit, or sign in until it ends"* — the sign-in
clause is **false by design**, and it is the body of the confirmation dialog. ⛔ The clause most
likely to deter someone from taking a break is the wrong one.

### Unit 8 🟠 · Gates off the deploy path, and one asserting a retired value
`predeploy` omits `test:support-contact`, `test:cert-c1`, `test:tap-target`, `test:popup-fit`,
`test:type-scale` and `test:eyebrow-roles` (all measured against the 90-suite `predeploy` string).
⛔ **The first two are the ones this campaign disturbs.** `comms-email-truth.test.mts` alone holds
the 61-template inventory (`:297`), the per-template helpline assertion (`:362`) and the
`HELPLINE() !== SUPPORT_PHONE()` guard (`:497-499`) — every one of which Units 1 and 2 move. A gate
that is not on the deploy path cannot stop the regression it was written for. `scripts/multi-persona-test.mjs:261` asserts the footer
contains `TZ-GBT` — ⭐ **the placeholder retired on 2026-09-10**, so it is red against correct code
and was **green while the placeholder was live**. It is wired to no npm script, so neither result is
ever seen. The licence number has no guard at all.

### Unit 9 🟠 · The primer blocks its own photographer
`onboarding/first-visit-primer.tsx:282` — `if (/HeadlessChrome|Playwright/i.test(navigator.userAgent)) return;`
sits in the mount effect. ⭐ **Every browser gate on this platform launches default-UA Chromium and
photographs a page where this modal never opened** — which is exactly what happened on 2026-09-10:
a fresh context saw no dialog. Its design-kit verdict is therefore source-derived and cannot be
otherwise until this is addressed.
Second, a real defect: `SUPPRESS_ON` (deep-linked market detail — the bet-intent moment) is tested
**only in the mount effect** (`:281`); the render guard (`:322`) tests `HIDE_ON` alone. Land on
`/markets`, primer opens, tap a card — the effect returns early, `open` stays true, and the primer
sits over the bet widget it exists to stay off. `HIDE_ON` is `/^\/(auth|admin)/` only, so it also
mounts over `/wallet/deposit` and `/profile/responsible-gambling`.

### Unit 10 🟡 · Routing and chrome (batch — small each, cheap together)
- **Dialability.** `SUPPORT_PHONE_TEL()` has exactly **one** href in `src` (`help/page.tsx:70`).
  Everywhere else the number is untappable text — including `auth-service.ts:169,185`, the refusal a
  self-excluded player sees, ⭐ *the one moment they are told to call and given a number to retype*.
  `reality-check.tsx:183` prints the statutory helpline in a `<span>` inside the modal that
  interrupts live play, directly under a Self-exclude button.
- **Legal pages print the address as a `<span>`** while attaching a 30-day disputes deadline to it
  (`terms:151,280,388`; `privacy:30,118,207`; six `agent-terms` clauses) — inconsistent, not absent:
  `aml`, `kyc`, `forgot-password` and the footer all wrap the same getter in a working `mailto:`.
- **`public-footer.tsx:98`** — `Email · {supportEmail}`, a hardcoded English literal one line below
  the translated `t.footer.helpline`. No `email` key exists in the footer dict block, so
  `test:i18n` (2369 keys, all pass) **cannot see it**. Renders on every page in all three locales.
- **Two 18+ badges of different size on `/`** — the footer badge is `w-7 h-7`, and
  `tailwind.config.ts:220` overrides `"7": "40px"` → 40×40, while `.kp-rg__18`
  (`globals.css:4802`) is 28×28. Same border, ink and type size; different diameter; both visible
  in one scroll.
- **`global-error.tsx:48,60,72,300`** — four hardcoded copies of `0800 11 0011`. Correct today,
  unguarded, and a second source of truth for the number the pinning exists to single-source.
- **`email.ts:913`** says *"Amounts **over** TZS 1,000,000 are reviewed"*; `payments.ts:197` holds at
  `>=`. A withdrawal of exactly 1,000,000 is held, and the email explaining the hold tells the player
  their amount was not over the line. (`chat.ts:128` gets it right — two surfaces disagree.)
- **`CHASING_LOSSES`** (`responsible-gambling.ts:599`) filters `BET_PLACED && CONFIRMED` — every bet,
  won or lost. A winning player who tops up after each bet is flagged **high**, with a detail string
  saying *"within 30 min of a losing bet."*

---

### Unit 11 🟠 · "Perfect support user management" — the desk itself

⭐ **The owner asked for this in as many words and the brief above audits only the CONTACTS.**
Measured: the `support` RBAC domain contains exactly **one** route — `roles.ts:242`,
`["/admin/players", "support"]` — and `DEFAULT_GRANTS.SUPPORT` (`roles.ts:198-201`) is
`overview: view-only` plus `support: view+act`. So "support user management" is, today, the player
list and player detail under READ_TIERS, and nothing else. There is no `/admin/support`.

⛔ **That may be correct, or it may be the whole gap — and this brief cannot tell you which**,
because every surface in it was measured as ADMIN. An officer with a SUPPORT grant sees a different
console by design, and **nobody has looked at it**. `.env.qa.local` holds `QA_SUPPORT_PASSWORD`.

**Accept when:** the SUPPORT role's real capability is written down from a signed-in measurement,
not from `roles.ts`; every control the role cannot use is **visibly disabled with its reason**
rather than missing (the same rule Unit 4.4 applies to the pinned field — an officer who cannot see
why a thing is absent reports it as broken, which is how this campaign started); and anything the
role plainly ought to be able to do and cannot is FILED as a finding rather than quietly accepted.
⚠️ Ticket-system work stays out of scope (§1) — this unit is about the desk that EXISTS.

## §5 · ⛔ WHAT THIS BRIEF DID **NOT** COVER

- ✅ **Measured live 2026-09-10 (do NOT re-derive):** the production `support_config` row, quoted
  in §1. That single read settles what the row holds; it settles nothing about what any surface
  RENDERS from it.
- **Nothing else was executed against a running app for the source survey.** Six readers worked read-only
  from HEAD. A separate live probe covered `/help`, `/legal/responsible-gambling`, `/`,
  `/admin/system`, `/admin/players`, `/profile/responsible-gambling`, `/wallet` — public + admin,
  contacts, inputs and clipping only.
- ⚠️ **Almost nothing was RENDERED.** The 40px-vs-28px badge pair, the primer's contrast and
  wrapping, and every geometry claim in Unit 10 are computed from source. Treat them as unmeasured.
- **`test:support-contact` was not executed against these findings** — §3's blindness is derived by
  reading the loop. The discriminating run is stated as a repro, not performed.
- **The reality-check popup has never been triggered.** It fires on a session-time threshold.
- **The care desk was measured as ADMIN, not as SUPPORT** — they see different things by design.
  `.env.qa.local` holds `QA_SUPPORT_PASSWORD`.
- **The chatbot was not driven**, only read. Whether Unit 6 is live or latent depends on whether
  production has `ANTHROPIC_API_KEY` set and the chatbot on — **unknowable from the tree**.
- **Not read:** Postmark-side templates outside `email.ts`; the 61 bodies individually;
  `push-service.ts`; the chat stylesheets; `public/og/`; `/admin/compliance` and
  `/admin/self-exclusions` renderings; PDF/XLSX report chrome.
- **Verify before acting** (asserted by one reader, not re-read): `send-message.ts` fabrications
  (KYC "Tier 1/Tier 2", TZS 200,000/day, TZS 500,000 cap, a 60-second SLA) and four
  `legal/responsible-gambling` policy-vs-code divergences. High value if true; one `sed -n` away.
- **Dropped as speculative:** a sheet-overflow claim (unmeasured — it is a MEASURE task, not a fix),
  `phoneTel` double-normalisation, multi-container divergence (`numReplicas=1`), the copyright-year
  device clock, a latent `ticketId`/`etaMinutes` generator, and *"two compliance officers"* (a
  product adjudication for Ali, not a defect).
- **E-330 (SMS) is open by Ali's ruling** and was not re-adjudicated. One adjacent observation:
  `smsConfigured()` exists and `invite-service.ts:243` uses it; the OTP path at
  `auth-service.ts:318` does not, so the console stub resolves successfully and writes an
  `sms.delivered` row into the HMAC chain for a message that never left.

---

## §6 · ⏭️ RESUME AT

**Session 1 · nothing is ticked. Every row in §2 is open.**

### Your first hour, in order

1. ⭐ **`ListAgents`, then `SendMessage` the peer session** running `PAYMENTS-SEAL-CAMPAIGN.md`.
   Exchange file sets, last pushes, and `test:all` counts (§0.4). **Do this before you edit
   anything.** Your two campaigns overlap in exactly one predictable place — `support-config.ts`
   and the contact getters, which the payments copy also quotes — so agree who owns it now rather
   than discovering it in a conflict.
2. `git pull`, `npm install` if dependencies moved, and confirm **`test:all` is 311/324** so that
   anything else red is provably yours.
3. **Run `npm run qa:support-shots`** to refresh the visual + measured baseline. ⚠️ It has never
   been executed — expect to fix the instrument before you trust its output, and treat the first
   run as a test OF THE DRIVE, not of the product.
4. ⭐ **Run the §3 discriminator query pair.** It costs a minute and decides which of seven
   mechanisms the owner actually hit. ⛔ Do not start fixing before you know.

### Then work the ledger in this order

⛔ **Unit 2 FIRST, Unit 1 SECOND — they are NOT interchangeable.** Unit 2 is self-contained copy
plus a guard, and its chatbot case is the most severe thing in this document. **Unit 1 has four
prerequisites that none of its own ledger rows mention:**
- a `validate` on the support `defineConfig` must land BEFORE `email.ts` reads the getter — the
  moment that value becomes Postmark's `ReplyTo` on every reset and withdrawal notice, one bad
  keystroke stops being cosmetic and becomes a transport failure;
- ⛔ `REPLY_TO` must become a **FUNCTION**, never `const REPLY_TO = SUPPORT_EMAIL()` — a
  module-scope capture is byte-for-byte the Unit 5 defect, shipped inside the file that sends every
  email;
- row **1.7**'s literal guard must be written and **proven RED against today's tree** before the
  sweep, or it has nothing left to catch afterwards;
- ⛔ **row 4.3 (the `tel:` derivation) is a PREREQUISITE of row 1.5**, not a follow-up — see §1.
  Changing the displayed number first breaks international dialling silently.

**Unit 2 second, and 2.4 must land in the SAME session as 2.1–2.3.** ⛔ A guard that cannot see the
defect it was written for is worse than no guard, and this one demonstrably cannot see any of the
three. Unit 2's chatbot case is the most severe thing in this document: the model is instructed to
hand the operator's own number to a player who has just said they have a gambling problem. If you
only get one unit done, make it that one.

**Unit 3 third** — until it lands, no officer screenshot is evidence about persistence, which
limits how well you can verify everything after it.

Then 4 → 5 → 6 → 7 → 8 → 9 → 10 as listed. Units 5, 8 and 10 are cheap and can be batched into
single commits **per rule**, never per file.

### When you finish

- Tick every row you sealed, in the commit that sealed it.
- Update §6 to say where the NEXT session resumes, in this same format.
- Leave `test:all` at 311/324 or better, and say the number.
- Post a final summary: what shipped, what is BLOCKED and why, and what you did not reach.
