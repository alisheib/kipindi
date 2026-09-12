# The revoked-session dead end — why a returning player saw a blank blue page

**Status:** 🟡 hotfix LIVE. The structural fix and the copy fix are still owed — see §6.
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

### What is still NOT fixed by this
`kp_session` is still never cleared, so a displaced device re-enters this branch on every request
until it signs in again, and each of those requests still writes an audit row. And because the root
layout is pruned on every soft navigation, the check **cannot fire mid-visit at all** — see §6.

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

1. 🔴 **P0 · `/api/events` turns a one-second database blip into a permanent sign-out.** A Route
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
