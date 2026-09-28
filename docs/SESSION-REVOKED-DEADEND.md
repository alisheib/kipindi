# The revoked-session dead end — why a returning player saw a blank blue page

**Status:** ✅ §6 items 0–14 FIXED 2026-09-14 (session 97) — §5b (0–3, 5–9) and §5c (4, 10–14).
🔴 **REGRESSED 2026-09-23 → FIXED 2026-09-26 — see §5d:** a hook-after-return in `NavMore` turned every soft
sign-in or sign-out (and the mid-visit refresh this file exists for) into the ROOT error screen.
**Authority:** this file, for everything about `?revoked=1`.
**Reported:** 2026-09-12 by Ali, from player reports: *"they were logged in, closed the browser,
came back later, opened a 50pick link, and got stuck on a blue screen with nothing."*
The URL they were stuck on:

```
https://50pick.tz/auth/login?revoked=1&next=%2Fmarkets%2Fmkt_8ec80bc79eae484c65d0
```

---

## 1. What was actually happening

Nothing was failing. The server rendered the login page correctly and returned **HTTP 200**. The
browser then had nowhere to put it.

`src/app/layout.tsx` renders `<AppShell>{children}</AppShell>` in the **root layout**.
`src/components/layout/app-shell.tsx:72` — when `getSession()` finds the cookie's session displaced
in the registry — returns `<SessionRevokedRedirect>` **instead of** `{children}`. That shim then
called `router.replace('/auth/login?revoked=1&next=…')`, which is a client-side **soft** navigation.

**The App Router does not re-execute a shared root layout on a soft navigation.** So the tree on
screen kept AppShell's revoked output, which contains no `children` slot at all. The URL changed,
the RSC payload arrived, and it mounted nowhere. The player was left looking at the bare `<body>` —
whose background is `lab(0 13.0161 -26.0492)`, the navy. Ali's "blue screen with nothing" was the
body colour and literally nothing else.

This is the **same law** `src/app/auth/layout.tsx` and `src/app/auth/bounce-authed.ts` already
document at length — *"in the App Router a layout is NOT re-executed on a client-side soft
navigation"*. That lesson was applied to the auth bounce in those files and never applied to
`AppShell`, which lives in the one layout that can never re-decide.

### Three compounding faults, not one

1. **The root layout returns a redirect instead of children.** This is the blank page.
2. **No value of `pathname` could have saved it.** ⚠️ **An earlier draft of this file said the
   `/auth` exclusion failed because `x-pathname` was "frozen at the last document load". That is
   WRONG, and the adversarial audit refuted it.** `src/proxy.ts:214-217` sets `x-pathname` and
   `x-href` from `req.nextUrl` on *every* matched request, the soft-navigation RSC request
   included — so on `GET /auth/login?revoked=1&next=…&_rsc=…` the header genuinely reads
   `/auth/login`, and if AppShell ran it would render `children` correctly. The reason is one rung
   deeper: **AppShell is not executed on that navigation at all**, and even if it were, its output
   is pruned from the flight response. Proven empirically by the audit against this repo's own
   Next 16.2.4: the same URL fetched as an RSC request *without* a router-state header returns
   59,402 bytes containing `main-content`; fetched *with* a real `next-router-state-tree` from
   `/wallet` it returns 27,772 bytes with **zero** `main-content` hits — while still containing the
   login form. The stale-header framing is the right description of this bug *class* in this
   codebase (and of `legal/`, `auth/` and `admin/` layouts) but the wrong description of *this*
   instance.
3. **`kp_session` is never cleared.** `jar.delete()` throws during a Server Component render and is
   caught at `session.ts:144`. Measured: the cookie is **still present, 387 bytes**, after
   revocation. So the device re-enters the branch on *every* request — a permanent lockout, not a
   transient blip.

---

## 2. Reproduced, 2026-09-12 (local, two browser contexts on one `/auth/demo` account)

