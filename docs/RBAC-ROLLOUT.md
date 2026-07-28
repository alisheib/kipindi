# 50pick — Role-Based Access Control (RBAC) rollout (living tracker)

> **Status:** 🔄 IN PROGRESS — Phase 0 (tracker + housekeeping) landing.
> **Goal:** every staff member has ONE role; the admin **nav + every route + every server action**
> gate on that role (defense in depth — nav-hidden ⇒ route-blocked ⇒ action-refused, all agreeing);
> the Owner assigns roles and edits the grant matrix **live from the admin UI, no deploy**; the Owner
> (ADMIN) keeps full access and can never be locked out. Every privileged change is TOTP-stepped-up + audited.
> Plan of record: `C:\Users\asheib\.claude\plans\you-are-continuing-work-velvety-stream.md`.
>
> **Update this file at the end of EVERY phase/commit** with the checkboxes + shipped SHAs below.
> When every box is checked and both suites are green twice + deploy-verified, we are done.

---

## Live scoreboard (update each commit)

| Metric | Now | Target |
|---|---|---|
| `test:rbac` | ✅ PASS (92 assertions) | PASS |
| `test:staff-role` | ✅ PASS (24 assertions, Phase 3) | PASS |
| `test:all` (twice) | ✅ 101/101 green ×2 (Phase 3) | PASS twice |
| Existing guards (`admin-roles`, `admin-nav`, `officer-conflict`, `two-admin`) | ✅ green | stay green |
| Last shipped (live-verified) | ✅ Phase 1 @`5da76fb` (uptime reset, Online) | each phase uptime-verified |
| Railway deploy | ✅ Phase 1 deploy-verified (fresh container = migrate deploy ran) | SUCCESS + `uptimeSec` reset per phase |

---

## The model

**7 staff roles**, one per employee (`UserRole` enum + `roles.ts` union). `PLAYER`/`AGENT` = non-staff.
`STAFF_ROLES` = the 7 below.

| Role | UI label | Meaning |
|---|---|---|
| `ADMIN` | Owner | Hard-coded superuser — bypasses the grant table (all view+act); only role that can open `/admin/staff` + `/admin/roles`. |
| `COMPLIANCE` | Compliance | MLRO — KYC/AML/PII/DSAR. |
| `MODERATOR` | Trading | Markets, resolver, sources, up&down, comment moderation. (Enum value stays `MODERATOR`.) |
| `FINANCE` | Finance | Accounting/money surfaces. |
| `GROWTH` | Growth | Affiliate/bonuses/invites/cohorts. |
| `AUDITOR` | Auditor | Read-only everywhere it can view; acts nowhere. |
| `SUPPORT` | Support | Player support desk — suspend/restore, credentials, roster. |

**Domains** (fixed code enum `AdminDomain`): `accounting | growth | compliance | trading | ops | support | overview`.
Grants are **data**: `RoleDomainGrant { role, domain, canView, canAct }` (PK `(role,domain)`), Owner-edited
live at `/admin/roles`. Loader `roleGrants(role)` reads rows over the code `DEFAULT_GRANTS` fallback →
correct even with an empty table. **ADMIN bypasses the table.**

### Default seed matrix (`DEFAULT_GRANTS`; Owner-editable after)

| Role | View domains | Act domains |
|---|---|---|
| ADMIN (Owner) | *all (bypass)* | *all (bypass)* |
| COMPLIANCE | compliance, accounting, support, overview | compliance |
| MODERATOR (Trading) | trading, overview | trading |
| FINANCE | accounting, overview | accounting |
| GROWTH | growth, overview | growth |
| AUDITOR | accounting, compliance, overview | *(none)* |
| SUPPORT | support, overview | support |

**Support scope (Ali, 2026-07-28 = recommended baseline):** `support` act = suspend/restore, reset
password, set/resend verification email, view roster + basic profile. Not money (=`accounting`), not
KYC rulings / DSAR-PII export (=`compliance`), not KYC/PII document *viewing* (=`compliance` view).

### Route → domain (VIEW gate — every `/admin/**` prefix maps; completeness tested)

