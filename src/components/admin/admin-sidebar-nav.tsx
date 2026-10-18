"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeKeyFromPath, type NavGroup } from "./admin-nav-groups";
import { CountBadge } from "@/components/ui/count-badge";
import { NavGlyph } from "@/components/ui/nav-glyph";

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
                  // W3's review: the pill's edge (box-shadow) fades with its fill over --t-quick, as
                  // `.kp-navlink`'s does; `transition-colors` faded the fill and snapped the edge.
                  "flex min-h-[var(--h-control-sm)] items-center justify-between rounded-md px-2.5 text-body-sm transition-[color,background-color,box-shadow] duration-quick ease-out",
                  active
                    ? "text-text font-semibold"
                    : "text-text-subtle hover:text-text",
                ].join(" ")}
                // ⭐ PHOSPHOR-MIGRATION W3 · R-INDICATOR 3B (Ali, 2026-10-17): the current destination is its
                // Fill glyph on the OPAQUE royal pill with a lit edge, `--nav-pill` + `--nav-pill-edge`
                // (globals.css) — the one selected language the player's tab bars and desktop bars speak
                // too. Its ink is --text; every other row keeps its subtle ink, and the glyph follows the
                // row's ink (currentColor), so the two can never disagree.
                // ⛔ NOT `--pill-active` any more. That token is see-through (40% L at alpha 0.35, 1.18:1 on
                // a bar) and it stays the selection of filters, menus and page tabs; a destination is not a
                // filter. DG-A-18 (§B9) still stands: this row reads a token and never types a literal —
                // it once typed its own, which had drifted in hue and alpha from the token it copied.
                style={active ? { background: "var(--nav-pill)", boxShadow: "var(--nav-pill-edge)" } : undefined}
              >
                {/* ⭐ W3 (R-ADMIN, "Yes, sidebar + cards"): one glyph per destination, before its label, 10px
                    apart; Line in its row, Fill while current, morphing only INTO the current one (NavGlyph).
                    The pair stays together on the left; the pip below stays at the right.
                    ⛔ `gap-[10px]`, the same-pixel literal, never `gap-2.5`: that key reads bigger than `gap-2`
                    and paints smaller (10px under 12px), and `test:spacing-scale` only lets their count fall. */}
                <span className="flex min-w-0 items-center gap-[10px]">
                  <NavGlyph glyph={it.glyph} on={active} s={18} />
                  <span>{it.label}</span>
                </span>
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
