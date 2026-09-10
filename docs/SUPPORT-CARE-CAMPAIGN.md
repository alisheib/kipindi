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

## §0 · STANDING RULES

From `docs/LIVE-QA-CAMPAIGN.md` §0. This campaign is not an exception to the house rules.

1. **One fix, one guard PROVEN RED FIRST, docs in the SAME commit, one push, one production
   verification.** Never batched. Judge a process by its exit code.
2. **A green suite is not evidence.** Ask the standing question of every check:
   ⭐ ***"would this still pass if the feature were absent?"***
3. **Measure, don't infer.** ⛔ Before quoting a count, ask which POPULATION it counts.
4. **Run `npm run test:all`.** ⚠️ A `.mts` fixture's imports are OUTSIDE `tsc`'s include, so moving
   an export breaks a suite invisibly — that is how a broken test import reached production on
   2026-09-10. **Baseline: 311/324.** The 13 reds are named in `LIVE-QA-CAMPAIGN.md`; anything
   else red is yours.
5. ⛔ **Never `git add -A`** — shared checkout. `git commit --only <paths>`.
6. ⛔ **Every push to `main` is a LIVE DEPLOY.** Verify `uptimeSec` reset **and** re-read the
   surface. A 200 is not proof your commit is live.

### 0a · How to SEE — traps this platform has already paid for

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

### 0b · The instruments

- **`npm run qa:support-shots`** (`scripts/live/support-surface-shots.mjs`) — RUN FIRST. Signs in
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