| Domain | Route prefixes |
|---|---|
| overview | `/admin`, `/admin/live` |
| accounting | `/admin/insights`, `/admin/settlement`, `/admin/finance`, `/admin/reports`, `/admin/payments`, `/admin/transactions`, `/admin/config` |
| trading | `/admin/events`, `/admin/ai-polls`, `/admin/candidates`, `/admin/proposals`, `/admin/markets`, `/admin/resolver-queue`, `/admin/resolver`, `/admin/sources`, `/admin/updown`, `/admin/updown/rounds`, `/admin/moderation` |
| growth | `/admin/affiliate`, `/admin/bonuses`, `/admin/invites`, `/admin/players/cohorts` |
| compliance | `/admin/compliance`, `/admin/objections`, `/admin/aml`, `/admin/self-exclusions`, `/admin/privacy`, `/admin/retention`, `/admin/audit`, `/admin/approvals`, `/admin/kyc` |
| support | `/admin/players`, `/admin/players/[id]` |
| ops | `/admin/system`, `/admin/ai-usage`, `/admin/staff`†, `/admin/roles`† |
| *(TOTP-exempt)* | `/admin/2fa/setup`, `/admin/totp-verify` |

† `/admin/staff` + `/admin/roles` are **Owner-only** via an explicit `OWNER_ONLY_PREFIXES` check (require
`ADMIN` regardless of any `ops` grant). `/admin/players/[id]` shell = `support`, but its KYC/PII document
sub-blocks render only for `compliance` view, and money/compliance controls only for the matching `canAct`.

### Action → domain (ACT gate — each action file's guard → `requireStaff(domain)`)

| Domain | Action files / actions |
|---|---|
| support | `players/[id]/actions.ts`: suspend, restore, reset-password, set-email |
| accounting | `players/[id]/actions.ts`: adjustBalance · `config/actions.ts` · `settlement` · `payments` · `reports/pack-actions.ts` |
| compliance | `players/[id]/actions.ts`: DSAR export, forceReverifyKyc, approve/reject/requestInfo KYC · `aml` · `kyc/[id]/kyc-actions.ts` · `privacy` · `retention` · `self-exclusions` · `objections` · `approvals` |
| growth | `bonuses` · `affiliate` · `invites` |
| trading | `markets` · `resolver` · `candidates` · `proposals` · `sources` · `events` · `ai-polls` · `moderation` · `updown` |
| ops | `system` · `ai-usage` |
| *(Owner-only)* | `staff` · `roles` (ADMIN hardcoded, not via the table) |

### Behavior deltas vs pre-RBAC (all reversible live at `/admin/roles`; ADMIN retains everything)

- **COMPLIANCE loses default `accounting`-act** (manual credits, settlement, config/rates) — retained only
  via `compliance` (incl. AML release/reject). Owner can re-grant `accounting`-act to COMPLIANCE live.
