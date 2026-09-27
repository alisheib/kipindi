"use client";

/**
 * Live ticker — a 32px strip carrying the platform's REAL recent settlements.
 *
 * ⛔ THE TYPE IS IMPORTED, NEVER RE-DECLARED. `TickerEvent` used to be declared here AND in
 * `ticker-feed.ts`, which is exactly how a `timeAgo` field that nothing rendered survived in
 * both copies. One declaration, in `lib/markets/ticker.ts` (B9 / §0a: two copies of one truth do
 * not stay equal). The TYPE still comes in with `import type`; `tickerShowsOn` is a deliberate VALUE
 * import (2026-09-26), which puts `lib/markets/ticker.ts` IN THE BROWSER BUNDLE. That is safe only
 * while that module imports nothing — `test:ticker-honesty` 11.14 now enforces it, so the feed module
 * (which reaches the store) can never be dragged in behind it.
 *
 * Kit tokens (bg-inset, border, live-400, mono) + horizontal scroll.
 *
 * ⭐ LOBBY ONLY, AND STOPPABLE (2026-09-26). It paints on the four browsing pages
 * (`TICKER_ROUTES` in `lib/markets/ticker.ts` — the decision and its reasons live there) and
 * nowhere near money, identity, limits or the bet screen. It carries a real pause control, which a
 * phone never had (D32 / WCAG 2.2.2: hover and focus were the only ways to stop it).
 * ⚠️ The page gate is CLIENT-SIDE ON PURPOSE. `AppShell` sits in the ROOT layout, and a layout is
 * not re-rendered on a soft navigation — a server-side pathname check would keep the strip on
 * /wallet after a tap from /markets, or keep it off /markets after a tap from /wallet.
 *
 * ⭐ STOPPED IS NOT "PAUSED" — IT IS THE READABLE LIST. Freezing the marquee mid-flight was D32's
 * defect all over again: behind a clipping box it leaves a fragment like "TZS 10K settled YES on",
 * with the other eleven events out of reach. So a stop turns the run into the same still, swipeable
 * list every calm gate gets (`[data-still]` in globals.css) — KEEPING what was in front of the
 * player where it was — and Play resumes the run from wherever they scrolled to. The same list is
 * what the SERVER paints, so the strip is readable before (and without) JavaScript. A HOLD (a resting
 * mouse, keyboard focus) stays a plain play-state pause: it lets go by itself, so it never needs to
 * be readable end to end.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Dot } from "@/components/ui/dot";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { sideWord } from "@/lib/side-label";
import { formatTzsCompact } from "@/lib/utils";
import type { TickerEvent } from "@/lib/markets/ticker";
import { tickerShowsOn } from "@/lib/markets/ticker";

/** This device's "I stopped it" — a per-viewer convenience, never state anyone else relies on. */
const STOPPED_KEY = "50pick-ticker-stopped";

type Verbs = { settled: string; on: string; voided: string };

/**
 * The side words, resolved once by `LiveTicker` and handed down.
 *
 * ⛔ This strip used to print `ev.side` — the stored enum — between two TRANSLATED
 * connectives, so the Chinese strip read "TZS 180K 已结算 YES 在 …" on every page of the
 * site. That is the SAME defect this file's header records having fixed for the market
 * TITLE, one field over: a localised sentence closing around an English token. The feed is
 * long-form only (`platform-stats.ts:103` filters to `productLine === "MARKET"`), which is
 * why "MARKET" is the honest vocabulary here rather than a guess.
 */
type Sides = { YES: string; NO: string };