**Two scope decisions, taken 2026-09-10 — do not re-open:**
- ⛔ **AUDIT-AND-FIX ONLY.** A ticket system was specified (Jay unit K #12) and never built; there
  is no `/admin/support`. OUT of scope, Ali's explicit call.
- ⛔ **The statutory helpline and licence number stay PINNED** — the saved config row had once
  contained 50pick's OWN desk number, and publishing it under *"Tanzania Helpline"* routes a
  self-excluding player back to the operator. **Keep them pinned; make the form say WHY.** Every
  other field must be genuinely editable; any that silently refuses is a defect.

---

## §2 · THE PLANNER — where we reached

| Unit | What it seals | Done |
|---|---|---|
| 1 | 🔴 The support email does not exist in EMAIL | ☐ 0/3 |
| 2 | 🔴 The operator's number is published as a helpline on 3 live surfaces | ☐ 0/5 |
| 3 | 🔴 A save that never lands looks exactly like one that did | ☐ 0/4 |
| 4 | 🔴 What the admin screen promises, validates, and won't explain | ☐ 0/5 |
| 5 | 🟠 Config frozen at module eval, and a gate on the forbidden primitive | ☐ 0/2 |
| 6 | 🟠 Two chat SAFETY mechanisms are unreachable when signed in | ☐ 0/3 |
| 7 | 🟠 A cooling-off break can be SHORTENED, and the copy deterring it is false | ☐ 0/3 |
| 8 | 🟠 Five suites are not on the deploy path; one asserts a retired value | ☐ 0/3 |
| 9 | 🟠 The first-login primer blocks its own photographer | ☐ 0/3 |
| 10 | 🟡 Routing and chrome — dialability, badges, duplicated constants | ☐ 0/7 |

<details><summary><strong>Row ledger — tick these</strong></summary>

| | Unit 1 · Email | where |
|---|---|---|
| ☐ | **1.1** `email.ts` reads `SUPPORT_EMAIL()`; no `support@50pick.tz` literal survives | `email.ts:31,364,511` |
| ☐ | **1.2** the DSAR bundle stops inventing a third address | `privacy.ts:285,301` |
| ☐ | **1.3** a guard fails on any support-address literal outside `support-config.ts` | new |

| | Unit 2 · Helpline framing | where |
|---|---|---|
| ☐ | **2.1** `/help`'s "Call us" card | `help/page.tsx:68-69` |
| ☐ | **2.2** the problem-gambling FAQ | `help/page.tsx:118` |
| ☐ | **2.3** the chatbot's RULE 2 hands out the STATUTORY line | `chat.ts:134,140` |
| ☐ | **2.4** §3's unit is the ELEMENT / prompt STRING, not the source line | `support-contact.test.mts:158` |
| ☐ | **2.5** `test:support-contact` is on `predeploy` | `package.json` |

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
| ☐ | **4.3** the derived `tel:` target is shown before save | `system-client.tsx` |
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

</details>

---

## §3 · ⭐ THE OWNER'S REPORT — SEVEN CAUSES, AND HOW TO TELL THEM APART

*"Some fields are not changing"* is **seven distinct mechanisms**, four of them invisible on every
screen. ⛔ **Do not start fixing until you know which one.**

| # | Cause | What the officer sees | Cheapest discriminator |
|---|---|---|---|
| **A** | Field DID change; the page they checked never showed it (**register**, **reality-check** — both named in the card's own copy) | Nothing moved | Open `/auth/register`, search the address. Zero hits ⇒ A |
| **B** | Changed on web, **not in email** (`REPLY_TO`) | Web moved; replies land in the old inbox | Trigger a password reset; read the footer and `ReplyTo` |
| **C** | Save **never reached the row**, reported success | Green toast, new value on screen, **reverts after restart** | `SELECT value FROM "SystemConfig" WHERE key='support_config'` right after saving |
| **D** | Save **refused** by the hydration gate | Red toast: *"Settings have not finished loading yet"* | Ask what colour the toast was. This one is honest |
| **E** | Step-up 2FA lapsed mid-save | Bounced to `/admin/totp-verify`, old values, no unsaved-changes prompt | Audit shows a TOTP verify and NO `config.support_updated` |
| **F** | View-only `ops` grant | Full-page `AdminError`, edits gone, a `privilege_escalation_blocked` SECURITY row | Look for that row; check their grant at `/admin/roles` |
| **G** | Chatbot capacity message frozen at module eval | Chat quotes the old number; the bot's other answers quote the new one | Cold-start, exhaust the daily cap, compare to `/help` |

**RUN THIS FIRST, BEFORE TOUCHING CODE** — one query pair at the timestamp the officer reported:
`SELECT value FROM "SystemConfig" WHERE key='support_config'`, then the ADMIN audit rows for
`config.support_updated`.
- Audit row present, value **matches** the row ⇒ the write landed. Cause is **A/B/G** — a READER
  problem, not a save problem.
- Audit row present, value **differs** ⇒ **C**. The write was lost and the console lied.
- Audit row **absent** ⇒ **D/E/F**; split by the same log.

⛔ **Until Unit 3 lands, no screenshot from an officer is evidence of anything** — the form is
uncontrolled, so a field that did NOT change can look changed, and one that did looks changed for
the wrong reason.

---

## §4 · THE UNITS

### Unit 1 🔴 · The support email does not exist in email
`email.ts:31` — `const REPLY_TO = "support@50pick.tz"` is the `ReplyTo` on **every** outbound
message (`:364`), the footer of all **49** templates (`:511`), and 8 inline links including both
account-compromise warnings. The file already imports `HELPLINE` from `support-config` and does
**not** import `SUPPORT_EMAIL`. Production publishes `msaada@50pick.tz`, so **the site publishes
one inbox and every email replies to another.** Same class: `privacy.ts:285,301` hands the DSAR
bundle a **third** address, `privacy@50pick.tz`, in no config, with no admin field, contradicting
`/legal/privacy §1`.
**Accept when:** `email.ts` reads the getter, no support-address literal survives in `src/` outside
`support-config.ts`, and a guard proves it — red before, green after.

### Unit 2 🔴 · The operator's number is published as a helpline, three times
- `help/page.tsx:68-69` — `value={SUPPORT_PHONE()}` under `sub={t.help.freeHelpline}` =
  *"Free helpline · 24/7"*. Public, no session.
- `help/page.tsx:118` — the FAQ whose question is ***"I think I have a problem with gambling"***
  appends ` ${SUPPORT_PHONE()} (Free).`
- ⛔ `chat.ts:134` — `Helpline ${SUPPORT_PHONE()} (free, 24/7)`, and **`chat.ts:140` RULE 2
  instructs the model to give that number to a self-identifying problem gambler.**
  `grep -n HELPLINE src/app/_actions/chat.ts` → nothing.

The number is **not free**: `0800 11 0011` is the toll-free statutory line; the operator's is a
normal-rate number.
**Why the guard missed all three:** `support-contact.test.mts:158-171` resolves `t.*` paths **on the
same line** as an operator getter. Case 1 spans two lines of one JSX element; case 2's label is
`t.common.free` ("Free"), which the helpline regex does not match; case 3 writes "Helpline" as an
English literal in a prompt string, so `resolveEn` is never called. The guard even says *"The line
is the unit because that is the unit a player reads."* ⭐ **A player reads a CARD and a PARAGRAPH.**
⚠️ And `predeploy` does **not** contain `test:support-contact` (measured).
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
`ChatRoot.tsx:147` calls `chatWithClaude` first and falls through to `sendMessage` only on `null` —
which, in production, never happens. So the at-risk pre-filter and `RgRedirectCard` (whose contract
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
`predeploy` omits `test:support-contact`, `test:tap-target`, `test:popup-fit`, `test:type-scale`,
`test:eyebrow-roles` (all measured). `scripts/multi-persona-test.mjs:261` asserts the footer
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

## §5 · ⛔ WHAT THIS BRIEF DID **NOT** COVER

- **Nothing was executed against a running app for the source survey.** Six readers worked read-only
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
- **Not read:** Postmark-side templates outside `email.ts`; the 49 bodies individually;
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

## §6 · ⏭️ **RESUME AT (session 1 — nothing started):**

Nothing in §2 is ticked.

1. **Run `npm run qa:support-shots`** to refresh the baseline.
2. **Run the §3 query pair FIRST.** It costs one minute and decides which of seven bugs the owner
   actually hit. ⛔ Do not start fixing before you know.
3. Then **Unit 1** or **Unit 2** — both are located, reproducible, and player-facing. Unit 2's
   chatbot case is the most severe thing in this document: the model is instructed to hand the
   operator's own number to a player who has just said they have a gambling problem.

⛔ **Unit 2.4 must land in the same session as 2.1–2.3.** A guard that cannot see the defect it was
written for is worse than no guard, and this one demonstrably cannot see any of the three.

⚠️ `git pull`, `npm install` if dependencies moved, and confirm `test:all` is **311/324** so
anything else red is yours.
