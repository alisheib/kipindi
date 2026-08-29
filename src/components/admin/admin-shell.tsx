/**
 * Admin shell — confidentiality band, grouped sidebar, top bar with crumbs.
 *
 * Inherits the 50pick design system: existing tokens, Sora/Inter/JBM fonts,
 * gold-positive / royal-active / muted-loss colour discipline.
 */
import Link from "next/link";
import { cache as reactCache } from "react";
import { db } from "@/lib/server/store";
import { FiftyMark } from "@/components/brand";
import { I } from "@/components/ui/glyphs";
import { AdminMobileNavTrigger } from "./admin-mobile-nav";
import { AdminCrumbs } from "./admin-crumbs";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { RefreshButton } from "./refresh-button";
import { AiToolkit } from "./ai-toolkit";
import { getAiToolkitStatus } from "@/lib/server/ai-controls";
import { canUseControl } from "@/lib/server/control-gates";
import { filterNavGroups } from "./admin-nav-groups";
import { roleLabel, type AdminDomain } from "@/lib/server/roles";
import { AdminSpark } from "./admin-charts";
import { formatDateISO } from "@/lib/utils";

export type AdminSession = {
  userId: string;
  phoneE164: string;
  role: string;
};

export { NAV_GROUPS } from "./admin-nav-groups";

/** Session-id prefix for the confidential band — short, anonymisable. */
function shortSessionLabel(s: AdminSession): string {
  return s.userId.slice(-4).toUpperCase();
}

export async function ConfidentialBand({ session }: { session: AdminSession }) {
  const officer = await db.user.findById(session.userId);
  const email = officer?.displayName ?? session.phoneE164;
  return (
    // `text-text`, not `text-onBrand` (2026-08-21). There is no `onBrand` colour
    // family in tailwind.config.ts, so the band has always had no inherited colour
    // at all — invisible only because both spans below set their own. The tempting
    // repair is the real key `text-text-onBrand`, and it would be WRONG here:
    // `--text-on-brand` is oklch(15%), an inverse for text sitting on a gold/brand
    // FILL, and this band is `bg-bg-sunken` (oklch 11%) — near-black on near-black.
    // The band renders light-on-dark, so its inherited default is the ordinary
    // primary text token; the two spans still override it with pure white.
    <div className="bg-bg-sunken text-text border-b border-border-strong flex items-center justify-between px-4 lg:px-6 h-7 text-micro font-mono uppercase tracking-[0.18em]">
      <span className="flex items-center gap-2">
        {/* Claret "restricted" dot — admin gold-discipline: gold is only the resolved seal. */}
        <span className="inline-block h-1.5 w-1.5 rounded-pill" style={{ background: "var(--claret-200)" }} />
        <span className="text-white">Staff · Confidential · Internal only</span>
      </span>
      <span className="hidden sm:inline text-white/70">
        50pick Africa · {roleLabel(session.role)} · session #{shortSessionLabel(session)} · {email}
      </span>
    </div>
  );
}

/**
 * Counts of pending items across the system — drives sidebar badges so an
 * operator can see at a glance "3 in AML, 7 compliance items, 2 approvals."
 */
// B-28 — two fixes in one:
//  · `cache()` — the sidebar AND the top bar both call this, so every admin
//    render ran the three queries twice; one memoised run per request now.
//  · guarded reads — these are BADGES. A failed query used to throw and take
//    the whole admin shell down with it; a badge that can't be counted simply
//    doesn't render (undefined), which is also what "0 pending" renders.
//
// 🔴 AND THE GUARD ABOVE DID NOT WORK — measured 2026-08-13, and the comment claiming it
// did is the reason nobody looked. `db.txn.listByStatus` and `db.sourceOfFunds.listPending`
// are the DEV IN-MEMORY store's SYNC methods: they return an array, not a Promise, while
// tsc only ever sees the async Prisma types (CLAUDE.md "Known gotchas"). So `.then` threw
// a TypeError **while Promise.all's arguments were being evaluated** — before any `.catch`
// was attached — and took every /admin/* page's subtree down with it locally. The shell's
// own "a badge that can't be counted simply doesn't render" was false about itself.
// ⚠️ `Promise.resolve()` is what makes the guard real: a no-op on a genuine Promise (prod,
// Prisma) and the fix in dev. `listPendingKyc` is a real `async function`, so it always
// returns a Promise and needs no wrapper — the two that DO are wrapped, not all three,
// because wrapping something that never needed it teaches the next reader the wrong rule.
export const getSidebarBadges = reactCache(async () => {
  const [aml, sof, kyc] = await Promise.all([
    Promise.resolve(db.txn.listByStatus("AML_REVIEW")).then((r) => r.length).catch(() => 0),
    Promise.resolve(db.sourceOfFunds.listPending()).then((r) => r.length).catch(() => 0),
    import("@/lib/server/kyc-service").then(({ listPendingKyc }) => listPendingKyc()).then((r) => r.length).catch(() => 0),
  ]);
  // Approvals badge surfaces work waiting on an officer: pending KYC + AML +
  // source-of-funds. This is the admin's "new player to review" signal.
  const approvals = kyc + aml + sof;
  return {
    aml: aml > 0 ? String(aml) : undefined,
    compliance: aml + sof > 0 ? String(aml + sof) : undefined,
    approvals: approvals > 0 ? String(approvals) : undefined,
  };
});

