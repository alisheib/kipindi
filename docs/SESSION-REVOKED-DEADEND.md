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
2. **The `/auth` exclusion cannot work.** `AppShell` reads `pathname` from the `x-pathname` *request
   header*, frozen at the last document load. After a soft navigation it still names the old route,
   so `!pathname.startsWith("/auth")` does not exclude the login page it just navigated to.
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

## 5. What shipped (the hotfix)

**`src/components/layout/session-revoked-redirect.tsx`** — `window.location.replace()` instead of
`router.replace()`. A layout-level decision can only be escaped by a **document** navigation,
because that is the one kind that re-runs the layout which made the decision.

**`scripts/revoked-deadend.test.mjs`** + `npm run test:revoked-deadend`, wired into `predeploy`
after `qa:live`.

⛔ **The guard asserts the RENDERED PAGE, never the URL.** The URL was correct for this bug's entire
life — `path=/auth/login`, exactly as intended. A URL-only assertion would have shipped green
against a blank screen. It requires `document.body.innerText.trim().length > 100` **and** a visible
way forward (a password field, or a readable public page), across `/wallet`, `/positions`,
`/markets` and `/legal/rules`.

**Proven by mutation, not by passing.** Against the fix: **13 passed, 0 failed**. Against the
reverted buggy shim: **5 passed, 8 failed, exit 1**, every failure reading `text=0 path=/auth/login`.

Also verified: `npm run typecheck` exit 0, `npm run build` exit 0.

### What the hotfix does NOT fix
A brief navy frame while the document navigation runs, and it needs JavaScript. The cookie is still
not cleared, so a displaced device still re-enters this branch on every request until it signs in
again, and every one of those requests still writes an audit row.

---

## 6. Still owed

1. **Stop redirecting from the root layout.** `AppShell` should render the explanation *in place*
   (server-rendered, `AuthShell` + `AuthPanel`), never a redirect shim. No blank frame, works with
   JS off, one server render. Its CTA must be a plain `<a>`, **never `<Link>`** — a `<Link>` is a
   soft navigation and walks straight back into this bug.
2. **Clear `kp_session` where clearing is legal.** A new route handler `/auth/session-ended?next=…`
   that deletes the cookie, sets the `kp_revoked` flash, and 303s to
   `/auth/login?revoked=1&next=…`. A route handler may mutate cookies; a render may not. This is the
   load-bearing part: once the cookie is gone the device is simply *signed out*, the existing and
   already-working proxy path handles it, public pages stop being locked, and the state cannot repeat.
3. **Hold the root layout to an invariant:** it must always render `children`. Add a guard that
   fails if `app-shell.tsx` gains an early return that omits them.
4. **Split the copy per cause**, en/sw/zh (`npm run test:i18n` parity).
5. **Distinguish "row absent" from "read failed"** in `session-registry.ts`, so a database hiccup
   stops signing everyone out and stops blaming another device.
6. **Sweep for siblings** of the defect class — any layout-level decision that omits `children`,
   relies on `x-pathname`/`x-href`, or hands off to a client component that soft-navigates.

## 7. Notes for whoever picks this up

- Deliberately **no migration** and no schema change; this is a render-path defect.
- `/auth/demo` is the only way to drive an authed local session (404 in production).
- The local in-memory store has **no markets**, so the guard uses `/wallet`, `/positions`,
  `/markets` and `/legal/rules` rather than a market deep link. The mechanism is path-agnostic —
  it fires on any non-`/auth` route.
