# 50pick UI v2 — Modernization Plan (Phase 2)

> **Created:** 2026-06-05 — replaces CLAUDE_SPRINTS.md as the active plan.
> Previous sprints (1–12) completed the foundation. This plan drives **pixel-perfect
> kit conformance** across every component, page, and responsive breakpoint.

## Where we are now

**Completed (Phase 1, Sprints 1–12):**
- Glass-panel utility, market card glyph watermark + blue hover glow
- YES/NO/Gold buttons: gradient fills + inset shadows + hover glows
- Top nav: 56px, kit backdrop formula, deeper shadow
- Frosted modals/dropdowns/toasts, balance-privacy eye
- Route transitions + staggered card reveals
- Progress light-sweep, admin chart bloom
- data-motion throttle, dead CSS cleanup
- Wallet gold labels + gold-tinted border

**Compliance grade from audit: C+ (57% strict / 82% functional)**
The foundation is right but dozens of pixel-precise details are off.

## Final destination (100% kit conformance)

Every component matches kit50.css + ds-*.jsx specs exactly:
- Tokens: all colors via `var(--token)`, zero hardcoded oklch in components
- Sizes: exact px from kit (not Tailwind approximations)
- Shadows: kit shadow strings verbatim
- Animations: kit timing + easing
- Responsive: all pages work at 393/768/1024/1280/1440
- Designers can validate the build against the kit with zero issues

---

## Sprint 13 — Atom component precision (input, toggle, empty-state, chip, tabs)

| Item | Kit spec | Current | Fix |
|------|----------|---------|-----|
| Input focus color | `--brand-500` blue | `--aqua-300` teal | Swap token |
| Input focus shadow | `oklch(63% 0.18 262 / 0.25)` | `--aqua-glow` | Use exact oklch |
| Input error bg | `oklch(58% 0.2 25 / 0.2)` | `bg-no-500/5` | Fix opacity |
| Toggle width | 44px | 46px | Fix to 44 |
| Toggle off thumb | white/light | `text-subtle` | Fix to light |
| Empty-state bg | solid `bg-elevated` | 40% transparent | Remove transparency |
| Empty-state icon size | 46px | 56px (w-14) | Fix to 46 |
| Empty-state icon color | `text-faint` | `teal-300` hardcoded | Use token |
| Empty-state border | `border-strong` dashed | `border-border` dashed | Fix token |
| Chip live color | `var(--live-400)` | hardcoded oklch | Use token |
| Tabs segmented gap | 2px | gap-1 (4px) | Fix to gap-0.5 |
| Tabs segmented active | `oklch(40% 0.08 264 / 0.55)` | bg-bg-elevated | Fix color |

## Sprint 14 — Admin shell precision

| Item | Kit spec | Current | Fix |
|------|----------|---------|-----|
| Sidebar width | 216px | 220px | Fix |
| Sidebar padding | 18px 14px | px-3 py-4 | Fix |
| Badge padding | 1px 5px | px-1.5 py-0.5 | Fix |
| Badge radius | 4px (r-xs) | 8px (rounded-sm) | Fix |
| Admin topbar | backdrop blur+saturate | flat bg-elevated | Add blur |
| AdminBlock | flat bg-sunken | — | Add glass |
| AdminFunnel | flat bg-sunken | — | Add glass |

## Sprint 15 — Flat panel sweep (13+ pages)

All remaining `border border-border bg-bg-elevated` rounded sections → glass-panel:
- auth/otp, auth/forgot-password, auth/admin, admin/totp-verify
- markets/[id] (prediction cards, sign-in panel, KPI, closed notice)
- help page cards + links
- profile/page menu links
- profile/account table wrapper
- proposals/page hero card
- fairness empty state

## Sprint 16 — Live ticker + responsive QA

| Item | Kit spec | Current | Fix |
|------|----------|---------|-----|
| Ticker label | 10.5px | 8.5px | Enlarge |
| Ticker title | 12px | 11px | Enlarge |
| Responsive check | 393/768/1024/1280/1440 | untested | Verify |

## Sprint 17 — Final build + cleanup + designer handoff

- Run `npm run build` — must exit 0
- Delete CLAUDE_SPRINTS.md (replaced by this doc)
- Update VALIDATION_CHECKLIST.md with all final statuses
- Document any remaining optional polish items

---

## Progress log

_(Update as sprints complete)_