export async function AdminSidebar({ activeKey, viewDomains, isOwner }: { activeKey: string; viewDomains: AdminDomain[]; isOwner: boolean }) {
  const badges = await getSidebarBadges();
  // RBAC nav gate — show only the groups/items whose domain the viewer may see.
  const groups = filterNavGroups(viewDomains, isOwner);
  return (
    <aside className="hidden lg:flex shrink-0 border-r border-border flex-col gap-1 sticky top-0 self-start max-h-screen overflow-y-auto"
      style={{ width: 216, padding: "18px 14px", background: "var(--panel)" }}>
      {/* ⭐ DG-A-18 · the console's own brand link had NO hover response on any of its 44 pages —
          the hover probe's only universal miss. It is a link to /admin; it now says so on approach,
          using the same `--pill-active` fill the nav rows below it use for their active state. */}
      <Link href="/admin" className="flex items-center gap-2 px-2 pb-3 mb-2 rounded-md border-b border-dashed border-border-subtle transition-colors hover:bg-[var(--pill-active)]">
        <FiftyMark size={18} simplified aria-hidden />
        <span className="font-display font-bold text-body-sm text-text">50pick · admin</span>
      </Link>
      <AdminSidebarNav groups={groups} badges={badges} fallbackKey={activeKey} />
      <div className="mt-auto pt-3 border-t border-dashed border-border-subtle text-caption text-text-tertiary px-2">
        <div>v2.4 · deployed {formatDateISO(new Date().toISOString())}</div>
        <div className="mt-1">EN · SW · ZH</div>
      </div>
    </aside>
  );
}