function Items({ events, prefix, verbs, sides }: { events: TickerEvent[]; prefix: string; verbs: Verbs; sides: Sides }) {
  return (
    <>
      {events.map((ev) => (
        <span key={`${prefix}-${ev.id}`} className="inline-flex items-center gap-1.5 shrink-0 font-mono text-[12px] pr-8 whitespace-nowrap">
          {/* A VOID CARRIES NO FIGURE AND NO SIDE — we kept nothing and every stake was
              refunded, so there is no amount that describes what happened, and no winning
              side to name. Stated neutrally, never as an error: licence condition 4 / §C4,
              "the money came back". */}
          {ev.kind === "void" ? (
            <span className="text-text-muted">{verbs.voided}</span>
          ) : (
            <>
              {/* Absent rather than "TZS 0" when a settlement paid nothing — §C2 forbids a
                  zero standing in for an unknown, and a bare TZS 0 reads as a broken figure. */}
              {ev.amount !== undefined && <span className="text-text-muted">{formatTzsCompact(ev.amount)} </span>}
              <span className="text-text-muted">{verbs.settled} </span>
              <span className={`font-bold ${ev.side === "YES" ? "text-yes-400" : "text-no-400"}`}>{ev.side === "YES" ? sides.YES : sides.NO}</span>
            </>
          )}
          <span className="text-text-muted"> {verbs.on} {ev.title}</span>
          {/* Stage 9b — kit <Dot>. `color` rather than `tone="gold"`: the separator is
              gold-400, one stop lighter than the tone's gold-500, and a consolidation
              does not get to change a hue on the way past. */}
          <Dot color="var(--gold-400)" size={3} className="opacity-40 ml-2" />
        </span>
      ))}
    </>
  );
}