| step | observed |
|---|---|
| A opens `/wallet` while its session is the active one | text 774 chars — renders |
| B signs in, displacing A's session row | — |
| A opens `/wallet` | `…?revoked=1&next=%2Fwallet` · **text 0** |
| A opens `/positions` | `…&next=%2Fpositions` · **text 0** |
| A opens `/markets` (public) | `…&next=%2Fmarkets` · **text 0** |
| A opens `/legal/rules` (public) | `…&next=%2Flegal%2Frules` · **text 0** |
| the same login URL on a **hard** load | **text 1029**, `input[type=password]` present |
| after **Back** | text 1029 — recovers |
| RSC fetch for the login page | **200 OK** |
| console errors · page errors | **zero · zero** |
| `kp_session` after revocation | **still there, 387 bytes** |
| dead-end DOM `<body>` | `<div hidden>`, the empty toast region, 15 `<script>`, `<next-route-announcer>`. No shell. No page. |

⭐ **It broke every route, not just the private ones.** `/markets` and `/legal/rules` are public and
dead-ended too. A player in this state could not reach *any* part of 50pick.

⛔ **Nothing observable failed.** No error, no 500, no Next.js overlay, nothing in the logs. That is
why it ran in production unnoticed.

---

## 3. What production said (read-only audit-log query, 2026-09-12)

The `AuditLog` history begins `2026-09-11 15:08` — the pre-launch reset truncated what came before,
so this **is** the full record.

| action | events | distinct accounts | window |
|---|---|---|---|
| `session.revoked_no_active_record` | **116** | 7 | 09-11 15:08 → 09-12 05:56 |
| `session.revoked_by_newer_login` | **104** | 7 | 09-11 16:06 → 09-12 09:22 |
| `session.created` | 30 | — | — |
| `session.destroyed` | 2 | — | — |
| `session.idle_timeout` | **0** | — | — |
| `session.expired` | **0** | — | — |

Read those numbers together:

- **220 revocations against 30 logins**, on a platform with **10 accounts in total** (7 of them
  players) and **10 `ActiveSession` rows**. 7 distinct accounts were hit by each cause.
- **Zero idle timeouts and zero absolute expiries.** So the player story — *"closed the browser,
  waited, came back"* — did **not** travel the 24h-idle or 7-day-expiry paths, which redirect
  properly server-side and render fine. It travelled the registry path, the one that dead-ends.
- The bursts are the lockout loop, visible in the log. `usr_600ed623f6` produced **9 revocation rows
  in 31 seconds** (09:21:31.006 → 09:22:02.272), **7 of them naming the same `replacedBy`
  session**. One displaced device, re-detected on every parallel server-component read, because the
  cookie is never cleared. The audit log was recording the dead end all along.
- **109 of the 116 `no_active_record` rows fell on 09-11**, the day of the pre-launch reset. Any
  operation that clears `ActiveSession` rows — a reset, a restore, a migration — locks out every
  holder of a still-valid cookie. That is a live operational hazard, not a one-off.

---

## 4. The message was also false

`?revoked=1` renders `i18n-dict.ts` → `signedOut` / `signedOutBody`:

> "Signed out — Your account was signed in on another device. Only one session is allowed at a time
> for your security."

True for `session.revoked_by_newer_login`. **False for every `session.revoked_no_active_record`
cause**: a sign-out on another device, an admin suspension, self-exclusion, account closure, agent
revocation, a cookie minted before the registry table existed — and a **failed database read**.

`session-registry.ts` `dbGet()` catches a thrown Postgres error and returns `null`.
`getActiveSessionId()` therefore returns `null` both when the row is genuinely absent *and when the
read failed*, and `session.ts` treats `null` as "not an active session". So a transient DB error
signs out every user not already warm in the in-process `globalThis` Map — and tells each of them
they logged in somewhere else.

---

## 5. What shipped

It shipped in two steps on 2026-09-12, and the second replaced the first. Both are recorded because
the reasoning for the upgrade is the useful part.

### Step 1 — `2e57a244`, the hotfix that stopped the bleeding
`window.location.replace()` instead of `router.replace()` in the client shim. Correct as far as it
went: a layout-level decision can only be escaped by a **document** navigation, because that is the
one kind that re-runs the layout which made it. But it left a navy frame while the navigation ran,
and it needed JavaScript.

