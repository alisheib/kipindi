"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExitPhase } from "@/components/ui/modal";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { NeedleControlsDrawer } from "@/components/layout/needle-drawer";
import type { ProposalsState } from "@/lib/server/proposals-config";

export function AvatarMenu({
  initials,
  name,
  phone,
  isAuthed = false,
  avatarSrc = null,
  seed,
  isAdmin = false,
  proposalsState = "COMING_SOON",
}: {
  initials: string;
  name: string;
  phone: string;
  isAuthed?: boolean;
  avatarSrc?: string | null;
  seed?: string;
  isAdmin?: boolean;
  proposalsState?: ProposalsState;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useT();
  const pathname = usePathname();
  // Close menu on navigation so the portal + scrim don't persist.
  useEffect(() => { setOpen(false); }, [pathname]);

  /* §M2 — this menu is a FLOAT-rung surface, so it takes `.m-float-in` / `.m-float-out`
     and nothing else. ⛔ It used to arrive on a bespoke `am-rise` keyframe declared in a
     local <style> tag: "there is no third entrance", and a private keyframe is exactly
     the second definition of one fact §E6 pins with `test:keyframes`. Both the keyframe
     and the tag are gone; the kit utility does the same job at the kit's own beat. */
  const { present, exiting } = useExitPhase(open, "--t-flick");

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /**
   * 🔴 THE GUEST BRANCH RENDERED A SECOND `Sign in` + `Sign up` PAIR, AND IT SHIPPED FOR ABOUT AN
   * HOUR OF BATCH 3 BEFORE A FRAME CAUGHT IT. `TopAppBar` now renders auth as the kit's ACTION
   * tier at every width (§2), and this component sits inside that same right-hand cluster — so a
   * visitor saw `EN ⌄ · Sign in · Sign up · Sign in · Sign up`. **Measured, not eyeballed**: four
   * controls in the header whose visible text was exactly an auth label.
   *
   * ⛔ Every gate was green over it. `overflowX` was 0, no band clipped, no control under the tap
   * floor in any band, no console error — it is the same shape as batch 2's hero stating its lead
   * market twice, and it was found the same way: by looking at a rendered frame.
   *
   * ⭐ The header's pair is the one that stays, for two reasons beyond the kit saying so: it is
   * `btn-md` (38px) against this pair's `btn-sm` (**30px**, under the 44px floor, on the two
   * controls a new visitor is most likely to reach for), and it lives beside the language control
   * where the action tier belongs. A guest now gets NO avatar affordance at all, which is correct
   * — there is no account to open a menu for.
   * ⚠️ If auth is ever removed from the header, restore it HERE at `btn-md` or better; do not
   * reintroduce a second pair.
   */
  if (!isAuthed) return null;

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        aria-label={t.common.accountMenu}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        // DG-P-01 — the account trigger was hover-dead too (36 probes). It carries an IMAGE inside a
        // brand ring, so the nav links' background wash cannot show through it; opacity is the
        // platform's existing answer for an image-bearing control (the brand mark, top-app-bar.tsx).
        className="rounded-pill transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: "1.5px solid var(--brand-500)",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          /* DA-9/E-132 — was a hand-built gradient off `--bg-elevated2` (26%,
             above the 24% ink cap; token retired). The float wash is the system
             gradient for a lit chrome surface, and its angle is the one lamp. */
          background: "var(--wash-float)",
        }}
      >
        <Avatar initials={initials} size="sm" seed={seed ?? initials} src={avatarSrc ?? undefined} />
      </button>
      {present && typeof document !== "undefined" && createPortal(
        <>
          <div
            aria-hidden
            className={cn("fixed inset-0 z-[60] bg-black/45 backdrop-blur-md", exiting && "m-float-out pointer-events-none")}
            onClick={exiting ? undefined : () => setOpen(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            /* Leaving: unclickable. A menu row still hittable through its own fade
               navigates somewhere the player just dismissed.
               ⛔ AND NOT `aria-hidden` — deliberately, unlike `<Modal>` and the bell
               panel, which set it. Those two RETURN FOCUS to their trigger in the same
               commit that closes them, so their ghost provably holds nothing focused.
               This menu has no focus-return, so Escape pressed while a row is focused
               would leave `aria-hidden` over the focused element — the `aria-hidden-focus`
               violation, bought for 90ms of tidiness. `pointer-events-none` gives the
               protection that actually matters here without it. */
            className={cn(
              "fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] sm:left-auto sm:right-4 sm:top-[64px] sm:w-[280px] sm:max-w-[calc(100vw-24px)] max-h-[calc(100dvh-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom)-72px)] sm:max-h-[calc(100dvh-100px)] overflow-y-auto overscroll-contain rounded-modal border border-border-strong bg-bg-elevated/85 backdrop-blur-xl shadow-overlay z-[61]",
              exiting ? "m-float-out pointer-events-none" : "m-float-in",
            )}
            // Anchored (kit law 1): the menu hangs off the RIGHT of the avatar, so it
            // grows from that corner, not `.m-float-in`'s default top-left — the same
            // note the bell panel and the AI toolkit carry over the identical shape.
            style={{ transformOrigin: "top right" }}
          >
            <div className="px-3.5 py-3 border-b border-border flex items-center gap-3">
              <Avatar initials={initials} size="md" seed={seed ?? initials} src={avatarSrc ?? undefined} />
              <div className="min-w-0">
                <p className="font-display text-[13.5px] font-semibold text-text truncate leading-tight">{name}</p>
                <p className="mt-0.5 font-mono text-caption text-text-subtle tabular-nums truncate">{phone}</p>
              </div>
            </div>
            <ul className="py-1">
              <Item href="/profile"        icon={I.profile}      en="Profile"        sw="Wasifu"                       zh="个人资料" />
              <Item href="/wallet"         icon={I.wallet}       en="Wallet"         sw="Pochi"                        zh="钱包" />
              <Item href="/profile/invite" icon={I.gift}         en="Invite & Earn"  sw="Alika na upate zawadi"        zh="邀请赚钱" accent />
              {/* Proposals: hidden entirely when DISABLED; otherwise the state
                  flag (gilt coming-soon / amber maintenance / none active). */}
              {proposalsState !== "DISABLED" && (
                <Item href="/proposals"    icon={I.sparkle}      en="Propose & earn" sw="Pendekeza na upate zawadi"    zh="提议赚钱" accent proposalsBadge={proposalsState} />
              )}
              <Item href="/positions"      icon={I.portfolio}    en="Positions"      sw="Nafasi"                       zh="持仓" />
              <Item href="/results"        icon={I.resolved}     en="Results"        sw="Matokeo"                      zh="结果" />
              <Item href="/leaderboard"    icon={I.crown}        en="Leaderboard"    sw="Jedwali la Washindi"          zh="排行榜" />
              <Item href="/profile/kyc"    icon={I.shieldcheck}  en="Verify ID"      sw="Kuthibitisha kitambulisho"    zh="身份验证" />
            </ul>
            {/* Staff console jump — admin-tier only. Gilt/gold treatment mirrors
                the admin confidential band so it reads unmistakably as "staff",
                clearly set apart from the player menu items above.

                ⛔ E-70 · A PLAIN <a>, ON PURPOSE — the mirror of the "Back to app" control in
                `admin-shell.tsx`, and it fixes the half nobody had explained. `AppShell` (the
                root layout) decides the player chrome from the `x-pathname` REQUEST HEADER, and
                a layout is NOT re-executed on a soft navigation. A <Link> here therefore kept
                the PLAYER layout and rendered the admin console inside player chrome — which is
                exactly session 21's unexplained observation, "/admin/updown served the
                signed-out player shell to a freshly signed-in ADMIN". Same root cause as Ali's
                missing navbar, mirrored. 🔒 `npm run test:shell-boundary`. */}
            {isAdmin && (
              <div className="border-t border-border px-2 py-2">
                <a
                  href="/admin"
                  role="menuitem"
                  className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-gold-500/10"
                  style={{ border: "1px solid color-mix(in oklab, var(--gold-400) 22%, transparent)", background: "color-mix(in oklab, var(--gold-500) 6%, transparent)" }}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gold-300" style={{ background: "color-mix(in oklab, var(--gold-500) 12%, transparent)" }}>
                    <I.shieldcheck s={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-body-sm font-semibold text-text leading-tight">{t.common.staffConsole}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-gold-300/80 leading-tight mt-0.5">Staff · Internal</span>
                  </span>
                  {/* ⛔ §M5 — "icons respond, they do not perform". This arrow carried
                      `transition-transform group-hover:translate-x-0.5`, i.e. a glyph moving
                      on HOVER, which the law names as the one trigger a glyph never takes
                      (mount, data change and state change are the three that are allowed).
                      The COLOUR response stays: hover is still answered, on the channel §M5
                      leaves open. */}
                  <I.arrowRight s={14} className="text-gold-300/70 transition-colors group-hover:text-gold-300" aria-hidden />
                </a>
              </div>
            )}
            {/* ⛔ THE DUPLICATE LANGUAGE PICKER IS GONE — batch 3, 2026-08-13.
                It existed only to cover two gaps in the header: the 3-pill capsule was hidden
                below 640 AND hidden again across 1024–1279, so this was the language control at
                those widths. The header now carries ONE 44×44 `EN ⌄` menu at EVERY width
                (`LanguageMenu`, kit §2), which is what closes both gaps — so keeping this would
                leave two controls for one decision, and the kit's rule is exactly "one language
                control is visible at every width, never two". The comment above it even claimed
                "exactly one is reachable", which was true only because of the two holes.
                ⚠️ If a future change re-hides the header control at some width, fix the HEADER;
                do not re-add a second picker here. */}
            {/* The Needle — opens the controls drawer (show/hide + Spin/Bounce). Lives
                here (not as an always-visible top-bar button) because the header already
                overflows at 1024–1279px; the avatar menu is the right home for it. */}
            <div className="border-t border-border px-2 py-2">
              <NeedleControlsDrawer variant="menu-row" />
            </div>
            <div className="border-t border-border">
              <ConfirmDialog
                tone="claret"
                title={t.profile.signOutConfirmTitle}
                body={<p>{t.profile.signOutConfirmBody}</p>}
                confirmLabel={t.profile.signOutConfirmYes}
                cancelLabel={t.profile.signOutConfirmNo}
                onConfirm={() => {
                  const f = document.createElement("form");
                  f.method = "POST";
                  f.action = "/auth/logout";
                  document.body.appendChild(f);
                  f.submit();
                }}
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 font-display text-body-sm font-semibold text-no-300 hover:bg-no-500/10 transition-colors text-left"
                  >
                    <I.logOut s={15} aria-hidden />
                    {t.common.signOut}
                  </button>
                }
              />
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function Item({ href, icon: Ico, en, sw, zh, accent, proposalsBadge }: { href: string; icon: (p: { s?: number; className?: string }) => React.ReactElement; en: string; sw: string; zh: string; accent?: boolean; proposalsBadge?: ProposalsState }) {
  const { t, locale } = useT();
  // System language only — no adjacent second-language gloss.
  const primary = locale === "sw" ? sw : locale === "zh" ? zh : en;
  return (
    <li>
      <Link
        href={href as never}
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2.5 font-display text-body-sm font-medium text-text transition-colors",
          accent ? "hover:bg-gold-500/10" : "hover:bg-bg-overlay",
        )}
      >
        <span className={accent ? "text-gold-300" : "text-text-subtle"}><Ico s={15} /></span>
        {primary}
        {proposalsBadge && (
          <ProposalsStateBadge state={proposalsBadge} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} size="xs" className="ml-auto" />
        )}
      </Link>
    </li>
  );
}