export function LiveTicker({ events }: { events: TickerEvent[] }) {
  const pathname = usePathname();
  /** HELD — a mouse resting on the strip, or keyboard focus inside it. Lets go by itself. */
  const [held, setHeld] = useState(false);
  /** STOPPED — the player's own choice, from the control or a tap on the strip. It sticks, across
   *  pages and reloads on this device, until they start it again. */
  const [stopped, setStopped] = useState(false);
  /** False until this browser has decided. Until then the strip is STILL: the server paints the
   *  readable list, which at scroll 0 is pixel-for-pixel the marquee's first frame, and it starts
   *  moving only once the client knows whether this device stopped it. So a remembered stop never
   *  flashes motion, and a browser without JavaScript gets a list it can swipe — not D32's frozen
   *  fragment. (A cookie would let the server know the choice, but a new cookie is a Privacy-notice
   *  change, which is the owner's call — see COMPLIANCE-DECISIONS.) */
  const [ready, setReady] = useState(false);
  /** Where the run picks up when it starts moving: a negative `animation-delay`, in seconds. */
  const [resumeAt, setResumeAt] = useState<string | undefined>(undefined);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  /** RUNNING → STILL: the list offset that keeps what was in front of the reader in front of them. */
  const carry = useRef<number | null>(null);
  /** STILL → RUNNING via Play: how far along the one-copy list the reader was, measured BEFORE the
   *  duplicate comes back (a browser that reset the offset on the mode switch would lose it after). */
  const resumeFrom = useRef<number | null>(null);
  /** Where a pointer went down on the run — a drag or a scroll is not a tap. */
  const press = useRef<{ x: number; scrollLeft: number } | null>(null);
  const { t } = useT();

  // Read after mount, never during render: the server cannot know this device's choice, so reading
  // it in render would paint the server's "running" and the client's "stopped" as a hydration mismatch.
  useEffect(() => {
    try { if (localStorage.getItem(STOPPED_KEY) === "1") setStopped(true); } catch { /* storage refused — it simply runs */ }
    setReady(true);
  }, []);

  const shown = events.length > 0 && tickerShowsOn(pathname);
  // 🔴 A HOLD MUST NOT OUTLIVE THE STRIP. This component lives in the ROOT layout, so its state
  // survives a soft navigation while its DOM does not — and neither pointerleave nor blur fires on a
  // node that is removed. A mouse resting on the strip when the player clicked through to /updown
  // would otherwise bring it back to /markets frozen, with its control claiming it was running.
  useEffect(() => { if (!shown) setHeld(false); }, [shown]);

  /** STILL = the readable list: before the client has decided, and whenever the player stopped it. */
  const still = !ready || stopped;

  // Runs after the DOM has switched modes, before paint: keep the reader's place across the switch.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    if (still) {
      if (carry.current !== null) vp.scrollLeft = carry.current;
      carry.current = null;
      return;
    }
    // STILL → RUNNING. 🔴 THE VIEWPORT KEEPS ITS SCROLL OFFSET ACROSS THE SWITCH — `overflow: hidden` is
    // still a scroll container — so it must be ZEROED here: while running, the transform alone carries
    // the position. Left in place, the run sat the offset TWICE along (item 8 instead of item 4) and
    // every later stop jumped back by it; the second review of 2026-09-26 caught that. The offset is
    // handed to the animation instead, as a negative delay. `resumeFrom` is Play's own measurement; a
    // swipe made before hydration (the list is swipeable from first paint) is read off the live box.
    const copy = track.offsetWidth / 2; // the duplicate is back: two copies
    const fraction = resumeFrom.current ?? (copy > 0 ? Math.min(1, vp.scrollLeft / copy) : 0);
    resumeFrom.current = null;
    vp.scrollLeft = 0;
    const seconds = parseFloat(getComputedStyle(track).animationDuration) || 0;
    setResumeAt(`${-(fraction * seconds)}s`);
  }, [still]);

  const verbs: Verbs = {
    settled: t.market.tickerSettled,
    on: t.market.tickerOn,
    voided: t.market.tickerVoided,
  };
  const sides: Sides = { YES: sideWord(t, "YES", "MARKET"), NO: sideWord(t, "NO", "MARKET") };

  // A platform with no settlements has no strip. ⛔ Not an empty rail, not a placeholder line —
  // A-5: nothing over a guess. And a page outside the lobby has no strip either (`TICKER_ROUTES`).
  if (!shown) return null;

  /** The explicit choice WINS over a hold: pressing Play while the mouse still rests on the strip
   *  must start it, not leave it frozen until the pointer happens to move away. */
  const toggle = () => {
    const next = !stopped;
    const track = trackRef.current;
    const vp = viewportRef.current;
    if (track && vp) {
      if (next) {
        // RUNNING → STOPPED: find what is in front of the reader now. The run is two copies and
        // `translateX(-50%)` travels exactly one, so the offset is taken modulo one copy's width —
        // and the stopped list is that one copy (the duplicate goes), scrolled to the same place.
        // Any residual scroll on the running box is counted too (find-in-page can scroll it).
        const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(track).transform);
        const tx = m ? parseFloat(m[1].split(",")[4]) || 0 : 0;
        const copy = track.offsetWidth / 2;
        let at = copy > 0 ? (((vp.scrollLeft - tx) % copy) + copy) % copy : 0;
        // THE LOOP'S SEAM. In the last stretch of each loop the window shows the END of the last event
        // and the START of the first. The list is one copy and cannot show both — the browser would
        // clamp to the end and silently drop event 1 — so keep whichever holds more of the window.
        const w = vp.clientWidth;
        if (at + w > copy && at + w - copy > copy - at) at = 0;
        carry.current = at;
      } else {
        // STOPPED → RUNNING: start the run from wherever they scrolled to, not from the beginning.
        // Measured now, while the list is still one copy; the layout effect zeroes the box after.
        const copy = track.offsetWidth;
        resumeFrom.current = copy > 0 ? Math.min(1, vp.scrollLeft / copy) : 0;
      }
    }
    setHeld(false);
    setStopped(next);
    try {
      if (next) localStorage.setItem(STOPPED_KEY, "1");
      else localStorage.removeItem(STOPPED_KEY);
    } catch { /* not remembered on this device — the choice still holds for this visit */ }
  };

  return (
    <div
      /* 🔴 D32 · THE STRIP HAD NO ACCESSIBLE NAME. It carries real settlement figures and market
         questions, and a screen-reader user met it as an unlabelled run of text with no way to tell what
         it was or to skip it. A named region is also a landmark a reader can jump over. */
      role="region"
      aria-label={t.common.liveTickerLabel}
      className="ticker-strip"
      /* The STILL mode is a stylesheet mode, like the calm gates it borrows from — so the two can never
         disagree about what a still strip looks like. Set before the client decides and by the
         player's stop; never by a hold. */
      data-still={still ? "" : undefined}
      /* A MOUSE resting on the strip holds it. ⛔ `pointerType === "mouse"` and not `onMouseEnter`:
         a phone fires an EMULATED mouseenter on every tap and no mouseleave until the next tap
         somewhere else, so a touch would have "held" the strip on top of the toggle it had just
         pressed — the tap and the hold fighting over one state. Touch stops it through `toggle`. */
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHeld(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHeld(false); }}
      /* Pauses for the KEYBOARD too, not only the mouse. The run holds real settlement figures
         and market questions; a strip a keyboard user can never stop is content they cannot
         read. `:focus-within` is the kit's own answer and costs nothing. */
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      style={{
        height: 32,
        background: "var(--bg-inset)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Fixed LIVE label.
          IN FLOW (flex item), not absolutely positioned over the track. It used to
          be absolute with the track carrying a hardcoded paddingLeft: 80 — but the
          label's width is LOCALE-DEPENDENT ("LIVE" / "MUBASHARA" / "直播"), so no
          single padding can clear it. In Swahili the marquee visibly scrolled
          underneath the label. Flex makes the track start wherever the label
          actually ends, in every locale, with no measurement. The gradient is now
          solid across the label and fades only in its trailing padding, so nothing
          is ever legible beneath the text. */}
      <div style={{
        flex: "0 0 auto", zIndex: 10,
        display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 24,
        background: "linear-gradient(90deg, var(--bg-inset) 0%, var(--bg-inset) 70%, oklch(11% 0.11 268 / 0) 100%)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {/* Stage 9b — kit <Dot pulse>, which IS `.live-dot`: same 6px, same
              `--live-400`, same 2600ms breathe, and the same gating at all three
              reduced-motion tiers. */}
          <Dot tone="live" size={6} pulse />
          <span className="font-mono text-micro font-semibold uppercase tracking-[0.1em] text-[var(--live-400)]">
            {t.common.live}
          </span>
        </span>
      </div>

      {/* VIEWPORT — the clipping box. .ticker-track is the ANIMATED element
          (inline-flex, flex-shrink:0, translateX(-50%)), so it must stay free to
          overflow and translate; clipping has to happen on a wrapper, not on the
          track itself. Without this box the marquee rendered straight across the
          LIVE label and ate the first characters — in Swahili "MUBASHARA" and
          "TZS" collided into "MUBASHARAZS". The container's own overflow:hidden
          does not help: it clips at the window edge, not at the label.

          `paddingLeft` is 8px of air between the LIVE label's trailing fade and item 1 AT
          REST — the state a reduced-motion reader sees permanently, and the first frame
          everyone else sees. ⚠️ It is NOT a clip fix, and this comment claimed it was for one
          revision: that reading came from a probe measuring the marquee MID-FLIGHT, where
          item 1 sitting left of its container is simply what a marquee does. Re-measured at
          rest with the product's own calm branch applied (computed `transform: none`), item 1
          begins 8px INSIDE the viewport in en, sw and zh. Corrected here rather than quietly
          deleted, because a comment claiming a fix for a defect that was really the
          instrument's is how the next reader "protects" behaviour nothing ever needed. */}
      {/* ⛔ `overflow` LIVES IN THE STYLESHEET NOW, NOT HERE. An inline style beats any rule, and the
          reduced-motion branch has to be able to turn this box into a scroller — see `.ticker-viewport`
          in globals.css. Everything else stays inline because it is layout this component owns. */}
      {/* ⭐ A TAP ANYWHERE ON THE RUN STOPS IT, OR STARTS IT AGAIN. The strip is 32px tall and the
          platform's finger floor is 40 (`--tap-min`, Law 9), so the control at the end cannot reach the
          floor inside the strip — but the whole run can, being the full width. This is the phone's way
          to stop it; the button is the NAMED way, for a keyboard and a screen reader, and both call the
          one `toggle`. ⛔ Nothing inside the run is interactive (settlements are text, never links),
          so a tap here can never be stolen from something else.
          ⚠️ Under a CALM GATE a tap must do nothing — the run is a still scroller there anyway, and
          flipping a remembered "stopped" would silently change the strip on the day the player turns
          motion back on. The test is the control's own visibility: the stylesheet hides it under
          exactly the calm gates and no other time, so this reads ONE truth instead of re-listing four
          gates in JavaScript. (A STOPPED strip is still for another reason, and a tap there resumes.) */}
      <div
        ref={viewportRef}
        className="ticker-viewport"
        onPointerDown={(e) => { press.current = { x: e.clientX, scrollLeft: e.currentTarget.scrollLeft }; }}
        onClick={(e) => {
          const control = controlRef.current;
          if (control && getComputedStyle(control).display === "none") return;
          // A DRAG OR A SCROLL IS NOT A TAP. On the stopped list a mouse press-and-release still fires
          // `click`, so a player dragging to read would restart the run under their pointer. Touch
          // swipes never fire it; this catches the mouse, the scrollbar and any scroll in between.
          const p = press.current;
          press.current = null;
          if (p && (Math.abs(e.clientX - p.x) > 6 || e.currentTarget.scrollLeft !== p.scrollLeft)) return;
          toggle();
        }}
        style={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "center", paddingLeft: 8 }}
      >
        <div
          ref={trackRef}
          className="ticker-track"
          style={{ animationPlayState: held ? "paused" : "running", animationDelay: resumeAt }}
        >
          <Items events={events} prefix="a" verbs={verbs} sides={sides} />
          {/* 🔴 D32 · THE SECOND COPY IS SCENERY, AND IT WAS BEING READ ALOUD. It exists only so the
              marquee can loop seamlessly — `translateX(-50%)` lands copy b exactly where copy a began —
              so a screen reader was reading all twelve settlements TWICE, as if they were 24 events.
              `aria-hidden` on a `display: contents` wrapper removes it from the tree without moving a
              single pixel: the spans stay direct flex children of the track. */}
          <span className="ticker-copy-dup" aria-hidden>
            <Items events={events} prefix="b" verbs={verbs} sides={sides} />
          </span>
        </div>
      </div>

      {/* END CAP — the right fade AND the pause control, as one flex item.
          It used to be an absolutely-positioned 48px fade, which would have painted OVER a control
          placed at the edge. As a flex item with `-40px` of margin it overlaps the run's last 40px
          (that overlap IS the fade) and then takes 40px of its own for the button, which sits on
          solid ground. Under every calm tier the button is `display: none`, and what remains is a
          40px fade over a still, swipeable run — the old fade, less 8px.
          `pointer-events: none` on the cap so the fade never eats a tap meant for the run; the
          button turns them back on for itself. */}
      <div style={{
        flex: "0 0 auto", zIndex: 10, marginLeft: -40, paddingLeft: 40, pointerEvents: "none",
        display: "flex", alignItems: "stretch",
        background: "linear-gradient(270deg, var(--bg-inset) 0%, var(--bg-inset) 50%, oklch(11% 0.11 268 / 0) 100%)",
      }}>
        {/* ⛔ ONE LABEL, AND `aria-pressed` CARRIES THE STATE. A toggle whose name flips between
            "Pause" and "Play" AND reports pressed tells a screen reader two contradictory things
            at once; a fixed name with a pressed state is the pattern. The glyph is what changes. */}
        <button
          ref={controlRef}
          type="button"
          className="ticker-pause"
          aria-pressed={stopped}
          aria-label={t.common.liveTickerPause}
          onClick={toggle}
          /* Invisible (and out of the tab order) until the client is ready: a control that cannot
             work yet — or at all, without JavaScript — must not be offered. `visibility`, not
             `display`, so the strip's layout does not shift when it arrives. */
          style={{ pointerEvents: "auto", visibility: ready ? undefined : "hidden" }}
        >
          {stopped ? <I.playBare s={14} /> : <I.pause s={14} />}
        </button>
      </div>
    </div>
  );
}