### Step 2 — the real minimal fix: the redirect moved to the SERVER, and the shim is gone
`src/components/layout/app-shell.tsx` now calls `redirect(...)` directly; **the client component
`session-revoked-redirect.tsx` is deleted.**

⭐ **A `redirect()` from a Server Component is a real 307 on a document request**, so the login page
arrives on a fresh render with its own layout — no client component, **no blank frame at all**, and
**it works with JavaScript disabled**, which no shim ever could. `src/app/admin/layout.tsx:59` has
been doing exactly this, in this same Next version, in production, all along; the player path was
the odd one out.

⚠️ On a `router.refresh()` or a Server Action the tree re-renders **from the root**, so this branch
does run there, and `redirect()` degrades to a client router navigation — which still lands
correctly, because a children slot exists in that render.

⛔ Two things are load-bearing and easy to remove by accident: the `!pathname.startsWith("/auth")`
exclusion (without it the login page redirects to itself), and the `as never` cast that
`typedRoutes: true` requires — which silences the only compile-time check on the target string, so
the guard asserts the literal `revoked=1` that `auth/login/page.tsx:42` reads.

### The guard
`scripts/revoked-deadend.test.mjs` + `npm run test:revoked-deadend`, in `predeploy` after `qa:live`.

⛔ **It asserts the RENDERED PAGE, never the URL.** The URL was correct for this bug's entire life —
`path=/auth/login`, exactly as intended — which is precisely how it shipped green. It requires
`innerText.trim().length > 100` **and** a visible way forward, across `/wallet`, `/positions`,
`/markets` and `/legal/rules`; **and it runs one case with `javaScriptEnabled: false`**, which is
what pins the fix to the server so nobody can quietly reintroduce a client redirect and stay green.

**Verified:** 16 passed / 0 failed against the current fix. **Mutation-proven** against the original
bug: **8 failures, exit 1**, every failure reading `text=0 path=/auth/login`. `typecheck` 0,
`build` 0.
⚠️ Precisely what is mutation-proven: the *body-not-blank* assertions, against the original
`router.replace` tree. The three `javaScriptEnabled: false` assertions are verified green against
the fix but were added after that mutation run, so they are not themselves mutation-proven — see §6
item 0.

### 🔴 WHAT WAS STILL NOT FIXED ON 2026-09-12 — THE BLANK PAGE WAS STILL REACHABLE (fixed 2026-09-14, §5b)

⛔ **Only the DOCUMENT path is fixed. Do not read this file as "E-381 is closed".** An earlier
draft of this section said the check "cannot fire mid-visit at all". **That was wrong, and it was
the same mistake twice** — the first two fixes each asserted in their own docstring that the branch
could only fire on a hard load.

`router.refresh()` marks the root segment `refetch`, which **is** the branch that re-renders the
root layout. And `src/components/ui/refresh-poller.tsx` calls exactly that on an interval, mounted
with **no session gate**, on `/markets` (30s), a market page (15s), `/live` (15s), `/positions`
(20s), `/updown` (20s), `/leaderboard` (30s) and `/results` (60s) — plus the `50pick:refresh` event
dispatched right after **placing a bet**, **cashing out** and an **Up & Down tap**. On that flight
request `redirect()` degrades to a client navigation, which cannot escape a root-layout decision,
so the player goes blank.

**Measured 2026-09-12** (`npm run repro:revoked-midvisit`): displaced device, soft-navigated to
`/markets` with the real nav `<Link>`, then touching nothing → bounced at **t+28s** to
`/auth/login?revoked=1&next=%2Fmarkets` with **`innerText.length === 0`**, still 0 six seconds
later. A player can therefore be blanked **immediately after a money action**, at the moment they
most need to see whether their money moved.

⚠️ **An attempted fix was reverted, deliberately.** Returning a hard-navigating client escape for
flight requests (detected via the `rsc` / `next-router-state-tree` request headers) produced a
**retry storm** — the identical `_rsc` request repeating ~18 times, HTTP 200 each, page still
blank. The cause was not understood, so it was not shipped: a loop on the auth path of a live money
platform is worse than the bug. ⛔ Do not re-attempt it without driving the repro first.

