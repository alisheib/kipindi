# 50pick — Route / Auth / Redirection Audit (2026-07-17)

> Full pre-launch inspection of every `src/app/**` route: gating, redirections,
> functionality, dead links. Findings + resolutions below. Clean tree confirmed
> (no broken redirects, no dead internal links, no redirect loops, type-checks OK).

## Gating architecture (verified sound)
Three layers: (1) edge proxy `src/proxy.ts` HMAC-verifies `kp_session` on protected
prefixes → 307 to `/auth/admin` (admin) or `/auth/login` (player); (2) each page
re-checks `currentSession()`/`getSession()` (single-active-session + expiry + idle);
(3) `admin/layout.tsx` gates all `/admin/*` (session → role → TOTP step-up).

## Findings & resolutions

### #1 — Sensitive admin pages were VIEW-able by MODERATOR — ✅ FIXED
The console gate admits `ADMIN_CONSOLE_ROLES` (includes MODERATOR); only
finance/insights/reports added a read-tier gate. So a MODERATOR could VIEW money
(payments/aml/bonuses/affiliate/settlement), PII (players/[id], kyc/[id], privacy,
self-exclusions), and config/regulator data (config/system/ai-usage/retention/
audit/reports) — exactly what the role tiers exist to prevent (see roles.ts).
**Fix:** a centralized READ-tier map in `admin/layout.tsx` (`READ_TIERS`) renders
`<AdminRestricted>` in place of the page when the role falls short of MONEY_ROLES /
COMPLIANCE_ROLES / CONFIG_ROLES — so a MODERATOR's browser never receives the data
and the page's server data-fetch never runs. Market-ops surfaces (markets, resolver,
candidates, proposals, sources, moderation, objections, live, ai-polls, events,
overview) stay broad — MODERATOR's job. finance/insights/reports keep their in-page
gate too (harmless defense-in-depth). *Impact was latent (only ADMIN accounts at
launch) but goes live the moment a MODERATOR is created — now closed either way.*

### #4 — `/admin/retention` under-guarded — ✅ FIXED
Covered by the same READ_TIERS map (`/admin/retention → CONFIG_ROLES`).

### #3 — `/watchlist` and `/proposals/new` outside edge protection — ✅ FIXED
Added both to `PROTECTED_PREFIXES` in `src/proxy.ts` (public `/proposals` list and
`/proposals/[id]` stay open; only the `/new` composer is gated).

### #2 — Edge does not check session REVOCATION — documented, low severity
The edge validates HMAC signature + `exp` only, not the single-active-session
registry / idle. A session revoked WITHOUT the user's action (admin suspend, or
displaced by a login on another device) can briefly RENDER a protected page before
the page-level `getSession()→redirect` fires (the root `app/loading.tsx` Suspense
streams a 200 first). **Mitigations already in place (verified):**
- Self-exclusion & cool-off call `destroySession()` (deletes the cookie + clears the
  registry) → the acting device is fully logged out; the edge blocks its next request.
- EVERY money/bet action re-checks account status server-side and blocks
  SELF_EXCLUDED/SUSPENDED/COOLED_OFF/CLOSED + `isLockedOut` (`market-service.ts:317,330`,
  `wallet-service.ts:83,253`). So a briefly-rendered page grants NO functional
  capability — no bet, deposit, or withdrawal is possible.
Residual = a brief visual flash for a remotely-revoked session, no action possible.
**Post-launch hardening option:** delete the session cookie on admin-suspend, or add
a lightweight edge revocation check. Not a launch blocker.

### #5 / #6 — informational (no action)
- 7 admin pages lack a sibling `loading.tsx`; the segment-level `admin/loading.tsx`
  covers them (cosmetic per-route UX inconsistency).
- A logged-in PLAYER deep-linking an admin URL lands on the admin login form with an
  active player session (mildly confusing; no privilege escalation — admin creds
  still required).

## Dead links / redirects / loops
**None.** Every server `redirect(...)` target resolves to an existing route; every
`/admin/*` sidebar link maps 1:1 to a `page.tsx`; no redirect loops (the two `/admin`
gate destinations are TOTP-exempt; `/auth/admin` is outside the `/admin` proxy prefix).