export async function AdminTopBar({ crumbs, session, activeKey, viewDomains, isOwner }: { crumbs: string[]; session: AdminSession; activeKey: string; viewDomains: AdminDomain[]; isOwner: boolean }) {
  const badges = await getSidebarBadges();
  const groups = filterNavGroups(viewDomains, isOwner);
  return (
    <div className="relative z-40 border-b border-border"
      style={{
        height: 56,
        background: "var(--panel)",
      }}>
      {/* 🔴 THE FROSTED BLUR IS DELETED — 2026-08-21. It was
          `color-mix(in oklab, var(--panel) 78%, transparent)` plus
          `backdrop-filter: blur(14px) saturate(1.3)`, on the top bar of all 47 admin routes.

          ⚠️ AND THE USUAL REASON GIVEN FOR REMOVING ONE DOES NOT APPLY HERE — checked, not
          assumed. This bar is NOT sticky: `admin/layout.tsx` renders it in normal flow
          inside the content column (the SIDEBAR is the sticky element, not this), so it
          scrolls away with the content and does not re-blur a moving backdrop every frame.
          If you are here because a plan said "sticky admin top bar", that part was wrong.

          ⭐ IT IS STILL WORTH DELETING, FOR THE OTHER REASON. `backdrop-filter` forces the
          element onto its own compositing layer and re-runs a full-width 14px blur +
          saturate pass on every REPAINT of the region — and the admin shell repaints that
          region constantly without anyone scrolling: the `animate-pulse` live dots on the
          KPI tiles sit directly beneath it, `RefreshButton` re-renders the grid in place,
          and the AI-toolkit dropdown opens over it. That is continuous GPU work, on every
          admin screen, to soften a strip that has data directly behind it.

          ⛔ THE SEE-THROUGH BAR IS REMOVED, NOT TUNED — this is the SAME fix, for the same
          reason, that the PLAYER top bar already took in batch 3 (see `top-app-bar.tsx`
          and the "THE STICKY TOP-BAR FROSTED BLUR IS DELETED" note in `globals.css`).
          A translucent bar over scrolling data cannot be made legible by raising a mix
          percentage; `--panel` is opaque, and the 1px `--border` bottom edge is the
          boundary. Do not reintroduce a translucent header here either.

          ⭐ `relative z-40` STAYS, AND IS STILL LOAD-BEARING — read this before "cleaning"
          it up. The comment it replaces justified z-40 by the blur ("backdrop-filter makes
          this bar its own stacking context"), so removing the blur reads like removing the
          reason. It is not: a positioned element with a z-index forms a stacking context
          on its own, and what actually matters is that the bar is ELEVATED ABOVE THE PAGE
          BODY so the AI-toolkit dropdown (z-50) overlays the content instead of the search
          input painting over it at 360. Drop the z-40 and that bug comes straight back.
          Stays below portaled modals (z-100). */}
      {/* DESIGN_AUTHORITY B7 — the bar's BACKGROUND stays full-bleed (it is chrome,
          and a boxed blur strip would look broken against the sidebar), but its
          CONTENT is capped to the same console measure as the page body below it.
          Without this the breadcrumb sat at the far left while AdminPageHead began
          at the centred column's edge — a visible misalignment above 1600px. Same
          pattern the player top bar already uses. */}
      <div className="mx-auto w-full max-w-console h-full flex items-center justify-between px-4 lg:px-6 gap-3">
      {/* ⛔ G-4 (2026-08-02). At 360 the RIGHT cluster below is `shrink-0` and measures
          302px, so this side was handed **2px**: the breadcrumb collapsed to a width of
          exactly **0** and the mobile-nav trigger — the only way into the admin menu on a
          phone — was crushed from its 44px tap target to **18px**. On every admin page.
          Nothing caught it because a 0px-wide `nav` reports no overflow and the shell
          still *looked* plausible in a screenshot; it took measuring the box model.
          Three parts to the fix, here and on the cluster below:
            · the trigger is `shrink-0`, so the tap target is never the thing that gives;
            · the breadcrumb is `hidden md:flex` — at 360 it was already invisible, and
              saying so explicitly stops it competing for space it never wins. The page
              title in `AdminPageHead` directly below carries the location on a phone;
            · the role chip below hides under `sm`, which is what frees the width. */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0">
          {/* ⚠️ fallbackKey, not activeKey — the drawer re-derives it from usePathname(), because
              this value was computed in a LAYOUT and freezes across soft navigations (E-70). */}
          <AdminMobileNavTrigger groups={groups} badges={badges} fallbackKey={activeKey} roleLabel={roleLabel(session.role)} />
        </div>
      {/* ⛔ E-30, second surface, SAME root cause as the AdminKpi delta below: a flex item
          defaults to `min-width: auto`, which refuses to shrink below its content. The
          `nav` already carried `min-w-0 overflow-hidden` and each crumb already carried
          `truncate` — but the per-crumb WRAPPER in between had neither, so it would not
          shrink and `truncate` could never engage. Measured at 768: "Admin / Up & Down /
          Proposals" ran 34px past the nav, in all three locales.
          `shrink-0` on the separator keeps "/" from being the thing that collapses. */}
      {/* 🔴 E-70 · THE TRAIL IS DERIVED ON THE CLIENT. It used to be built here from the
          `crumbs` prop, which `app/admin/layout.tsx` computed from the `x-pathname` REQUEST
          HEADER — in a layout, which is NOT re-executed on a soft navigation. Clicking from
          /admin/players to /admin/markets left this reading "Admin / Players". The clipping
          fixes measured at 768 moved WITH the markup into `admin-crumbs.tsx`; read that file
          before touching the box model. */}
      <AdminCrumbs fallback={crumbs} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Back to the player app — lands on the landing/home ("/"), the app's
            hub (hero + live markets + stats + full bottom-nav), NOT the raw
            /markets board which reads as a dead-end. Understated ghost pill;
            collapses to icon-only on narrow viewports. Mirrors the player-side
            "Staff console" jump, closing the admin↔player loop.

            ⛔ E-70 · THIS IS A PLAIN <a> ON PURPOSE. DO NOT "OPTIMISE" IT BACK TO <Link>.
            `AppShell` (the root layout) decides whether to render the player chrome from the
            `x-pathname` REQUEST HEADER, and in the App Router a layout is NOT re-executed on a
            client-side soft navigation — it is preserved across route changes. So a <Link>
            here kept the shell-LESS layout rendered for /admin and dropped the landing page
            into it: no top bar, no wallet, no bell, no bottom nav, and no way back. Ali
            reported it twice; two sessions failed to reproduce it because they used
            `page.goto()`, which is a HARD load and re-renders the layout correctly.
            Measured on production, same URL and same session: click → `nav=0`, hard load →
            `nav=2`. A full document load is the CORRECT primitive when crossing between two
            entirely different shells. 🔒 `npm run test:shell-boundary`. */}
        <a
          href="/"
          aria-label="Back to app"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-bg-inset text-text-secondary hover:text-text hover:border-border-strong hover:bg-bg-elevated transition-colors font-mono text-micro tracking-[0.10em] uppercase"
        >
          <I.chevronLeft s={13} aria-hidden />
          <span className="hidden md:inline">Back to app</span>
        </a>
        {/* Global grid refresh — re-fetches the current server-rendered admin
            screen in place. Present on every admin page so any grid can be
            refreshed from one predictable spot (screens with a filter bar also
            expose a contextual refresh next to their filters). */}
        {/* No size override: RefreshButton's icon variant is 40px in the component
            itself now. The `!h-7 !w-7` that used to sit here existed only to defeat the
            component's own 80×80 default (`h-10 w-10` on the overridden spacing scale). */}
        <RefreshButton variant="icon" />
        {/* AI toolkit — the ONE place every AI feature is switched on/off (chatbot,
            market resolution, auto-resolve, poll generation). Replaces the old
            per-feature toggles + the removed sentinel countdown, so no AI control
            lives in two places. */}
        {/* E-19: the switches are `compliance`; this bar renders for every console
            role. Ask the same question the actions will ask, so a role that cannot
            work them gets a read-only status board instead of four switches that
            refuse (and log the click as a SECURITY event). */}
        <AiToolkit
          status={await getAiToolkitStatus()}
          canAct={await canUseControl(session.role, "aiToolkit")}
        />
        {/* No notification bell here — the platform's main bell (in AppShell's
            top bar) is the single notification surface for everyone, admins
            included. New-KYC alerts arrive there as in-app notifications. */}
        {/* No global "search players" box here: it rendered on EVERY admin page
            (Reports, Finance, Audit, System…) where player search is out of
            context and confusing. The dedicated /admin/players page has its own
            search — that's the single, correctly-scoped place to find a player. */}
        {/* Role chip — every staff member sees WHICH role they're operating as
            (Owner / Compliance / Trading / Finance / Growth / Auditor / Support).
            Replaces the old always-"ACTIVE" label; the aqua-dot officer pill beside
            it already carries the live/active signal. */}
        {/* G-4: `hidden sm:inline-flex`. This chip is what tipped the bar over 360 and
            crushed the nav trigger. It is NOT lost on a phone — it is re-rendered inside
            the mobile nav drawer (`AdminMobileNavTrigger`, `roleLabel` prop), because
            "which role am I operating as" is a safety affordance on a licensed platform,
            not decoration. */}
        <span
          title={`You are signed in as ${roleLabel(session.role)}`}
          className="hidden sm:inline-flex font-mono text-micro tracking-[0.14em] uppercase px-2.5 h-7 items-center rounded-md border border-border bg-bg-inset text-text-secondary"
        >
          {roleLabel(session.role)}
        </span>
        <span className="font-mono text-micro tracking-[0.14em] px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-text gap-1.5">
          {/* Aqua = officer-active signal (admin live-feed hue), not gold. */}
          <span className="h-1.5 w-1.5 rounded-pill" style={{ background: "var(--aqua-400)" }} />
          <span className="hidden sm:inline">{((await db.user.findById(session.userId))?.displayName ?? "Officer").split(" ")[0]}</span>
        </span>
      </div>
      </div>
    </div>
  );
}