⚠️ Also still true: `kp_session` is never cleared, so a displaced device re-enters this branch on
every request until it signs in again, and each of those requests writes another audit row.

---

## 5b. What shipped 2026-09-14 (session 97)

**§6 item 0 — the three JavaScript-off assertions are mutation-proven**, in a throwaway `git worktree` (Turbopack
needs `turbopack.root` widened to accept a `node_modules` junction outside the project; webpack cannot build this
app). With the old `window.location.replace` shim swapped back into `app-shell.tsx`, the guard's 13 JavaScript-on
checks stayed green and **exactly the 3 JavaScript-off checks failed**; with `revoked=1` misspelt inside the server
redirect, **exactly the third** failed.

**§6 item 1 — the mid-visit blank page.** The root layout no longer navigates on anything but a document load.
- ⭐ **Why the reverted attempt could not work:** Next strips `rsc` and the router-state headers before the proxy
  sees a request (`server/web/adapter.js`) *and again* before `headers()` (`request-store.js`), and strips `_rsc`
  from the URL. A refresh arrives looking exactly like a document. The discriminator is the browser-set
  `Sec-Fetch-Mode`: `navigate` only for a real navigation. ⚠️ **Mode, not dest** — a navigation re-issued by
  `public/sw.js` arrives `navigate` / dest `empty` (measured); the router's flight is `cors` / `empty`.
  `src/proxy.ts` stamps `x-kp-document`; a browser without Sec-Fetch headers gets the in-place answer.
- **Document:** a real 307 to **`/auth/session-ended`**, a Route Handler — the one place a dead cookie is cleared
  (§1 fault 3) — which works out the reason itself and 303s to the login page.
- **Anything else** (refresh, Server Action, prefetch): no navigation. The page renders with `{children}` as for
  a signed-out visitor, plus a server-rendered notice under the bar whose only action is a plain `<a>` to the same
  handler. Measured on the pre-fix tree with the new guard: the refresh blanked the page **and fired 100 flight
  requests** — the retry storm was the old branch itself, not only the reverted fix. After: text kept, 1 flight.
  `npm run repro:revoked-midvisit` now exits 0 (two real 30 s poller intervals, the page kept its 899 characters).

**§6 item 2 — `/api/events` and every Route Handler:** `getSession()` deletes no cookie any more, in any branch. A
Route Handler used to succeed at the delete and erase the only evidence of why the session ended.

**§6 item 2 (registry read) — `readActiveSession` answers `active` / `absent` / `unavailable`.** A failed read is
`unavailable`, never cached, and `getSession()` trusts the signed, unexpired, recently-active cookie for that one
request. ⭐ No retry on the read: once a failure no longer revokes, a retry only buys latency on the query every
request makes. ⚠️ **Found while fixing:** the in-process Map is never invalidated across instances, so a cache hit
that DISAGREES with the cookie is now re-read from the database before anyone is called "displaced".

**§6 item 3 — `dbSet`:** the row is written first (one retry on a transient code), the cache only after it lands,
and a failure throws `SessionRegistryWriteError`. `createSession` now registers BEFORE it sets the cookie.

**§6 items 5–9:**
- 5 · `/auth/*` stays excluded from both answers (the OTP and 2FA steps are a sign-in in progress a reload must not
  lose). A dead cookie there is harmless: the login page states the reason from the same request signal.
- 6 · the copy is true per cause. `/auth/session-ended` reads the cookie and the account: a different registry
  session → `revoked=1` ("another device"); no row → `closed=1`, `error=blocked`, `excluded=…` from the account's
  own status, else `ended=session`; expired or idle → `ended=idle`. Two new keys in three locales
  (`sessionEndedBody`, `sessionIdleBody`).
- 7 · every sign-in error outranks every sign-out panel. The `kp_revoked` note (Privacy §7, 30 s) is now written
  by the handler and read last, with generic wording.
- 8 · `getSession()` checks expiry, then idle, then the registry.
- 9 · both expiry paths now reach the player (`ended=idle`, "Session expired").
- ⭐ One audit row per ended session per instance (a bounded Set), not one per request.