- **Trading (MODERATOR) unchanged:** trading only — never money/PII/config (the #1 invariant from `roles.ts`).
- **New roles** FINANCE/GROWTH/AUDITOR/SUPPORT gain console access (were zero before).

---

## Phase checklist

- [x] **Phase 0 — Housekeeping:** this tracker created; tree clean + pushed.
- [x] **Phase 1 — Model + migration + loader:** two additive migrations (roles enum values; `AdminDomain`
      + `RoleDomainGrant` + nullable `User.roleChangedAt/By`); `schema.prisma` models; `roles.ts`/`rbac.ts`
      (`AdminDomain`, `STAFF_ROLES`, `DEFAULT_GRANTS`, `ROUTE_DOMAINS`+`domainForPath`+completeness assert,
      `roleGrants` loader+cache, `canView`/`canAct`, `requireStaff`); `test:rbac`.
- [~] **Phase 2 — Gate layers (core shipped @2a; remainder in 2b):**
      - [x] Route VIEW gate — layout `ROUTE_DOMAINS`→`canView` (replaced `READ_TIERS`) + `OWNER_ONLY_PREFIXES`
            + console admission widened to `STAFF_ROLES` (login/2FA/verify pages too).
      - [x] Nav filter — `domain` per `NAV_GROUPS` item + `filterNavGroups` in sidebar + mobile nav (empty groups hidden).
      - [x] Role display — role chip in the admin top bar + role in the confidential band (Ali's "know who you are" ask).
      - [x] Action guard — `requireStaff`/`canAct` applied to 15 action files (ai-polls, candidates, sources, bonuses,
            invites, affiliate, config, system, ai-usage, approvals, objections, privacy, settlement, payments, reports, events).
      - [x] **2b action layer** — ALL remaining action files + API routes now data-driven: players[mixed:
            support/accounting/compliance], aml→compliance, markets→trading, kyc→compliance, resolver×2→compliance,
            updown[config→accounting/ops→trading], proposals[content→trading/config→accounting/approve→growth],
            ai-toolkit→compliance, api/admin/{admission→ops·view, kyc-doc→compliance, reports→accounting·view,
            transactions/export→accounting·view}; in-page `hasRole` page-gates (insights/transactions/reports/finance→
            accounting·view, events→trading·view, objections canDecide→compliance·act) updated for new roles.
      - [ ] Player-detail KYC/PII sub-block gating (Support scope) — folded into Phase 3 (Support isn't assignable until then).
- [x] **Phase 3 — `/admin/staff`:** roster + `[id]` detail + `setStaffRoleAction` / `addStaffByPhoneAction`
      (Owner-only via `requireOwner`, step-up 2FA, mandatory reason, **self-demotion block**, `revokeUserSessions`,
      COMPLIANCE audit + role-history tab) with **consequence highlighting** (inline "will see / will do" panel in
      kit type + semantic colours, `ConfirmModal tone="claret" tier="hard"` on money/PII roles) — Ali's ask.
      Registered in a new Owner-only "Access" nav group + `ROUTE_KEYS`. Pure validation in `staff-roles.ts`;
      `test:staff-role` (24). ⏳ Player-detail KYC/PII sub-block gating still folds into Phase 5.
- [ ] **Phase 4 — `/admin/roles`:** matrix editor (Owner-only, `Toggle` grid, live-save, audited,
      reset-to-defaults, Owner-not-editable, consequence confirm); nav/route registration.
- [ ] **Phase 5 — Verify + docs + memory:** both suites + `test:all` green twice; both migrations
      deploy-verified; docs updated (`roles.ts` header, `DESIGN_AUTHORITY.md`, design-system README); memory updated.

## Verification (definition of done)

- `npx tsc --noEmit && npm run build && npm run test:all` (twice). `scripts/rbac.test.mts` (`test:rbac`) +
  `scripts/staff-role.test.mts` (`test:staff-role`) auto-discovered by `test:all`; both added to the
  `predeploy` chain.
- `test:rbac`: default matrix correct; ADMIN bypasses (all view+act, opens staff/roles); AUDITOR acts
  nowhere; MODERATOR/Trading never views/acts on money/compliance/support/ops; SUPPORT = support+overview
  only; non-ADMIN can never reach staff/roles; `roleGrants` cache revalidates after an edit and an edited
  grant changes nav/route/action for that role without a role change or redeploy; `assertRouteDomainsComplete`.
- `test:staff-role`: `setStaffRoleAction` ADMIN-only, requires reason + TOTP, blocks self-demotion, calls
  `revokeUserSessions`, writes audit.
- Each phase deploy-verified on Railway (`https://www.50pick.tz/api/health` `uptimeSec` reset; `railway
  deployment list`; a 200 ≠ your commit is live).
- Owner acceptance: each role sees ONLY its pages (nav + direct-URL + mutations); a grant edit takes effect
  next request with no deploy; consequence text legible + correctly coloured; Owner never lockable.

## Shipped (append each commit)

- **Phase 1** — `5da76fb` (2026-07-28) — role model + `AdminDomain` + `RoleDomainGrant` + loader +
  `requireStaff`/`requireOwner` guards + two additive migrations + `test:rbac` (92). tsc/build/test:all
  ×2 green; deploy-verified (container restart, `uptimeSec` reset, `auditEntries` 0, service Online).
- **Phase 2a** — `25d488d` (2026-07-28, LIVE-verified) — three gate layers wired: layout route VIEW gate
  (`domainForPath`→`canView`, Owner-only staff/roles, console admission→`STAFF_ROLES`), nav domain filter
  (`filterNavGroups`), role chip + confidential-band role, and 15 action files migrated to `requireStaff`/`canAct`.
  tsc/build clean; test:all 100/100 (a `test:trilingual` flake cleared on re-run). Deploy-verified (uptime reset).
- **Phase 2b** — `4da5cc0` (2026-07-28, LIVE-verified) — completed the ACTION layer: every remaining admin
  action file + all 5 `api/admin/*` routes + the 6 in-page `hasRole` page-gates now consult the data-driven
  grants. Zero old-tier references left in app code (only stale comments remain, cleaned in Phase 5). Deploy-verified.
- **Phase 3** — (2026-07-28) — `/admin/staff` roster + `/admin/staff/[id]` detail; `setStaffRoleAction` /
  `addStaffByPhoneAction` (Owner-only, 2FA, reason, self-demotion block, session revoke, COMPLIANCE audit +
  history); consequence highlighting; new Owner-only "Access" nav group; `staff-roles.ts` + `staffRoleInfos()`;
  `test:staff-role` (24). tsc/build clean; test:all 101/101 ×2.
