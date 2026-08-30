"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeKeyFromPath, type NavGroup } from "./admin-nav-groups";
import { CountBadge } from "@/components/ui/count-badge";

// The route→nav-key resolver is imported from admin-nav-groups.ts — see the note
// there. This file's local copy was the one missing /admin/payments, /admin/kyc and
// the /admin/resolver detail route. `groups` is pre-filtered by the server (the RBAC
// nav gate) so a role only ever sees its own domains — see filterNavGroups.

export function AdminSidebarNav({ groups, badges, fallbackKey }: { groups: ReadonlyArray<NavGroup>; badges: Record<string, string | undefined>; fallbackKey: string }) {
  const pathname = usePathname();
  const activeKey = pathname ? activeKeyFromPath(pathname) : fallbackKey;

  return (
    <>
      {groups.map((g) => (
        <div key={g.group.en}>
          <div className="px-2 pt-3 pb-1.5 font-mono text-micro uppercase eyebrow text-text-tertiary">
            {g.group.en} · {g.group.sw}
          </div>
          {g.items.map((it) => {
            const badge = badges[it.key];
            const active = it.key === activeKey;
            return (
              <Link
                key={it.key}
                href={it.href as never}
                // ⛔ THE CURRENT PAGE WAS COMMUNICATED BY COLOUR ALONE. This nav marked the active
                // item with a background and a font weight and nothing else — so a screen reader
                // had no way to know where it was, and no probe could assert it without asking a
                // question about paint. The legal sidebar has always carried this attribute; this
                // one had not. WCAG 1.4.1 (use of colour) and 2.4.8 (location).
                aria-current={active ? "page" : undefined}
                className={[
                  // ⭐ DG-A-18 · 40px, the `--h-control-sm` rung, replacing a `py-2` that
                  // resolved to 42 — off both the 40 and 44 rungs. Stated as the FLOOR and
                  // centred, never summed to.
                  // ⚠️ THIS COMMENT SAID "on every row of every admin page" AND IT WAS NOT TRUE
                  // (corrected 2026-08-29). The fix landed HERE only; `admin-mobile-nav.tsx` kept
                  // the identical `py-2` = 42 for another day, one file away, while this line
                  // claimed the whole surface. A comment that overstates its own reach is how the
                  // next session decides a row is finished without measuring it — the drawer takes
                  // `--h-control-md` (44), not this rung, because it is a MOBILE target (§A2).
                  "flex min-h-[var(--h-control-sm)] items-center justify-between rounded-md px-2.5 text-body-sm transition-colors",
                  active
                    ? "text-text font-semibold"
                    : "text-text-subtle hover:text-text",
                ].join(" ")}
                // ⭐ DG-A-18 · §B9. This was `oklch(40% 0.12 268 / 0.5)`, typed here — and it had
                // already DIVERGED from the token that owns this exact job: `--pill-active` is
                // `oklch(40% 0.12 262 / 0.35)`, i.e. a different hue AND a different alpha, for
                // "one active filter/tab fill everywhere". Two homes for one design truth, drifting
                // apart in the dark — which is the whole argument of B9 in one line.
                // ⛔ `ui-consistency`'s `hardcoded-pill-active` rule could not see it: that rule
                // matches the token's LITERAL text, and this was a different literal.
                style={active ? { background: "var(--pill-active)" } : undefined}
              >
                <span>{it.label}</span>
                {/* ⭐ The kit pip. `count-badge.tsx`'s own header names "admin sidebar" as one of
                    the FOUR implementations it was written to consolidate, and this call site was
                    never migrated — so it kept the 4px corner B10.2 calls a second definition site,
                    and it kept NO CAP. `approvals` is kyc + aml + sof, which can genuinely pass 99. */}
                {badge && <CountBadge count={Number(badge)} tone="brand" size="sm" />}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