**Guards:** `test:revoked-deadend` 39/0 (§1 document path re-presents the dead cookie per case, §2 JavaScript off,
§3 mid-visit refresh — page kept, notice a visible rectangle, link reaches login, no storm — §4 idle copy and
wrong-password precedence). On the pre-fix tree: 10 failures. `test:session-registry` 15/0 (new, in `predeploy`).

**Still open:** item 4 (a soft navigation inside the SPA keeps stale authed chrome until the next refresh or
document load — the notice now appears on the next refresh), items 10–14.

### 5c. The rest of §6, same day (session 97, register E-412)

- **Item 4 — the stale signed-in shell.** `SessionPresence` (mounted only in the signed-in shell) asks
  `/api/session/status` on every navigation after the first render and when the tab becomes visible; when the session is
  gone it leaves with a DOCUMENT navigation to `/auth/session-ended` (at most once a minute, so a disagreement can never
  loop). An unreadable registry counts as active. Driven: a displaced player clicking a nav `<Link>` lands on the sign-in
  page with the reason, the cookie cleared, and browses as a guest afterwards.
- **Item 10 — the console's gates.** Measured: an `/admin/template.tsx` is NOT re-rendered on a soft navigation; a
  section's own `layout.tsx` IS. The view and act gates moved out of `admin/layout.tsx` into `AdminSectionGate`, rendered
  by 38 section layouts and by the two pages without one (`/admin`, `/admin/players`). **The leak was real:** on the
  previous tree an AUDITOR who followed the KYC queue's own link into `/admin/players/[id]` (support — not viewable)
  got the player profile rendered; a SUPPORT officer leaving a blocked page stayed "Restricted"; a COMPLIANCE officer
  entering a view-only section kept "may act". `test:admin-section-gate` 16/0, 5 failures on the previous tree.
- **Item 11 — the guard.** `test:layout-staleness` now verifies the 38 section layouts by shape, draws its population
  from what layouts IMPORT (so `app-shell.tsx` is in it), corrects the false REVIEWED reason for `admin/layout.tsx`, and
  is in `predeploy`.
- **Item 12 — the registry.** An agreeing cache hit is trusted for 30 s, then re-read, so a revocation on another
  container holds here within 30 s; the Map is capped at 20,000; `retention.purge.daily` deletes `ActiveSession` rows
  older than 8 days (a session lives at most 7 from the sign-in that wrote its row). `test:session-registry` 17/0.
- **Item 13 — `sw.js`.** The offline fallback can no longer be `undefined` (a minimal page answers when the branded one
  was never cached); precache adds each asset on its own instead of an atomic `addAll`; static assets are
  stale-while-revalidate, so a same-URL asset refreshes by itself (`CACHE_NAME` v4).
- **Item 14 — the anchor.** `NextHashField` puts `location.hash` into the sign-in form; the action re-attaches a
  validated `#[A-Za-z0-9_-]{1,80}` to `next`. `SessionPresence` carries the fragment too. Driven:
  `/positions#pos_…` signed out → sign in → `/positions#pos_…`.

---

## 5d. The regression — 2026-09-23 → 2026-09-26: a hook after an early return in `NavMore`

