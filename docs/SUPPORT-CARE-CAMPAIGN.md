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
   🟢 **THE BASELINE IS NOW 313/326, REPLICATED 2026-09-11 BY TWO SESSIONS IN TWO SEPARATE
   CHECKOUTS** — one long-lived (322 packages), one a fresh `git worktree` with a clean `npm ci`
   (328 packages) — same thirteen reds, same order, same denominator. Two independently built
   dependency trees at one commit agreeing is a replication, not a number quoted twice, and it
   retires dependency drift as an explanation for anything. **There is no 14th red at 140fcc6a.**
   ⛔ **THE OLD `jsqr` WARNING HERE WAS DELETED, AND WHY MATTERS MORE THAN THAT IT WAS WRONG.** It
   said `test:lipa-qr` dies on `Cannot find module 'jsqr'` and to disregard that red. Measured
   2026-09-11: `jsqr` is installed and **`test:lipa-qr` PASSES**. A remembered benign explanation
   for a red is the most dangerous thing to carry into a measurement — it is the same shape as a
   ready explanation for an absence, and it makes the next REAL failure of that suite invisible.
   The rule that survives is the general one: **read the FIRST failure's text before believing a
   red**, and never bring an explanation to it.
   in `docs/LIVE-QA-CAMPAIGN.md`. **Anything else red is yours** — do not push past it, and do not
   re-baseline a ratchet to make your own red go away.
   ⚠️ **TWO SUITES ARE RED FOR REASONS THAT ARE NOT PRODUCT DEFECTS AND NOT YOURS** (filed
   2026-09-11): `test:orphans` names **3 TRACKED** undeclared scripts committed at 140fcc6a
   (`scripts/live/ops/levy-divergence.cjs`, `scripts/live/ops/payments-now.cjs`,
   `scripts/ops-updown-probe-bars.mts`) plus whatever untracked leavings your checkout carries;
   and `test:guards-exist` §3 was watched flipping **PASS → FAIL → PASS inside one hour** on
   2026-09-11, resolving the `ops:prelaunch-purge` key against an untracked target under `scripts/`.
   🟢 **CAUSE FOUND, AND IT WAS NOT A DEFECT: A THIRD SESSION WAS WORKING IN THIS CHECKOUT.**
   `asheib-33` was staging the pre-launch production reset and creating those scripts as it went,
   so the file genuinely came and went under a gate that reads the filesystem.
   ⛔ **AND I HAD ALREADY WRITTEN A CONFIDENT WRONG EXPLANATION FOR IT** — *"an npm key dangling in
   every fresh clone"* — true about git, false about the cause, and it would have sent the next
   session hunting a defect that does not exist. ⭐ **A READY EXPLANATION IS THE MOST DANGEROUS
   THING TO BRING TO A MEASUREMENT.** Before concluding anything from a gate that reads the
   filesystem, ask who else has this directory open — `ListAgents` answers it in one call, and
   ⚠️ **TWO SESSIONS IS NOT A MAXIMUM.** ⛔ Its path is described here and not written
   out, deliberately — `docs-links.mjs` resolves script paths found in prose, so quoting a missing
   one ADDS a third `test:docs` failure. That is §0a's rule, and it caught this very paragraph. ⛔ Neither remedy is safe unattended: the orphan allowlist may
   only SHRINK, and deleting an npm key is a product decision.
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
   🔴 **AND A RESET `uptimeSec` IS NOT PROOF EITHER — corrected 2026-09-10, while two sessions were
   deploying minutes apart.** The payload carries `version: "1.0.0"` and **no commit SHA**, so a low
   uptime proves *a* deploy landed, never *whose*. The peer session read `uptimeSec: 97` and it was
   MY container, not theirs. ⭐ **Verify by ARTIFACT: fetch something only YOUR commit can produce.**
   For this campaign that was the published contact strings (`/help` no longer saying "Free
   helpline", `/legal/privacy` serving `msaada@` where `privacy@50pick.tz` used to be); for a schema
   change it is querying for the new column or enum value. ⚠️ To settle it directly:
   `railway deployment list --json` reports `status` plus `meta.commitHash`, which is the only
   reading that names the commit — `BUILDING` there is also how you tell a slow deploy from a
   failed one before concluding anything from an unchanged uptime.
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
- ⛔ **WORKTREES, NOT A SHARED DIRECTORY.** 🔴 **THE PARAGRAPH THAT STOOD HERE WAS ITSELF FALSE,
  AND IT IS THE BEST EXAMPLE IN THIS DOCUMENT OF THE THING THIS DOCUMENT IS ABOUT.** It said, in
  bold, *"CORRECTED 2026-09-10 BY BOTH SESSIONS INDEPENDENTLY: there is no `F:` drive on this
  machine — `ls -d /f/kipindi-main` fails and only `/c` is mounted"*, and directed every future
  session to `C:\kipindi-main`. **The repository is on `F:\kipindi-main` and always was.** Two
  sessions agreed, wrote it down as a correction, emphasised that they had reached it
  independently — and were both wrong, inside the file that warns about guards that agree and are
  both wrong. ⭐ Agreement is not evidence. Re-derive, then write.
  The working directories, measured 2026-09-11: **`F:\kipindi-main`** (support & care) and
  **`F:\kipindi-seal`** (payments seal, a `git worktree` on branch `payments-seal-s3`).
  ⭐ For a read that needs the database, `railway run --service Postgres -- <cmd>`
  injects `DATABASE_PUBLIC_URL` into the child process, so the credential is never typed into a
  command line. The Railway **MCP** also works, but only when passed `project_id` explicitly — it
  cannot discover the link by itself and answers `Unauthorized` if you let it try. The second session takes its own
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

### 0.5 · ⭐ YOU DECIDE — the owner has delegated it

⭐ **THE OWNER'S INSTRUCTION, 2026-09-10, VERBATIM:** *"take decisions if needed, as I'll be away.
Decisions should be as per what they think is more perfect with the overall flow of the platform."*

⛔ **So a design question is NOT a blocker any more. It is your call.** Do not park a unit waiting
for a ruling that is not coming, and do not quietly shrink a unit to the part you can finish without
deciding. **Decide it, record it, ship it.**

#### The criterion he gave you — use it literally

**"More perfect with the overall flow of the platform."** That is a coherence test, not a taste
test, and it has a concrete meaning here:

1. ⭐ **What does this codebase already do for the same class of problem?** This repo is unusually
   consistent and unusually well-commented about WHY. Find the established pattern and follow it.
   The nearest existing precedent beats a cleaner idea with no precedent.
2. ⭐ **Which option leaves the platform easier to reason about in six months?** Prefer one concept
   over two. Prefer a single source of truth over a synchronised pair. Prefer making an invariant
   explicit over relying on a convention.
3. ⭐ **Which option makes the next defect in this area IMPOSSIBLE rather than merely unlikely?**
   This platform's whole standing doctrine is to seal the class, not the instance.
4. ⚠️ **When two options are genuinely balanced, take the REVERSIBLE one.** The owner is away; a
   choice he can undo cheaply is worth more than the marginally better choice he cannot.
5. ⛔ **Never decide by "what is quickest to make green."** That is how this repo acquired the
   guards that lie.

#### Record every decision — this is the part that makes delegation safe

For each decision you take, add a row to the **DECISION LOG** at the end of this file:
what you decided, the alternative you rejected, the criterion above that settled it, and the
files it touched. ⭐ **Write it so the owner can overturn it in one read.** A delegated decision
that is not written down is indistinguishable from a defect.

⚠️ **If a decision changes money semantics, a binding document, or a compliance position, say so
explicitly in that row and flag it in your final summary.** It is still yours to take — but he must
be able to find it without hunting.

#### What is still NOT yours

§0.6's hard stops are safety rails and standing owner rulings, not open questions. And if you find
a genuine external blocker — a credential you do not have, a vendor secret, a third party who has
to act — that is not a decision, it is a dependency: record it in §2 as a `⛔ BLOCKED` row with what
would unblock it, do every other unit, and report it at the end. **Never idle.**

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
| 1 | 🔴 The ruled contacts vs the six wrong values still shipping | ✅ **7/7 — LIVE** |
| 2 | 🔴 The operator's number carries a free-helpline framing at 5 sites | ✅ **6/6 — LIVE** |
| 3 | 🔴 A save that never lands looks exactly like one that did | ✅ **4/4 — LIVE** |
| 4 | 🔴 What the admin screen promises, validates, and won't explain | ✅ **5/5 — LIVE** |
| 5 | 🟠 Config frozen at module eval, and a gate on the forbidden primitive | ✅ **2/2 — and the CLASS was 4× bigger than the brief said** |
| 6 | 🟠 Two chat SAFETY mechanisms are unreachable when signed in | ✅ **6/6 — LIVE. ⚠️ LATENT, not live-exposed: `chatbotEnabled` is OFF on production (measured, with a positive control). It FAILS OPEN, which is why it still shipped** |
| 7 | 🟠 A cooling-off break can be SHORTENED, and the copy deterring it is false | ✅ **3/3 — LIVE** |
| 8 | 🟠 Five suites are not on the deploy path; one asserts a retired value | ✅ **3/3 — LIVE. ⚠️ the brief's list of six was STALE; the real defect was 5 of THIS CAMPAIGN'S OWN guards** |
| 9 | 🟠 The first-login primer blocks its own photographer | ✅ **3/3 — LIVE** |
| 10 | 🟡 Routing and chrome — dialability, badges, duplicated constants | 🟡 **6/8 — LIVE.** ⭐ the ledger had **7** rows and the §4 prose held an **8th finding with no row** (CHASING_LOSSES); 10.1 and 10.8 remain, both re-scoped by measurement |
| 11 | 🟠 "Perfect support user management" — the DESK, which nothing here audits | ☐ 0/4 |

<details><summary><strong>Row ledger — tick these</strong></summary>

| | Unit 1 · Email | where |
|---|---|---|
| ✅ | **1.1** `SUPPORT_DEFAULTS.email` is `msaada@50pick.tz` — and the comment that coupled it to `ReplyTo` *in prose* is gone, because the coupling is now real: `REPLY_TO` is a function over `SUPPORT_EMAIL()` | `src/lib/support-config.ts` |
| ✅ | **1.2** `server/email.ts` reads `SUPPORT_EMAIL()` at all **9** call sites; `REPLY_TO` is `() => SUPPORT_EMAIL()`. ⛔ A FUNCTION, never `const REPLY_TO = SUPPORT_EMAIL()` — that would be the Unit 5 defect inside the file that sends every email | `src/lib/server/email.ts` |
| ✅ | **1.3** the DSAR bundle stops inventing a third address — both statutory response paths (correction, erasure) now read the row | `src/lib/server/privacy.ts` |
| ✅ | **1.4** the web-push VAPID subject reads the row | `src/lib/server/push-service.ts` |
| ✅ | **1.5** `SUPPORT_DEFAULTS.phone` is `0769777877` — the local form a Tanzanian dials. ⛔ Landed only AFTER 4.3, exactly as §1 required | `src/lib/support-config.ts` |
| ✅ | **1.6** `SUPPORT_DEFAULTS.phoneTel` is `+255769777877`, and §9 asserts it is EXACTLY what `toDialTarget(phone)` yields — the two can no longer disagree silently | `src/lib/support-config.ts` |
| ✅ | **1.7** new **§8** fails on any support-contact literal outside the source of truth, over `src/` AND `scripts/`, comments stripped by `decomment`. Proven RED on **8** sites. ⚠️ The desk number is banned only in E.164 form: the bare digits `0769777877` are ALSO the agent programme's `feeDestinationAccount`, and banning them would accuse four correct files and collide with the other campaign | `scripts/support-contact.test.mts` |

| | Unit 2 · Helpline framing | where |
|---|---|---|
| ✅ | **2.1** `/help`'s "Call us" card — sub-label is now `t.help.supportLine` ("Our support desk"), claiming no tariff and no national status. ⭐ The old copy was **measured on production**, not inferred: «Call us +255769777877 Free helpline · 24/7». | `help/page.tsx` |
| ✅ | **2.2** the problem-gambling FAQ — faq5 now returns `HELPLINE()`, so the `t.common.free` label beside it is TRUE for the first time (the statutory line really is free) and an at-risk player is sent to the independent service, not the house | `help/page.tsx` |
| ✅ | **2.3** the chatbot's RULE 2 hands out the STATUTORY line — `chat.ts` now imports `HELPLINE` (it imported nothing of the kind before) and RULE 2 names it. The fact line splits the desk from the helpline onto separate statements | `src/app/_actions/chat.ts` |
| ✅ | **2.4** §3's unit is the ELEMENT / prompt STRING, not the source line — new **§6** (element + line windows, vocabulary widened to free/24-7/hotline in en·sw·zh, raw literals as well as resolved `t.*`) and **§7** (no at-risk response may name an operator contact). ⭐ Proven RED on all five sites, then GREEN, then **re-broken by five independent mutations and caught every time**. §3 stayed green throughout — which is the demonstration that it was blind, not that it was passing | `scripts/support-contact.test.mts` |
| ✅ | **2.5** `test:support-contact` AND `test:cert-c1` are on `predeploy` — inserted after `test:i18n`; chain 94 → 96 entries. ⚠️ `test:cert-c1` IS `comms-email-truth` (same suite, different name) — neither brief says so | `package.json` |
| ✅ | **2.6** `CAPACITY_MESSAGES` lose *"(free, 24/7)"* / *"(bure, saa 24)"* / *"（免费，全天候）"* — and became `capacityMessage(locale)`, a FUNCTION, so 5.1 landed with it exactly as the brief required | `src/app/_actions/chat.ts` |

| | Unit 3 · Saves | where |
|---|---|---|
| ✅ | **3.1** `save()` is awaited and its failure reaches the caller — via a NEW `setVerified`. ⛔ `await` alone proves nothing: `saveConfig` never throws, so the fix is **await + READ THE ROW BACK**, the shape `chain-purge.ts:putJob` already uses. ⚠️ `set()` keeps its SYNC signature and no-DB fast path — `tryHydrate` settles synchronously *because* `set()` is sync, `proposals-state` caught that once, and all 325 suites run without a DATABASE_URL | `src/lib/server/define-config.ts` |
| ✅ | **3.2** a failed write yields a danger toast and NO audit row — the registry mutation, the audit row and `{ok:true}` ALL happen after the read-back succeeds. A `set()` that returned `{ok:false}` having already cached would satisfy a naive test and reproduce the defect | `define-config.ts` · `admin/system/actions.ts` |
| ✅ | **3.3** the form re-renders from the row, not from the keyboard — the inputs are uncontrolled (`defaultValue`), which React reads once per mount, and `router.refresh()` never remounted them. The component is now keyed on the STORED values, so a refresh remounts it from the row and a refused save snaps back | `src/app/admin/system/page.tsx` |
| ✅ | **3.4** proven by forcing the write to fail, not by reading the diff — new **§5** drives the real factory through the `deps` seam against a store that ACCEPTS the write and then does not have it (a read-only replica / timed-out pool). Asserts refusal, the untouched cache, and that the write was really attempted. ⭐ Plus a CONTRAST assertion that the sync `set()` still reports ok for the same lost write, so the difference between the two paths is executable rather than described. 26/0; 3 mutations all caught | `scripts/define-config-gate.test.mts` |

| | Unit 4 · The admin screen | where |
|---|---|---|
| ✅ | **4.1** every destination named in the card copy actually renders the value — MEASURED surface by surface. **Two were wrong**: `register` renders no support contact at all (its `HELPLINE` import was dead — now removed, along with three more in `login`, `reset-password`, `verify-email`), and `reality-check` renders the PINNED helpline this form cannot move, so naming it promised the opposite of what the pinning guarantees. The other eight verified | `src/app/admin/system/page.tsx` |
| ✅ | **4.2** phone is validated at BOTH layers — an addressed `fieldError("support-phone", …)` in the action, and a `validate` on the config itself so the data is protected even if the form's check is removed. The action's own comment conceding *"nothing to point at for it"* is corrected in place | `src/app/admin/system/actions.ts` · `src/lib/server/support-config.ts` |
| ✅ | **4.3** new `toDialTarget()` converts `0…` → `+255…` (the old code stripped punctuation and nothing else), the form shows a live **Dial target** preview of exactly what will be stored, and the hint no longer steers to the retired landline. ⭐ This was the PREREQUISITE of 1.5 | `src/lib/support-config.ts` · `system-client.tsx` |
| ✅ | **4.4** a locked field LOOKS locked and states the REASON — ⭐ **this is CAUSE H of the owner's report.** `input.tsx` painted NO disabled state at all: the pinned helpline rendered with the same border, fill, ink and hover as the two editable boxes, because the atom sets `text-text` explicitly and overrides even the UA grey. Border AND fill AND ink now all move. And the hint answers WHY, not whether — 'not editable' told an officer what they had already discovered by typing | `src/components/ui/input.tsx` · `system-client.tsx` |
| ✅ | **4.5** `LICENCE_NUMBER` appears read-only with the same treatment — it renders in every footer and had no admin field and no mention anywhere in the console, so an officer could not confirm what the platform publishes to a Board reviewer without reading the source | `system-client.tsx` |

| | Unit 5 · Frozen config | where |
|---|---|---|
| ✅ | **5.1** no module-scope value captures a `defineConfig` getter — `chat.ts` unfrozen, AND the three statutory legal pages (`legal/aml`, `legal/privacy`, `legal/responsible-gambling`) converted from `const CONTENT = {…}` to the `function content()` shape `legal/terms` already had. ⛔ My first sweep said "nothing else" and was WRONG — it matched a getter and a `const` on the SAME LINE, which cannot see a multi-line object. New **§11** spans each top-level declaration by bracket depth and ignores anything deferred behind `=>`/`function`, so `const REPLY_TO = () => SUPPORT_EMAIL()` stays legal. Refreezing `legal/aml` goes RED | `scripts/support-contact.test.mts` |
| ✅ | **5.2** `ai-controls` uses `loadConfigResult`, flag set LAST on `ok` — ⭐ **AND THE GUARD THAT EXISTS FOR THIS EXACT DEFECT WAS BLIND TO IT.** `test:config-hydration-gate` covered a HAND-WRITTEN list of four modules; `ai-controls` was not on it. Population is now DISCOVERED from the tree (any module that latches a `__50PICK_*_HYDRATED` flag **and** reads config-store), which found **three more** with the identical defect: `resolution-policy.ts` (the two-officer authorization switch — a COMPLIANCE control), `market-sentinel.ts` (the operator's pause on the resolution AI) and `source-registry.ts` (operator-disabled categories). All three fixed. ⚠️ `audit.ts` also latches a `_HYDRATED` flag and is deliberately EXCLUDED by rule, not by exemption: it reloads the HMAC ring from Prisma, never from SystemConfig, and its "claim first" is race protection. 46/0, was 38-over-4 | `src/lib/server/ai-controls.ts` · `resolution-policy.ts` · `market-sentinel.ts` · `source-registry.ts` · `scripts/config-hydration-gate.test.mts` |

| | Unit 6 · Chat safety | where |
|---|---|---|
| ✅ | **6.1** at-risk input renders the RG card signed-in AND signed-out — the decision is now taken **above** the backend choice, not below it. ⭐ That is the whole fix: the filter lived inside `sendMessage`, which `ChatRoot` reached only when the live call returned `null`, so **three** paths bypassed it — a signed-in player, the daily-quota reply and the API-error reply, the last two because both return TRUTHY text. Widening the branch would have left room for a fourth | `ChatRoot.tsx` · `send-message.ts` |
| ✅ | **6.2** the escalate path can fire on the live path — `chatWithClaude` may now return `unresolved: true`, and `ChatRoot` propagates it. ⛔ Only the two replies the SERVER knows are not answers are marked (daily cap, API error, plus an empty completion); judging the model's own reply would need a second model call, and guessing from its text is how a guard starts asserting a proxy | `chat.ts` · `ChatRoot.tsx` |
| ✅ | **6.3** `handoffBody` asserts nothing the product does not do — it promised an attached transcript, a pick-up notification and an availability window; the action is a bare `mailto:` with a `subject=` and nothing else, there is no ticket model and no notification event. Rewritten in all three locales. ⭐ §4's population is **discovered from the card** — every `t.*` key it renders — so the `6.7` failure cannot repeat: move the promise to the title and the gate follows it | `i18n-dict.ts` · `scripts/chat-safety.test.mts` |
| ✅ | **6.4** the classifier speaks the languages the product does — there were **seven** patterns, five English and two Swahili, and **not one Chinese**, while `detectLang` has stamped `zh` since B-7. A Chinese-speaking at-risk player had no deterministic safety response *by construction*. ⚠️ zh patterns carry no `\b` — Chinese has no word boundaries, and writing them like the English ones would have added patterns that match nothing | `send-message.ts` |
| ✅ | **6.5** 🔴 **the filter could not recognise 50pick's OWN published wording of the at-risk case.** `help.faq5q` — *"I think I have a problem with gambling. What can I do?"* — is the FAQ this platform publishes on `/help` in three languages, and none of the three matched. ⭐ The guard now reads those three strings **out of the dictionary at run time** rather than restating them, so the FAQ and the filter cannot drift apart in silence. A corpus I type is a corpus I tune until it passes | `send-message.ts` · `scripts/chat-safety.test.mts` |
| ✅ | **6.6** 🔴 **a comment that described a fix which had not happened.** `send-message.ts`'s header says the 2026-09-07 A-5 sweep deleted the invented KYC ladder and that *"'tier 2' and that cap exist nowhere in this codebase"* — past tense. Two of the four branches were never touched: it went on telling players about a *"Tier 1"*, a *"Tier 2"* and a *"TZS 200,000/day"* cap for four more days. `grep -rn "Tier 1\|Tier 2\|TIER_"` over the KYC server code returns **nothing** — there is no tier model, no per-tier limit, no daily cap. Also fixed in the same branch family: the withdrawal line stated *"typically within 60 seconds"* having dropped the **"under TZS 1,000,000"** qualifier that `/legal/terms` and `chat.ts` both carry, turning a sourced statement into a promise the platform breaks on exactly the withdrawals that matter most | `send-message.ts` |
| ✅ | **6.g** the guard: new `test:chat-safety` (4 sections) + `red:chat-safety`. Proven RED against the unfixed tree with **16 named failures**, then GREEN, then **9 independent mutations, 9 caught**. ⭐ Two escaped on the first run and both are recorded in the harness rather than quietly swapped: one was a real hole — `if (intercepted && false)` left the word `return` in the source, so a bare `/\breturn\b/` passed over a branch that can never be taken (textual presence standing in for reachability); the other was a **badly aimed mutation**, which added a second backend call to force an ordering change and so failed on the wrong check. A mutation that breaks the subject two ways proves nothing about either | `scripts/chat-safety.test.mts` · `scripts/chat-safety-red.mjs` |

| | Unit 7 · Cooling-off | where |
|---|---|---|
| ✅ | **7.1** a shorter break cannot overwrite a longer one — new `furthest()` takes the FURTHEST date, never the newest, in **both** `coolOff` and `selfExclude`. ⛔ Cooling-off was the exploitable one and that is the point: `SELF_EXCLUDED` is refused at the sign-in gate so that form is unreachable, while `COOLED_OFF` is deliberately absent (and must stay absent — a break stops betting, not access to your own money), so the form stays reachable for the whole break. ⭐ The start stamp now survives a re-take too: overwriting it destroyed the record of when the break BEGAN, which the register has to state | `src/lib/server/responsible-gambling.ts` |
| ✅ | **7.2** the RG page renders the ACTIVE break and its end date — the page read neither `coolingOffUntil` nor `selfExclusionUntil`, so a player mid-break saw the form in its default state with every duration selectable. It now says a break is running, until when, and that it cannot be shortened — so nobody discovers that by trying | `src/app/profile/responsible-gambling/page.tsx` |
| ✅ | **7.3** no RG string claims a sign-in block for cooling-off — `t.rg.breakDescription` (the CONFIRMATION DIALOG body, the last thing read before deciding) said *"You cannot bet, deposit, or sign in until it ends"* in all three locales, and `coolOffHtml` repeated it in the email. ⛔ **The existing guard 6.7 was GREEN throughout** because it pinned ONE key by name (`coolingOffBody`) and the false claim had moved to another. Widened to every break/cool-off key, tempered so it cannot flag the fix ("cannot bet … but you **can still** sign in"), scoped so it does not demand that self-exclusion's TRUE sign-in claim be made false, with two controls | `src/lib/i18n-dict.ts` · `src/lib/server/email.ts` · `scripts/rg-doors.test.mts` |

| | Unit 8 · Gates | where |
|---|---|---|
| ✅ | **8.1** ⛔ **the brief's list of six was STALE — two were added by row 2.5 — and chasing it would have missed the sharper fact.** Measured: **five of the guards THIS CAMPAIGN ITSELF SHIPPED** were off the chain a session runs before pushing — `test:chat-safety`, `test:rg-doors`, `test:define-config-gate`, `test:config-hydration-gate`, `test:stacking`. All five confirmed GREEN first, then chained after `test:cert-c1`; 98 → 103 entries. ⭐ **A guard written for a defect and kept off the path that would catch its return has already failed once and nobody noticed.** ⛔ The 13 baseline reds stay OFF, permanently: `predeploy` is a checklist a human runs, and one that is red before you start is one people learn to ignore. New **§13** holds the line, with a control that separates *"nothing is on the chain"* from *"I could not read the chain"* | `package.json` · `scripts/support-contact.test.mts` |
| ✅ | **8.2** `multi-persona-test.mjs` **DELETED**, with its `orphan-allowlist.json` entry. It asserted the **retired** `TZ-GBT` placeholder on the public footer — red against correct code, green while the placeholder was live — and it was wired to **no npm key at all**, so neither result was ever observed. ⭐ It was also explicitly ALLOWLISTED, so `test:orphans` was silenced about it: a dead file carrying a permission slip. A Sprint-20 manager-demo walk-through of five personas; recoverable from history if it is ever wanted | deleted · `scripts/orphan-allowlist.json` |
| ✅ | **8.3** 🔴 **a guard for this already existed and was WORSE than none.** `rules-copy.test.mts:144` asserts `text.includes(LICENCE_NUMBER())` against copy that RENDERS `{LICENCE_NUMBER()}` — **both sides move together**, so it holds for any value at all, including the `TZ-GBT-2026-XXXX` this platform really did publish to players until 2026-09-10. New **§12** pins the value against **Ali's ruling** instead of against itself, bans a second hard-coded copy, and bans the retired placeholder as a VALUE. ⚠️ Its first draft scanned `src/` only — blind to the one `.mjs` under `scripts/` where the placeholder actually survived — and once widened it flagged **itself**, so both needles are assembled from parts rather than spelled. Proven red on two constructed mutations; the widened scan is what made 8.2 go red | `scripts/support-contact.test.mts` |

| | Unit 9 · The primer | where |
|---|---|---|
| ✅ | **9.1** it can be photographed — the UA block is addressed. ⛔ The block is KEPT rather than deleted: about ten drives assume the primer is absent, and removing it would turn a documentation problem into ten broken gates. What was missing is a way to ASK for it, so automation opts in explicitly with `?primer=1` (or a localStorage flag) and nothing that does not ask changes behaviour | `src/components/onboarding/first-visit-primer.tsx` |
| ✅ | **9.2** the render guard tests `SUPPRESS_ON`, not only the mount effect — ⭐ **this was the real defect.** Land on `/markets`, the primer opens; tap a card and the SOFT navigation re-runs the effect, which returns early on the new path — but `open` is already true and the render guard had no opinion about `SUPPRESS_ON`, so the tour sat over the bet widget it exists to stay away from. `ChatRoot.tsx` had the right shape all along: it tests its own pattern in the effect AND the render. New **§6** in `test:stacking`, 3 mutations caught | `first-visit-primer.tsx` · `scripts/stacking-contract.test.mts` |
| ✅ | **9.3** a wired drive asserts a RECTANGLE at 360/393/768 × en/sw/zh — `qa:support-shots` now forces the primer and measures the dialog's box, viewport overflow, off-screen top and control count at nine cells. ⚠️ Each row carries a LOCALE POSITIVE CONTROL, because the cookie is `kp-locale` and a page that silently served English would satisfy every geometry assertion in all three languages | `scripts/live/support-surface-shots.mjs` |

| | Unit 10 · Routing and chrome | where |
|---|---|---|
| ☐ | **10.1** the self-exclusion refusal gives a DIALABLE number — ⛔ **RE-SCOPED BY MEASUREMENT, NOT DONE.** The refusals at `auth-service.ts:169,185` are SERVER strings rendered as plain text, so an anchor cannot simply be embedded: the fix is `{phone}`/`{email}` placeholders on the four `auth.selfExclusion*` dict keys in three locales plus `fillNodes` in the login error panel. Bigger than one edit and NOT started — left sealed rather than half-applied | `auth-service.ts` · `i18n-dict.ts` · `auth/login` |
| ✅ | **10.2** the reality-check helpline is a `tel:` — it printed the PINNED statutory number in a `<span>` inside the modal that interrupts live play, directly under a Self-exclude button. ⚠️ It imports only the pinned half (`HELPLINE`, `HELPLINE_TEL`): this is a `"use client"` module, and §4/§5 fail on a client component that reads a config GETTER, because a browser bundle's module cache can never be hydrated server-side | `reality-check.tsx` |
| ✅ | **10.3** legal pages open the address they cite a deadline against — ⭐ **the guard found ELEVEN bare sites, not the six the brief listed**, and two of them are in `auth/forgot-password`, which the brief names as an example of a page doing it CORRECTLY. Also `auth/admin` and `profile/account`. All wrapped in the anchor shape `legal/aml` already ships | `terms` · `privacy` · `auth/*` · `profile/account` |
| ✅ | **10.4** the footer email label is a dict key in all three locales — `Email · {supportEmail}` was a hardcoded English literal one line below the translated `t.footer.helpline`, on EVERY page. ⭐ **`test:i18n` could not see it and never could:** it walks the DICTIONARY for missing or untranslated keys, and a string that was never a key is outside its population by construction. An absent key is invisible to a parity check | `public-footer.tsx` · `i18n-dict.ts` |
| ✅ | **10.5** both 18+ badges measure the same rectangle — MEASURED, and the brief's arithmetic was right: `tailwind.config.ts:220` overrides spacing `"7"` to **40px**, so `w-7 h-7` rendered 40×40 while `.kp-rg__18` is 28×28, same border, ink and type size, both visible on `/` in one scroll. ⭐ Fixed by adopting the design system's own class — **ONE definition site, not two numbers kept in step.** `test:design-frozen` green | `public-footer.tsx` |
| ✅ | **10.6** `global-error.tsx`'s four helpline copies — ⛔ **AND THE OBVIOUS FIX WAS THE WRONG ONE.** Importing the constant is safe on the import graph (`support-config.ts` imports NOTHING), but the file carries an explicit reasoned rule — *"this file deliberately imports nothing"* — because it is the root error boundary, rendering when the root layout has already failed. Overriding a documented ⛔ to save a duplication is how a robustness decision gets quietly undone. ⭐ **So the copies stay and the DRIFT is made impossible instead:** new **§15** discovers every helpline-shaped literal in the file and fails if any disagrees with the pinned constant | `global-error.tsx` · `scripts/support-contact.test.mts` |
| ✅ | **10.7** the AML copy states the comparison the code makes — `payments.ts:197` holds at `>=`, so a withdrawal of EXACTLY 1,000,000 is held while the email explaining the hold told the player their amount was not over the line. ⭐ **No compliance decision was needed: `legal/aml:46` and `terms:87` already publish "TZS 1,000,000 or more",** so the copy was corrected to the position the binding pages already state, in all three locales, across BOTH surfaces — 5 strings, not the 1 the row implies | `i18n-dict.ts` · `email.ts` |
| ✅ | **10.g** the guard: new **§14** in `test:support-contact` — every place a contact getter is rendered AS TEXT must sit inside an anchor with the matching scheme. ⭐ **The unit is the rendered text node, not the file:** "this file contains a mailto" is satisfiable by one correct anchor beside five bare spans, which is exactly the shape the footer proves exists. Proven RED on 11 sites. ⚠️ **This property CANNOT be verified by fetching the live page** — Cloudflare Scrape Shield rewrites every `mailto:` on this origin into a `/cdn-cgi/l/email-protection` interstitial (measured: ZERO real mailto hrefs served anywhere), so a live grep reads 0 whether the source is right or wrong. ⛔ ONE exemption, named and controlled at exactly one file: `legal/agent-terms` belongs to the parallel session | `scripts/support-contact.test.mts` |
| ☐ | **10.8** ⭐ **A ROW THAT DID NOT EXIST — the §4 prose carried an 8th finding with no ledger line.** `CHASING_LOSSES` filters `BET_PLACED && CONFIRMED` — every bet, won or lost — while its detail string says *"within 30 min of a losing bet"*. ⛔ Measurement says it cuts BOTH ways and the FALSE LOW is the worse half: a loss is not distinguishable at that point at all. NOT started — it needs the loss taken from settled positions without turning an existing per-user walk into a timeout | `responsible-gambling.ts` |

| | Unit 11 · The support desk | where |
|---|---|---|
| ☐ | **11.1** what a SUPPORT grant can actually see and do is written down | `roles.ts:198-201,242` |
| ☐ | **11.2** every control a SUPPORT user cannot use is disabled WITH ITS REASON, not absent | `/admin/players` |
| ⛔ | **11.3** the desk is measured signed in AS SUPPORT, not as ADMIN — **BLOCKED: `QA_SUPPORT_PASSWORD` is not in `.env.qa.local`** (measured; the file holds 7 other QA secrets and not this one). UNBLOCKED BY: the owner adding that secret, or minting the `support` persona. ⚠️ An instrument already exists — `qa:read-tiers` signs in as SUPPORT — so this is a missing CREDENTIAL, not a missing driver | `.env.qa.local` |
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

🔴 **A LIVE PRE-DEPLOY GATE PINS THE RETIRED ADDRESS, AND NOTHING IN THIS BRIEF NAMED IT —
FOUND 2026-09-10.** `scripts/pre-deploy-live-check.mjs:220` is
``ok(`footer support email`, body.includes("support@50pick.tz"));`` and `qa:live` **IS on the
`predeploy` chain** (unlike `test:support-contact`, which is not). ⭐ **It is already RED against
production today**, because the live footer serves `msaada@50pick.tz` — measured on the real site,
not inferred. So this gate is asserting a value the platform stopped publishing, on the deploy path,
and it must be changed to read the getter in the SAME commit as row 1.1 or the fix cannot ship.
⛔ This is the same class as Unit 8.2 (`multi-persona-test.mjs` asserting a retired `TZ-GBT`) — a
guard that pins the WRONG answer — and Unit 8's inventory of such gates does not list it.

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
drives it that way. ~~Make the injected `save` reject~~ and assert the toast, the revert and the
absence of an audit row **in the suite** — that is a stronger proof than a live outage would be,
and it can go red on demand for ever after.

🔴 **CORRECTION, MEASURED 2026-09-10 — THE ACCEPT CRITERION ABOVE WOULD HAVE PROVEN A FICTION.**
"Make the injected `save` reject" tests a path the real code cannot take. `saveConfig`
(`src/lib/server/config-store.ts:88`) is documented *"No-op without a DB; **never throws**"* and its
body catches every error into a `console.error` and returns `void`. A guard built on a rejecting
`save` would assert behaviour against a stub that behaves unlike the function it stands in for —
green, and meaningless.
⭐ **AND THE REPO ALREADY SOLVED THIS, IN THE SHAPE THE FIX SHOULD COPY.** `putJob`
(`src/lib/server/chain-purge.ts:282-292`) does `await saveConfig(...)`, then **reads the row back**
and throws when it did not land, under a docblock that states the reason exactly: *"a failed write
is indistinguishable from a successful one at the call site."* So Unit 3's real fix is not an
`await` — `await` alone changes nothing, because there is nothing to await a rejection from — it is
**await + read-back**, with the registry mutation, the audit row and the `{ok:true}` all moved
AFTER the read-back succeeds.

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

### Unit 6 🟠 · Two chat SAFETY mechanisms are unreachable when signed in — ✅ SEALED 2026-09-11

> 🔴 **THIS SECTION'S SEVERITY CLAIM WAS WRONG AND IS CORRECTED HERE RATHER THAN QUIETLY EDITED.**
> Below, §4 asserts *"the stub path IS reachable in production: a signed-in player who types
> quickly falls into it"*, and calls Unit 6 the most severe thing in the document. **Refuted by
> measurement, 2026-09-11.** Both chat paths require the widget to be MOUNTED, and
> `lazy-overlays.tsx:45` mounts it only when `chatbotEnabled`. Live probe of
> `https://www.50pick.tz/help`: `cm-bubble` **0** — with a POSITIVE CONTROL on the same response,
> `lazy-overlays` 1 and the primer's *"Predict events. Not chance."* 4, so the overlay tree renders
> and the probe can see mounted overlays. The chatbot is OFF. **§5 said "unknowable from the tree"
> and §5 was right; §4 talked itself into "live" and contradicted §5 inside one document.**
>
> ⭐ **IT WAS STILL WORTH SHIPPING, AND THE REASON IS THE INTERESTING PART.** `ai-controls.ts`
> defaults `chatbotEnabled: true`, and `layout.tsx:148` is `isChatbotEnabled().catch(() => true)`
> — it **FAILS OPEN**. One operator toggle, or one config-store read failure, arms the entire class
> with no deploy at all; and E-123's own coupling fix means `/help` starts advertising the chat in
> the same instant. This is arming, not exposure. Say which one you mean.
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
that is not on the deploy path cannot stop the regression it was written for. The Sprint-20
five-persona demo drive under `scripts/` asserted at its line 261 that the footer contains the
retired `TZ-GBT` placeholder — ⭐ **retired 2026-09-10**, so it was red against correct code and
**green while the placeholder was live**. It was wired to no npm script, so neither result was ever
seen. ✅ **DELETED 2026-09-11** (row 8.2) — and its name is described rather than written as a path
here, because `docs-links.mjs` resolves script paths in prose and citing a deleted one adds a third
`test:docs` failure. That happened twice while writing this section.
⛔ **AND THE CLAIM THAT "the licence number has no guard at all" WAS WRONG IN THE DIRECTION THAT
MATTERS.** One existed — `rules-copy.test.mts:144` — and it could not fail, because it compared the
rendered copy against the same getter the copy renders. A guard that cannot fail is worse than an
absent one: it occupies the slot. See row 8.3.

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
console by design. ⛔ **BUT `.env.qa.local` DOES *NOT* HOLD `QA_SUPPORT_PASSWORD` — MEASURED
2026-09-10.** The file is 8 lines and holds exactly `QA_ADMIN_PASSWORD`, `QA_ALPHA_PASSWORD`,
`QA_ECHO_PASSWORD`, `QA_FINANCE_PASSWORD`, `QA_GROWTH_PASSWORD`, `QA_OFFICER_PASSWORD` and
`QA_TRADING_PASSWORD`. `scripts/live/harness.mjs:45` DOES define a `support` persona (phone
`712000108`, secret `QA_SUPPORT_PASSWORD`) — the secret is simply absent, so `qaEnv()` throws.
⚠️ **And "nobody has looked at it" is overstated:** `qa:read-tiers`
(`scripts/live-read-tiers.mjs:93`) signs in AS SUPPORT against production and is a registered npm
script. It is blocked by the same missing secret, not by the absence of an instrument.

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
  ⛔ `.env.qa.local` does **NOT** hold `QA_SUPPORT_PASSWORD` — measured 2026-09-10, see Unit 11.
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

**Session 3 · Units 1–9 are LIVE. Open: 10 (chrome), 11 (the desk).**
Row **11.3** is ⛔ BLOCKED on a missing credential — see its row; do not work around it.

⛔ **THE ONE OPERATOR ACTION STILL OUTSTANDING, AND IT IS NOT CODE.** The live `support_config`
row still holds `phone: "+255769777877"`. Ali's ruling is that players READ `0769777877`. The
DEFAULT was fixed in Unit 1.5; the ROW overrides the default, so production still serves the E.164
form — **measured 2026-09-11, four occurrences on `/help`, and the bare local form appears
nowhere.** Completing it needs an ordinary audited save at `/admin/system`, which also drops the
two dead `helpline*` keys the row still carries. ⛔ **Never raw SQL** — `AuditLog` is an
append-only HMAC chain and a raw write leaves no audit.

### If you are starting fresh, in order

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

---

## §7 · ⭐ DECISION LOG — what this campaign decided on the owner's behalf

⛔ **Append a row for EVERY decision taken under §0.5, in the commit that acted on it.** Empty is a
valid state; a decision missing from here is not.

| # | Decision taken | Alternative rejected | Which §0.5 criterion settled it | Touches | Money / binding / compliance? |
|---|---|---|---|---|---|
| 1 | **Hoist the at-risk decision above the backend choice** (a new exported `atRiskReply`), rather than teaching each backend branch to run the filter | Widening `ChatRoot`'s ternary so every branch calls the filter | **3 — make the next defect impossible, not unlikely.** There were already THREE bypasses (signed-in, daily cap, API error) from one misplacement. A widened branch is correct until someone adds a fourth outcome; a decision taken above the choice cannot grow one | `ChatRoot.tsx` · `send-message.ts` | No |
| 2 | **Mark only the two replies the SERVER knows are not answers** (`unresolved: true` on the daily-cap and API-error replies, plus an empty completion) | Classifying the model's own reply as resolved/unresolved so the handoff fires on any unhelpful answer | **5 — never decide by what is quickest to green,** and **1 — follow the nearest precedent.** Judging the model's reply needs a second model call; guessing from its text is exactly the proxy this repo keeps shipping. Under-marking costs a handoff one turn late, over-marking interrupts a player the bot is helping | `chat.ts` | No |
| 3 | **Make the handoff copy true, rather than making the product deliver the promise** — the transcript is not attached, so the copy stops saying it is | Pre-filling the `mailto:` body with the conversation, which would have made *"you won't have to repeat anything"* honest | **4 — when balanced, take the reversible one,** plus §1's standing ruling that a ticket system is OUT OF SCOPE. Two of the three promises (pick-up notification, availability window) cannot be delivered without one, so the copy had to change regardless; attaching the transcript would have been a new feature smuggled into a truth fix. ⭐ Filed as a suggestion, not built | `i18n-dict.ts` (3 locales) | No |
| 4 | **§4's rule is "do not raise the subject", not "do not promise it"** — no attachment/notification/availability word at all, in either direction | A tempered pattern allowing an explicit negation (*"your chat is NOT attached"*), the shape `rg-doors` 6.7b uses | **2 — leave it easier to reason about,** and the measured cost of the alternative: reading a negation across en/sw/zh is how a guard ends up flagging its own fix, which has already happened in this repo once. 4.4 proves the pattern does not fire on the replacement copy | `scripts/chat-safety.test.mts` | No |
| 6 | **Leave all 13 baseline-red suites OFF `predeploy`, permanently, and stop calling them "omitted"** | Adding them and accepting a red chain, or adding them behind a skip flag | **2 — leave the platform easier to reason about.** `predeploy` is a pre-push checklist a human runs; one that is red before you start is one people learn to ignore, which converts a real gate into noise. A suite being valuable and a suite belonging on a blocking chain are different questions | `package.json` | No |
| 7 | **DELETE `multi-persona-test.mjs` rather than repair its retired assertion** | Fixing `:261` to read `LICENCE_NUMBER()` and leaving the file in place | **1 — follow the precedent** (this repo deletes what goes stale rather than keeping a second source of truth) and **3 — seal the class.** Repairing an assertion inside a file wired to no npm key is decoration: neither its red nor its green is observable. Deletion is recoverable from git history, so the reversibility test in criterion 4 is satisfied | `scripts/` · `orphan-allowlist.json` | No |
| 5 | **Correct §4 Unit 6's severity in place and say so out loud** rather than silently deleting the sentence | Quietly editing "live" to "latent" | **§0.5's own instruction to write decisions so they can be overturned in one read.** The brief asserted production exposure that measurement refutes; a document that overstates its severity is the same disease as a guard that overstates its coverage, and hiding the correction would teach the next session to trust §4 over §5 | `docs/SUPPORT-CARE-CAMPAIGN.md` | No — but it DOWNGRADES a stated severity, so it is flagged |