export function AdminPageHead({
  title,
  sw,
  actions,
}: {
  title: string;
  sw?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="px-4 lg:px-6 py-5 border-b border-dashed border-border-subtle flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-title-lg text-text leading-none">{title}</h1>
        {sw && (
          <p className="text-caption text-text-tertiary italic mt-1.5">
            {sw}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {actions}
      </div>
    </header>
  );
}


/* ===== KPI tile ===== */

export function AdminKpi({
  label,
  sw,
  value,
  delta,
  /**
   * ⛔ DG-A-10 — THE DEFAULT IS NEUTRAL, AND IT USED TO BE "up". `delta` is a free caption and
   * almost every caller passes context rather than a movement, so the tile drew a brand-tinted
   * ▲ over things that have no direction at all. Measured on production 2026-08-28:
   * "▲ 672 generations", "▲ 1 calls", "▲ lifetime", "▲ top: SYSTEM", and — on a tile reading
   * TZS 0 — "▲ all-time". On a money console an upward arrow is a claim, not decoration.
   * ⭐ `up`/`down` are now OPT-IN: a caller that means a movement says so.
   */
  deltaDir = "flat",
  gold,
  tone,
  pulse,
  spark = true,
  series,
  unavailable,
}: {
  label: string;
  sw?: string;
  value: string | number;
  delta?: string;
  deltaDir?: "up" | "down" | "flat";
  /** Earned/gold emphasis for the value (e.g. Lifetime GGR). The single way to
   *  ask for gold — there is no `tone="gold"` (it was a redundant alias). */
  gold?: boolean;
  /** Colours the value for status KPIs (e.g. chain integrity, budget health). */
  tone?: "danger" | "success";
  pulse?: boolean;
  spark?: boolean;
  /** Mini 24h/7d series — renders the A8 sparkline in the tile's spark slot. */
  series?: number[];
  /** A-5: the underlying read FAILED. Renders an explicit "n/a · couldn't
   *  compute" tile instead of the passed value, so a failed money/analytics read
   *  never shows a fabricated "TZS 0" as if it were real. NOT the same as a
   *  genuine zero. */
  unavailable?: boolean;
}) {
  if (unavailable) {
    return (
      <div
        className="glass-panel admin-kpi p-2 flex flex-col gap-1.5 min-h-[110px]"
        title="This figure could not be computed — a data read failed. It is NOT zero."
      >
        <span className="font-mono uppercase text-text-tertiary truncate" style={{ fontSize: 9.5, letterSpacing: "0.08em", lineHeight: 1.3 }}>{label}</span>
        <div className="font-mono font-bold text-text-tertiary leading-none" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>n/a</div>
        {sw && <div className="text-text-tertiary italic leading-tight" style={{ fontSize: 10.5 }}>{sw}</div>}
        <div className="mt-auto inline-flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill inline-block" style={{ background: "var(--warning-500)" }} />
          <span className="font-mono uppercase tracking-wider text-warning-fg" style={{ fontSize: 9.5 }}>couldn&apos;t compute</span>
        </div>
      </div>
    );
  }
  const effectiveTone = tone ?? (gold ? "gold" : undefined);
  const valueToneCls =
    effectiveTone === "danger" ? "text-danger"
    : effectiveTone === "success" ? "text-success"
    : effectiveTone === "gold" ? "text-gold"
    : "text-text";
  // ⛔ DG-A-10 — NO HOVER LIFT ON THE TILE BELOW. It is a `<div>`: not pressable, navigating
  // nowhere, and a shadow that rises under the pointer promises an action that does not exist.
  // It also carried `transition-all`, which this codebase bans outright — the pattern that once
  // had 895 elements computing to `transition: all 0s ease`.
  return (
    <div className="glass-panel admin-kpi p-2 flex flex-col gap-1.5 min-h-[110px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono uppercase text-text-tertiary truncate" style={{ fontSize: 9.5, letterSpacing: "0.08em", lineHeight: 1.3 }}>{label}</span>
        {pulse && (
          // Aqua = live-feed signal (admin gold-discipline: gold only on the resolved seal).
          <span className="inline-flex items-center gap-1 text-micro font-mono uppercase tracking-wider" style={{ color: "var(--aqua-400)" }}>
            <span className="h-1.5 w-1.5 rounded-pill inline-block animate-pulse" style={{ background: "var(--aqua-400)" }} />
            live
          </span>
        )}
      </div>
      {/* ⛔ G-4, and it is E-30's lesson one slot over. E-30 fixed the DELTA row and left
          the VALUE assumed safe because a value is "usually a number". It is not always:
          `/admin/affiliate`'s *Top referrer* tile puts a raw handle here, and
          `@jaykishan_kaba_adm` ran **34px past its card** at sw@1280 — clipped mid-word,
          reporting zero page overflow, exactly as E-30 described.
          `truncate` + `title` gives the tail an affordance and keeps the full string
          reachable on hover; the per-element scan correctly ignores `text-overflow:
          ellipsis`, because the "…" IS the disclosure. */}
      {/* 🔴 DG-A-10 part 2 · THE TRACKING HERE WAS LOAD-BEARING, AND IT WAS ILLEGAL.
          This was `style={{ fontSize: 22, letterSpacing: "-0.02em" }}` — -0.44px per glyph
          over an AMOUNT, which §M4 forbids ("every amount … NEVER letter-spaced"), on ~170
          tiles. ⛔ `type-scale` §2 could not see it: it reads class tokens, and this was an
          INLINE style, which outranks every stylesheet rule ever written.
          ⚠️ AND REMOVING IT ALONE WOULD HAVE BROKEN A DIFFERENT LAW. Measured on production
          at 390 (`.qa-design-gate/kpi-probe.mjs`, Range-based — `scrollWidth` is clamped to
          `clientWidth` on a block and can only say "overflowing", never how much room is
          left): `/admin/insights`'s **"TZS 685,532" needs 140.4 of 141px**. It fits by 0.6px
          ONLY because the illegal tracking squeezes it; untracked it needs **145.2 and
          overflows by 4.2**, and this element is `truncate`, so it would ellipsise — which
          §A5 forbids by name: "⛔ never clip money or a timestamp".
          ⭐ So the size steps DOWN at mobile, on the ladder, and the amount is honest at both:
          18px (`text-title-sm`) below 640 → "TZS 685,532" needs 118.8 of 141, 22px of slack;
          22px (`text-title-md`) above, where the tiles are wide. §T7: a size written at a
          call site comes from the TAILWIND ladder.
          ⛔ `truncate` STAYS — it is the G-4/E-30 ruling below and it is for the HANDLE case
          (`@jaykishan_kaba` runs 57px past this box and is not money). Money must fit; a
          handle may ellipsise.
          ⚠️ `.amount.amount` is (0,2,0) deliberately: `sm:text-title-md` is a RESPONSIVE
          variant, emitted after everything globals.css writes, so a single-class money rule
          would silently lose to it at ≥640 and re-tighten the amount. */}
      <div
        className={["amount font-bold leading-none truncate text-title-sm sm:text-title-md", valueToneCls].join(" ")}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
      {sw && (
        <div className="text-text-tertiary italic leading-tight" style={{ fontSize: 10.5 }}>{sw}</div>
      )}
      {(spark || delta) && (
        /**
         * ⛔ E-30 · `min-w-0` IS LOad-BEARING HERE. A flex item's default `min-width:auto`
         * refuses to shrink below its content, so `whitespace-nowrap` on the delta made the
         * row wider than the card and the text was clipped mid-word by the card's own edge.
         *
         * The previous mitigation was a COMMENT asking every caller to "keep every delta
         * SHORT" — and the very line that carried that comment was clipped anyway
         * (`0 review · 0 arm`, 21px over at 360px, in all three locales; the author had
         * already shortened "armed" to "arm" and it was still too long). A convention that
         * its own author cannot satisfy while writing it down is not a mitigation.
         *
         * Measured, not assumed: it did not show up as page overflow, because clipping
         * INSIDE a card never reaches `document.scrollWidth`. Only a per-element scan or a
         * human looking at the screenshot finds it. So the component truncates instead —
         * `title` keeps the full string reachable on hover and to a screen reader.
         */
        <div className="mt-auto flex items-end gap-2 min-w-0">
          {/* A8 spark slot — royal mini-series, aqua reserved for live feeds. */}
          {series && series.length >= 2 && (
            <div className="flex-1 min-w-0 self-center">
              <AdminSpark series={series} height={24} />
            </div>
          )}
          {delta && (
            <span
              title={delta}
              className={[
                "font-mono text-micro px-2 py-0.5 rounded-sm ml-auto",
                // At the narrowest width the delta WRAPS rather than truncating: the grid
                // is 2-up at 360 and a tile is ~145px, which is too little for several
                // honest labels ("0 generations" was ellipsised by the truncate-only fix,
                // having previously just fitted). Wrapping costs a line of height that the
                // grid row equalises anyway, and loses nothing. Above `sm` there is room,
                // so it stays on one line.
                "whitespace-normal sm:whitespace-nowrap",
                // The backstop for the one-line case, and the reason `min-w-0` is here:
                // a flex item defaults to `min-width:auto` and will not shrink below its
                // content, so without it neither the wrap nor the ellipsis can engage.
                "min-w-0 max-w-full overflow-hidden text-ellipsis",
                deltaDir === "up"
                  ? "bg-brand-500/15 text-brand-300"
                  : "bg-bg-sunken text-text-tertiary",
              ].join(" ")}
            >
              {deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "·"} {delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== AdminLoadError — explicit "a read failed" state (A-5) ===== */
/* Renders when a list / queue / panel read FAILED, so a backend error never
   shows as a benign empty ("nothing pending") or a fabricated zero. Amber
   caution, not danger: the data may well exist — we just couldn't read it.
   Pair with AdminKpi `unavailable` on the matching count tile. */
export function AdminLoadError({ what }: { what?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-warning-border bg-warning-bg px-4 py-3">
      <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-pill" style={{ background: "var(--warning-500)" }} />
      <div className="text-caption text-text-secondary">
        <p className="font-semibold text-warning-fg">Couldn&apos;t load{what ? ` ${what}` : ""}</p>
        <p className="mt-0.5">A data read failed — this may not be empty. Refresh to retry.</p>
      </div>
    </div>
  );
}

/* ===== Card ===== */

export function AdminCard({
  title,
  sw,
  action,
  children,
  padding = "p-4",
  className,
  ...rest
}: {
  title?: string;
  sw?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: string;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "title">) {
  const isFlush = padding === "p-0";
  return (
    <div {...rest} className={["glass-panel", padding, className ?? ""].join(" ")}>
      {/* ⛔ G-5 (2026-08-02) — the G-4 shape again, in the card header. The action side
            is `shrink-0` and the title side was `min-w-0`, so on a narrow screen the title
            absorbed ALL the shortfall: measured at 360, `/admin/finance`'s "Settlement fees
            by poll" was laid out at a width of **exactly 0** — the card's own heading, gone
            — and `/admin/sources`' "Categories · global toggle" got 46px for 74px of text.
            ⚠️ `min-w-0` alone is not a fix, it is only a promise not to OVERFLOW: an
            element allowed to shrink without limit reports zero overflow while rendering
            nothing. Six admin pages showed this at 360 in the full sweep.
            So: the row WRAPS, and the title keeps a basis wide enough that a wide action
            drops to its own line instead of eating the heading. `min-w-0` stays as the
            last-resort guard against a genuinely unbreakable string. */}
      {(title || action) && (
                <div className={`flex flex-wrap items-start justify-between gap-3 ${isFlush ? "px-4 pt-4 pb-3" : "mb-3"}`}>
          <div className="min-w-0 basis-[14rem] grow">
            {title && <p className="font-display font-semibold text-body-sm text-text leading-tight">{title}</p>}
            {sw && (
              <p className="text-caption text-text-tertiary italic leading-tight mt-0.5">{sw}</p>
            )}
          </div>
          {/* ⛔ G-6 (2026-08-02) — the OTHER half of G-5, and it took a second live
              measurement to see. G-5 made this row wrap and gave the title a basis, so
              the title can no longer be crushed to 0. But the ACTION side is `shrink-0`
              with `min-width:auto`, which means it lays out at its MAX-content width and
              refuses to give any of it back — so once it wraps onto its own line it
              simply hangs off the card. Measured on production at 360: `/admin/finance`'s
              fee summary took **287px inside a 278px card**, +9px into the gutter.
              `max-w-full` caps it at the line it is on, and its text then wraps — while
              `shrink-0` still does the job it was added for, which is refusing to be
              squashed while it is ALONGSIDE the title. Shared: every AdminCard with a
              wide action, on all 47 admin pages. */}
          {action && <div className="shrink-0 max-w-full">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ===== Activity feed row ===== */

export function FeedRow({
  ts,
  category,
  body,
  variant = "neutral",
}: {
  ts: string;
  category: string;
  body: React.ReactNode;
  variant?: "gold" | "royal" | "danger" | "success" | "warning" | "neutral";
}) {
  const variantClass = {
    gold: "bg-gold/15 text-gold",
    royal: "bg-royal/15 text-royal-300",
    danger: "bg-danger/15 text-danger-fg",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    neutral: "bg-bg-sunken text-text-tertiary",
  }[variant];
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-dashed border-border-subtle text-caption last:border-b-0 hover:bg-bg-overlay/30 transition-colors rounded-sm -mx-1 px-1">
      <span className="font-mono text-micro text-text-tertiary w-[60px] shrink-0 tabular-nums">{ts}</span>
      <span
        className={[
          "font-mono text-micro px-1.5 py-0.5 rounded-sm tracking-[0.10em] shrink-0",
          variantClass,
        ].join(" ")}
      >
        {category}
      </span>
      <span className="flex-1 min-w-0 text-text truncate">{body}</span>
    </div>
  );
}

/* ===== Funnel ===== */

export function AdminFunnel({
  steps,
}: {
  steps: ReadonlyArray<{ label: string; value: string | number }>;
}) {
  return (
    <div className="flex items-stretch gap-1 h-16">
      {steps.map((s, i) => (
        <div
          key={i}
          className="flex-1 bg-bg-sunken border border-border rounded-md px-2 py-1.5 flex flex-col justify-between min-w-0"
        >
          <span className="font-mono text-body-sm font-bold text-text truncate">{s.value}</span>
          <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary truncate">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ===== Stacked bar ===== */

/**
 * A band in a stacked bar.
 *
 * ⛔ A LABEL CANNOT BE DECLARED WITHOUT THE INK THAT READS ON IT (S-03, scan #1, 2026-08-28).
 * This component used to hardcode `text-white` on every band while the fill arrived as a
 * free-form `color` string — so it could not know the fill's lightness, and four of the five
 * provider bands on /admin carried white text at 2.19-4.28:1 where 4.5:1 is required at 10px.
 *
 * ⚠️ `test:contrast` is structurally blind to this: its corpus is four CSS files, and the pair
 * forms at RUNTIME from an inline `style={{ background }}` against a Tailwind class. Neither
 * half is in a stylesheet, so no amount of CSS auditing would ever have found it.
 *
 * ⭐ So the pairing is made unrepresentable rather than merely corrected — the same move as
 * S-17's typed-confirm gate. Declare a label and you must declare its ink; declare no label
 * and ink is meaningless and forbidden. `CATEGORICAL_RAMP` in admin-charts.tsx ships the two
 * together for exactly this reason.
 */
type StackedSegment = { flex: number; color: string } & (
  | { label: string; ink: string }
  | { label?: never; ink?: never }
);

export function AdminStackedBar({
  segments,
  height = 18,
  emptyLabel = "No activity in this window",
}: {
  segments: ReadonlyArray<StackedSegment>;
  height?: number;
  /** Shown INSTEAD of the bands when there is nothing to distribute. */
  emptyLabel?: string;
}) {
  /* ⛔ A DISTRIBUTION WITH NOTHING IN IT IS NOT A DISTRIBUTION (S-04, scan #1, 2026-08-28).
   *
   * This had no empty state, so a caller with no data still painted bands. /admin/compliance
   * floored every segment at `Math.max(2, …)` over a `|| 1` denominator, and with zero
   * reality-check events all three landed on that floor — three EQUAL coloured bands,
   * including the rose self-exclusion band, under a caption reading "0% continued · 0% break ·
   * 0% self-excluded". A distribution presented where none exists, on the compliance console,
   * in the row a regulator's eye goes to. A-5 broken by a CHART rather than by a number.
   *
   * ⭐ The correct pattern was already in this repo — `StatusMix` on /admin/players filters
   * zero segments out and returns null when the total is zero. This pushes the same rule into
   * the primitive so the next caller inherits it instead of re-deriving it. Callers should
   * still drop their own zero segments; this catches the case where that leaves nothing. */
  const total = segments.reduce((s, x) => s + (x.flex > 0 ? x.flex : 0), 0);
  if (total <= 0) {
    return (
      <div
        className="rounded-sm border border-dashed border-border-subtle flex items-center justify-center font-mono text-micro uppercase text-text-tertiary"
        style={{ minHeight: Math.max(height, 18) }}
      >
        {emptyLabel}
      </div>
    );
  }
  /* ⭐ ZERO IS ZERO, BUT SMALL IS NOT NOTHING — the same rule `AdminBarList` (2%), `AdminMeter`
   * (1%) and `AdminStackedBars` (0.5px) already follow. Dropping the zeros above without a
   * floor here would trade one misreading for another: a self-exclusion count of 1 against 999
   * continues is a real, important event and a raw flex would render it sub-pixel. So a segment
   * that exists is guaranteed 2% of the bar, and a segment that does not exist is absent. */
  const shown = segments.filter((s) => s.flex > 0);
  const sum = shown.reduce((s, x) => s + x.flex, 0);
  return (
    <div className="rounded-sm overflow-hidden border border-border flex" style={{ height }}>
      {shown.map((s, i) => (
        <div
          key={i}
          className="flex items-center justify-center font-mono text-micro tracking-[0.10em]"
          style={{ flex: Math.max(s.flex / sum, 0.02), background: s.color, color: s.ink }}
        >
          {s.label && height >= 18 ? s.label : null}
        </div>
      ))}
    </div>
  );
}

/* ===== Status pill (for chain/backup OK indicators) ===== */

export function StatusPill({
  status,
  label,
}: {
  status: "ok" | "warn" | "fail";
  label: string;
}) {
  const cls = {
    ok: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    fail: "bg-danger/15 text-danger-fg",
  }[status];
  return (
    <span
      className={[
        // ⛔ LITERALS, NOT `h-8 w-8` — the spacing scale is overridden
        // (tailwind.config.ts:200-215) and that pair is a 48px disc for a one-character
        // label, in health rows whose other chips are 40px. 32px is the dense
        // mouse-only admin rung (--h-control-xs); this roundel is not a tap target.
        "h-[32px] w-[32px] rounded-pill inline-flex items-center justify-center font-mono font-bold text-body-sm shrink-0",
        cls,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