**What a player saw.** Started a break on `/profile/responsible-gambling` → the ROOT error screen,
*"Kitu kimevunjika kabla hata ya kuanza"*, instead of the sign-in page. The same for self-excluding,
closing the account, signing out from `/profile/sessions`, signing in through the password form, and —
the one this file exists for — a player whose session ended elsewhere, on the next `router.refresh()`
(§1's mid-visit path). `test:revoked-deadend` went red on clean main and was logged by other lanes as
"another lane's red suite" (e.g. `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`, S7's predeploy).

**Why.** `src/components/layout/nav-more.tsx` returned `null` for an empty list and THEN ran a
`useEffect` — the D30 rail-stacking effect, added by `2c9380e0` on 2026-09-23. The top bar hands
`NavMore` an EMPTY list signed out and a full list signed in, at a fixed position with no key. A Server
Action that changes the session re-renders the whole tree from the ROOT (the root layout is re-run, as
§1 explains it is NOT on a plain soft navigation), so the same `NavMore` fiber rendered one hook fewer
(or more) and React threw "Rendered fewer hooks than expected" (#300 / #310) — above `app/error.tsx`,
so `global-error.tsx` took the page. A full-page sign-out (the avatar menu's form POST) and `/auth/demo`
remount the tree, which is why ordinary sign-out and every test harness missed it.

**Fixed.** The effect runs above the early return and marks the rail only while the menu has items.
Verified locally on the fixed tree: the break flow lands on `/auth/login?cooled=1` ("Karibu tena") with
no page error (before: the root error screen, reproduced identically on clean main); `tsc` clean;
`test:revoked-deadend` **46 passed, 0 failed** (§3 mid-visit refresh and §6 password sign-in included).

**Why it was invisible for three days, and what now stops both halves:**
- The repo has no `react-hooks/rules-of-hooks` (`lint` is `tsc --noEmit`). ⭐ **`test:hooks-order`**
  (new, in `predeploy`) scans every component for a top-level hook after an early return, proves itself
  on planted controls, and went red on the planted shape naming `nav-more.tsx:107`.
- `global-error.tsx` only wrote to the browser console; `RouteError` has beaconed to `/api/client-error`
  since 2026-09-18, the ROOT boundary never did. ⭐ It now sends the same scrubbed report
  (`test:client-error-report` §4i–§4l).
- It was found by a drive, not a gate: the LIVE-strip session's cooling-off case (2026-09-26).

**✅ Verified on production `bcf6ed7b` (2026-09-26 ~15:45 EAT, `?dpl=` confirmed)**, as the QA player `mobile01`,
one attempt each: signing in through the real password form landed on `/?welcome=back`; signing out through
`/profile/sessions` (a Server Action) landed on `/` as a guest — **0 page errors, no root boundary, no crash
report** in both directions (the account was left signed out). ⭐ And the new report was proven to fire: with
the old `NavMore` shape planted on a local dev server (restored byte-identical after), the soft sign-out threw
"Rendered fewer hooks than expected", the root boundary took the page ("Something broke too early to
recover"), and the boundary posted to `/api/client-error`.

---

## 6. Still owed — ordered by what a player actually loses

This list is the output of a 12-agent adversarial audit (2026-09-12) that verified six claims
against the source and refuted one of mine (§1 fault 2). Both of its independent judges ranked the
shipped fix first *on condition* that items 1 and 2 follow, so treat those as part of this fix
rather than as a follow-up.

0. ⚠️ **Mutation-prove the three `javaScriptEnabled: false` assertions**, and do it in a throwaway
   `git worktree`, **not in `C:\kipindi-main`** — a red run has previously left the live payout gate
   disabled in this working tree while reporting "0 files left dirty", and a parallel session has
   switched this checkout's branch mid-edit.

1. 🔴 **P0 · THE BLANK PAGE IS STILL LIVE ON THE MID-VISIT PATH — take the decision out of the
   root layout.** Measured, reproducible in one command (`npm run repro:revoked-midvisit`), and
   the full evidence is in §5. `RefreshPoller`'s `router.refresh()` re-renders the root layout, so
   the branch fires mid-visit and `redirect()` degrades to a client navigation that lands blank —
   including right after a bet or a cash-out. ⭐ **The only durable answer is that the root layout
   must stop deciding this**, because a decision made there can only be escaped by a document
   navigation. Two shapes worth costing: (a) render the explanation IN PLACE as a server-rendered
   panel and never navigate (its CTA must be a plain `<a>`, **never `<Link>`**); or (b) move the
   decision to the proxy, which ⚠️ per the audit *is* on the Node runtime in this build and so
   *can* read the registry — but ⛔ read the two MUST-NOTs below before going near it.
   ⛔ Do not simply re-attempt the flight-request escape: it retry-stormed. See §5.

2. 🔴 **P0 · `/api/events` turns a one-second database blip into a permanent sign-out.** A Route
   Handler runs in a mutable-cookie phase, so the `jar.delete(COOKIE_NAME)` at `session.ts:144`
   that *silently throws* during a render **succeeds** there, and the `Set-Cookie` rides out on the
   401. ⚠️ The audit's own correctness judge then found the limit of this: `app-shell.tsx` gates the
   SSE client on `{session && …}`, so a request that already resolved to revoked mounts no stream —
   which means this fires for a player whose tab was **already open**, not for the reported
   deep-link journey. Both halves matter: it is a real amplifier and it is *not* the mechanism
   behind Ali's reports.

2. 🔴 **P0 · a read failure and "no row" are the same `null`.** `session-registry.ts` `dbGet`
   catches every Prisma error and returns `null`; `session.ts:135` reads `null` as "not an active
   session". One pool timeout (P2024 — `prisma.ts` documents the 2026-07-24 hang, and
   `pool_timeout=10` means a single one already costs 10s) revokes every user not warm in that
   instance's Map. ⭐ **The fix is already in the repo and unused:** `withTransientRetry(fn, true)`
   in `src/lib/server/retry.ts`, whose allowlist is exactly P2024/P2028/P2034/40001/40P01/08006/
   08003/08000/57P01. A registry read is idempotent, so the double-bet hazard that helper warns
   about does not apply. ⛔ **But cost the retry before shipping it** — the audit flagged 4 attempts
   × a 10s pool timeout as an amplifier on the auth hot path. And `dbGet` must return a tri-state,
   not a `null` that means two things.

3. 🔴 **P0 · `dbSet` swallows its error after the in-process cache is already written** — so a login
   whose `ActiveSession` row never persisted looks completely successful. The player browses
   normally, then the next deploy, restart or cache miss gives them `no_active_record` → the dead
   end. ⭐ **The audit calls this the best fit for the reported symptom** — "signed in fine, closed
   the browser, waited, deep link → blank" — and it fits the production data, where
   `no_active_record` (116) outnumbers `by_newer_login` (104). ⚠️ It also kills the folk explanation:
   **nothing in the registry expires with time** (no TTL, no cascade, no pruning job), so "waited a
   while" is never by itself a cause. The row has to have been *absent*.

4. 🟠 **The check can never fire mid-visit, and a money surface lies because of it.** The root
   segment is pruned from every soft-navigation flight response, so a displaced player who keeps
   clicking inside the SPA keeps the signed-in avatar, the masked phone and **the cached wallet
   balance from before the displacement** (`app-shell.tsx:125-136`), plus authed navigation,
   indefinitely — until they hard-load. Nobody has reported this yet.

5. 🟠 **The `/auth` exclusion inverts on a hard load.** A displaced device that hard-loads any
   `/auth/*` route gets full player chrome with real soft `<Link>`s, and clicking Markets or Wallet
   renders those pages with the revoked redirect never firing — a silent signed-out session wearing
   authed chrome. Fix both directions in one pass; ⛔ do **not** simply drop the exclusion.

6. 🟠 **The copy is true in one cause out of roughly sixteen.** `signedOutBody` asserts "signed in
   on another device" for a signal also raised by suspend, staff role change, self-exclusion,
   closure, erasure, agent approval/deactivation/revocation, a failed registry read, a swallowed
   registry write, a missing `DATABASE_URL`, and a pre-registry cookie. ⭐ `session.ts:157` already
   distinguishes the two audit actions; the redirect throws that distinction away. ⛔ Reuse the
   existing keys (`accountClosed`, `selfExclusionActive`, `coolingOff`, `accountUnavailable` all
   exist) and add at most three, **in all three locales** — `test:i18n` is in `predeploy`. ⛔ No
   migration: `user.status` already carries ACTIVE/PENDING_KYC/SUSPENDED/SELF_EXCLUDED/COOLED_OFF/
   CLOSED, so the rowless branch can recover the real reason with zero schema change.

7. 🟠 **The revoked panel pre-empts a genuinely wrong password for 30 seconds.**
   `login/page.tsx` computes `wasRevoked` before `switch (sp.error)`, and `kp_revoked` is
   `httpOnly:false` with a 30s life — so a wrong password is answered with "signed in on another
   device". A four-line move.

8. 🟠 **Reorder `getSession()`:** the registry check runs *before* the absolute-expiry and idle
   checks. Since rows are immortal, a session that is genuinely 7-day-expired or 24h-idle *and*
   rowless is audited as a revocation and sent down the broken path instead of the honest, working
   one. Evaluating exp/idle first routes those players correctly — and it also means the two
   expiry paths, which reach a working page today, do so only *because* they never set the signal.

9. 🟡 **Neither expiry path tells the player anything.** `t.auth.sessionExpired` exists and no
   expiry path ever sets `?error=session_expired` — reachable only from a 2FA lapse. So the honest
   paths are silent while the one path that speaks is almost always wrong.

10. 🟡 **The admin console is the same defect in the authz layer, and it is undocumented.**
    `admin/layout.tsx:49` (`currentSession()` *is* `getSession()`, i.e. the displacement check) plus
    the frozen RBAC **view** gate (:166-168, decides whether `children` render at all) and the
    frozen **act** gate (:184-194, published to ~20 money and compliance controls through a client
    context). Latent only while the staff census is ADMIN-only — **live on the first non-Owner
    grant**. ⛔ Do not record this class as closed.

11. 🟡 **Two guard defects, and one is a false authority.** `scripts/layout-staleness.test.mts`
    draws its population as *files named `layout.tsx`*, which is why `app-shell.tsx` — rendered by
    the root layout on every request — was never in it. And its `REVIEWED` entry for
    `admin/layout.tsx` says "`path` now feeds only FALLBACKS", which is **false**: `path` decides
    `viewBlocked`, `mayAct` and `readOnly`. ⛔ A guard that exempts a file for a reason that has
    stopped being true is worse than no guard. Also: `test:layout-staleness` is **not in
    `predeploy`**.

12. 🟡 **`ActiveSession` rows are immortal** — no cascade (deliberate), no TTL, no sweep — and the
    `globalThis` Map mirroring them is never evicted and has no size cap. Unbounded growth
    proportional to lifetime user count. Related: a suspend or self-exclusion is **not** enforced on
    any other instance that has the userId cached, which is the whole stated purpose of
    `revokeUserSessions`.

13. 🟡 **`public/sw.js` can respond with `undefined`.** `caches.match(OFFLINE_URL)` resolves to
    `undefined` when the entry is missing — and it can be missing, because `cache.addAll` is atomic
    so one failed precache fetch discards the worker. `respondWith(undefined)` throws, surfacing the
    browser's own network-error page instead of the branded `/offline`. Its `CACHE_NAME` is also a
    hand-bumped literal unrelated to `deploymentId`, so it sits outside the 2026-09-12 deploy-skew
    fix entirely.

14. 🟡 **Position permalinks lose their anchor.** `x-href` is `pathname + search`, so the `#pos_…`
    fragment that exists specifically to scroll to a row cannot survive — a player tapping a ticket
    link in an email returns to the top of the market. Inherent to fragments (they never reach the
    server); needs a client-side re-attach if it is to be fixed at all.

### Things the audit says NOT to do
- ⛔ Do **not** move the authed-bounce into `src/proxy.ts`, or key any bounce off
  `isSessionCookieValid`. A revoked device carries an HMAC-valid cookie; that ships the infinite
  loop `bounce-authed.ts` already documents.
- ⛔ Do **not** re-add a pathname check to `auth/layout.tsx`. It is a deliberate pass-through.
- ⛔ Do **not** reach for `export const dynamic = "force-dynamic"` — inert, because a layout is not
  re-executed on a soft navigation at all, so there is no dynamism for it to act on.
- ⛔ Do **not** introduce a second `requireSession`; `session.ts:255` already exports one that
  *throws*.
- ⚠️ `src/proxy.ts:1` calls itself an "Edge proxy" and that is **wrong for this build** — Next 16.2.4
  always runs the proxy on the Node.js runtime (the edge middleware manifest is empty). Correct the
  comment; do not act on it in the same diff.

## 7. Notes for whoever picks this up

- Deliberately **no migration** and no schema change; this is a render-path defect.
- `/auth/demo` is the only way to drive an authed local session (404 in production).
- The local in-memory store has **no markets**, so the guard uses `/wallet`, `/positions`,
  `/markets` and `/legal/rules` rather than a market deep link. The mechanism is path-agnostic —
  it fires on any non-`/auth` route.
