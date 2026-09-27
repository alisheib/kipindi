"use client";

/**
 * UnsavedChangesGuard — DG-S-04 (DESIGN-GATE-2026-08-28 step 5), §K rule 7d.
 *
 * ⭐ Ali's commission read "of course keep applying the unsaved-changes detection per page
 * professionally". ⛔ IT IS A BUILD, NOT A CONTINUATION, and that was re-derived rather than
 * assumed: `grep -rn beforeunload src/` returns ZERO, and the four `dirty` booleans that exist
 * (`payout-status-control.tsx:77`, `proposal-actions.tsx:310`, `updown-controls.tsx:1059`,
 * `password-pair.tsx:22`) only disable their own Save button. Nothing anywhere has ever stopped
 * an operator leaving a half-typed form. §K5: it lands ONCE, in the kit, not per page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔ A FORM HAS THREE EXITS, AND A GUARD THAT COVERS ONE IS NOT A GUARD.
 *
 * ① THE TAB CLOSES or the page reloads → `beforeunload`. The browser owns this dialog; its
 *   text cannot be set (every engine ignores the string and shows its own) and it only fires
 *   after a real user gesture on the page. ⚠️ So it is a backstop, never the primary answer.
 * ② AN IN-APP LINK is followed — including a SECTION-RAIL TAB, which §K rule 7d names
 *   explicitly: "a tab switch is an EXIT. A page whose tabs unmount their panels must treat the
 *   switch as it treats an unload." A `?tab=` option is an `<a href>`, so it is exactly case ②
 *   and needs no separate handling. That is the payoff of DG-S-03 putting tab state in the URL.
 * ③ THE BROWSER BACK BUTTON → `popstate`. ⚠️ STILL NOT PROMPTED, and it is named here rather
 *   than left for someone to discover: App Router gives no cancellable navigation event, and the
 *   `history.pushState` trick that fakes one corrupts the history stack in ways that are worse
 *   than the problem. ⛔ A guard that silently misses an exit is the shape this programme keeps
 *   paying for, so the miss is written down instead of implied.
 *   ⭐ WHAT ANSWERS IT IS `useFormDraft` AT THE FOOT OF THIS FILE (2026-09-21), and it answers
 *   more than Back. Exits ① and ② are doors this module can stand at; ③ is not, and neither is a
 *   browser that crashes, a laptop that sleeps and never wakes, a session that expires, or the
 *   power going — none of which any listener anywhere can intercept. A prompt is a question asked
 *   at one door. A draft is the work still being there whichever door was used, including the
 *   ones with no door at all. ⛔ It is opt-in per form, because it is the caller that knows
 *   whether its values are safe to offer back (see the hook's own version rule).
 *
 * ⛔ AND THE PROMPT IS THE KIT MODAL, NOT `window.confirm`. §B10 — the system is complete and
 * frozen; a native confirm is a second dialog language, unstyleable, and it cannot carry the
 * §A3 focus ring or the kit's motion rungs.
 *
 * ⚠️ THE CLICK IS INTERCEPTED IN THE CAPTURE PHASE, on purpose: `next/link` attaches its own
 * bubble-phase handler, so a bubble-phase guard runs AFTER the router has already been told to
 * go. Capture is the only phase where `preventDefault()` still stops the navigation.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/modal";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";

/**
 * Install the guard. `dirty` is the caller's own answer to "would leaving lose work?" — the
 * kit does not guess it, because only the form knows what its saved state was.
 */
/**
 * `PendingChangesBar` — the PROACTIVE half of unsaved-change tracking.
 *                                                    (ADMIN-TABS-2026-09-01, §K rule 7d)
 *
 * ⭐ WHY A BAR AND NOT ONLY A DIALOG. `UnsavedChangesGuard` is REACTIVE: it speaks only once
 * the operator is already leaving, and its answer is a question. A console page that is now a
 * SECTION RAIL makes that worse — an officer edits on one tab, switches to another, and the
 * only thing that ever mentioned the edit is a modal they must read under time pressure. A
 * persistent bar states the condition continuously and puts Save and Discard in reach, so the
 * dialog becomes the backstop it was always meant to be rather than the whole mechanism.
 *
 * ⛔ IT INTRODUCES NO NEW DESIGN. Every part is a surface this platform already paints, which
 * is §B9/§B10 — the system is complete; new design MERGES IN, it never sits beside:
 *   · the surface is `.kp-rail` — the SAME recipe the player's bottom navigation uses
 *     (`globals.css:4730`): `--panel`, a top border, `--shadow-overlay-up`, and the
 *     `env(safe-area-inset-bottom)` padding that keeps it off an iOS home indicator;
 *   · the motion is `.kp-rise`, an EXISTING registered keyframe (`test:keyframes` rule 1.1
 *     forbids a second name for a motion that already exists) — and it is already listed in
 *     the reduced-motion block at `globals.css:2728`, so §M6 is satisfied without a new rule;
 *   · the rung is `z-nav` (40), which already paints. It sits BELOW `menu`, `drawer` and
 *     `modal`, so a dialog — including this file's own confirm — always covers it, and an
 *     officer can never be asked to answer a question they cannot see;
 *   · the tone is `--warning-*`, the APP-STATE caution family. ⛔ Never the betting ramp: an
 *     unsaved form is not a losing bet (§B2a).
 *
 * ⚠️ IT RESERVES ITS OWN SPACE. A `position: fixed` bar covers whatever is under it, and the
 * admin body reserves no bottom padding — so the last card on a 4,000px page would sit beneath
 * it, which is exactly the "rendered is not visible" defect this lineage keeps paying for. The
 * spacer below is a sibling in the page flow and is why the bar can never hide content.
 */
type BarProps = {
  dirty: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saving?: boolean;
  label?: string;
  detail?: React.ReactNode;
  saveLabel?: string;
  discardLabel?: string;
  /**
   * ⭐ THE FORM'S OWN SAVE BUTTON — pass it and the bar STOPS DRAWING A SECOND ONE whenever that
   * button is on screen (owner, 2026-09-22: *"we have 2 save buttons, one pending changes and one
   * always there, I don't know when should both be visible"*).
   *
   * ⛔ THE ANSWER IS "NEVER BOTH", AND THE RULE FALLS OUT OF WHAT THE BAR IS FOR. The bar exists
   * because a form can be taller than the viewport, so the form's own Save may be scrolled out of
   * reach — the bar's Save is a SHORTCUT TO A BUTTON YOU CANNOT SEE. The moment you can see it, the
   * shortcut is a duplicate: two identical primary buttons, 40px apart, and an officer having to
   * work out whether they differ. They never did.
   * ⚠️ WHAT THE BAR KEEPS IN BOTH STATES is the part that is never redundant — that there ARE
   * unsaved changes, and Discard. Only the Save is conditional.
   * ⛔ OPTIONAL, AND ITS ABSENCE IS THE OLD BEHAVIOUR. A caller that passes nothing keeps its Save,
   * so this cannot silently remove the only Save from a form that has no inline one.
   */
  saveAnchor?: React.RefObject<HTMLElement | null>;
  /**
   * ⭐ WHAT THE BAR SAYS FOR A MOMENT AFTER A SAVE LANDS (owner, 2026-09-26: *"users are confused
   * whether the save worked or not"*). Default "Saved"; a form whose save is an addition names it
   * ("Staff added"). `false` turns it off.
   * ⛔ IT CAN ONLY FOLLOW A SAVE THAT LANDED, judged when `saving` falls, never when the form goes
   * clean: the bar was dirty when the save began and offered a Save, nothing was edited meanwhile,
   * and the form is clean at the end (or goes clean moments later, as refreshed props arrive). A
   * refusal stays dirty and Discard never sets `saving`, so neither can print it — a "Saved" that is
   * sometimes a lie is worse than none.
   */
  savedLabel?: string | false;
};

/**
 * ⛔ THE BAR IS A SINGLETON, AND IT HAD TO BECOME ONE — TWO OF THEM PAINT IN THE SAME PIXELS.
 *
 * Every instance is `fixed inset-x-0 bottom-0`, so two dirty forms on one page render two bars
 * ON TOP OF EACH OTHER, and both write `document.body.style.paddingBottom` — last effect wins,
 * so the page reserves the height of ONE bar while TWO are painted and the lower one covers the
 * content the reserve was supposed to protect. That is the same "rendered is not visible" defect
 * the reserve exists to prevent, reintroduced by the fix for it.
 *
 * ⚠️ IT IS REACHABLE, NOT THEORETICAL. `/admin/ai-usage` renders `AiOpsControls` and
 * `CreditControls` side by side; `/admin/bonuses` renders the config panel and the grant form.
 * Editing the model and the spend limit before saving either is an ordinary morning.
 *
 * ⭐ NO HOST COMPONENT IN THE LAYOUT. A `<PendingChangesHost>` would be a second thing every
 * page must remember to render, and a page that forgot would lose its bar silently. Instead the
 * registered instance with the LOWEST id paints — a deterministic single painter, chosen without
 * anyone having to install anything — and it paints the entry that was dirtied MOST RECENTLY,
 * which is the form the officer just touched. The others are counted, not hidden: nothing is
 * lost either way, because each instance still renders its own `UnsavedChangesGuard`.
 */
type Entry = { id: number; seq: number; props: React.RefObject<BarProps> };
const registry = new Map<number, Entry>();
const listeners = new Set<() => void>();
let nextBarId = 1;
let dirtySeq = 0;
let registryVersion = 0;
const bumpRegistry = () => { registryVersion++; for (const l of listeners) l(); };
const subscribeRegistry = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/* ⚠️ SSR returns a CONSTANT. `useSyncExternalStore` calls the server snapshot during hydration
   and React throws if it is not stable; the registry is empty on the server anyway. */
const getRegistryVersion = () => registryVersion;
const getServerVersion = () => 0;

/**
 * ⭐ THE "SAVED" STATE HAS ONE HOME, BESIDE THE REGISTRY — the same singleton rule as the bar. It is
 * painted by the SAME element that said "Unsaved changes", so the change lands in the live region
 * the officer's screen reader is already listening to, and the rise motion does not replay.
 * ⚠️ `token` keys the dwell timer: a newer save, an edit or an unmount replaces or clears the slot,
 * and the older timer then finds a different token and does nothing.
 */
type SavedState = { id: number; text: string; token: number };
let saved: SavedState | null = null;
let savedToken = 0;
const SAVED_DWELL_MS = 2_500;
const setSaved = (next: SavedState | null) => { saved = next; bumpRegistry(); };

/**
 * ⚠️ EDITS ARE COUNTED PAGE-WIDE, so a save cycle can tell whether the officer touched anything while it
 * ran. TRUSTED events only: a form that resets itself or replays `input` after its save is not an edit.
 * A click counts because a custom toggle and the bar's own Discard change a form without any `input`.
 */
let editEpoch = 0;
let editWatchers = 0;
const EDIT_EVENTS = ["input", "change", "click"] as const;
const noteEdit = (e: Event) => { if (e.isTrusted) editEpoch++; };
const watchEdits = () => {
  if (editWatchers++ === 0) for (const t of EDIT_EVENTS) document.addEventListener(t, noteEdit, true);
  return () => {
    if (--editWatchers === 0) for (const t of EDIT_EVENTS) document.removeEventListener(t, noteEdit, true);
  };
};
/* How long after `saving` falls a form that is still dirty may go clean and count as that save landing. */
const LANDING_MS = 1_500;

/**
 * ⭐ THE SAVE-CYCLE DECISION, AS A PURE FUNCTION — no React, no DOM, no clock of its own. The bar's layout
 * effect feeds it one commit at a time and does what the verdict says, so the rules below are exactly
 * what `npm run test:save-cycle` drives, scenario by scenario; the component keeps no private copy.
 *
 * `prev` is what the bar remembered after its last commit (`null` on the first). `next` is this commit:
 * the flags, whether a Save is offered, the "Saved" words (`false` = off), the page-wide trusted-edit
 * count and the time. The verdict says what THIS bar shows:
 *   · "dirty" — unsaved work: register the entry (and end this bar's "Saved", if it is showing);
 *   · "hold"  — clean, but its save is still running and may yet land: keep the entry, spinner and all;
 *   · "saved" — the save landed: fill the slot with `text` and let the entry go;
 *   · "none"  — nothing to show from this form.
 *
 * ⛔ "saved" IS DECIDED WHEN `saving` FALLS, never at the clean. It needs all of: the form was dirty when
 * `saving` rose, a Save was offered then, no trusted edit since, and the form clean at the fall — or
 * clean within `LANDING_MS` after it, with no edit in between (refreshed props arriving late).
 */
export type SaveCycle = {
  dirty: boolean;
  saving: boolean;
  /** Remembered from the commit where `saving` rose. */
  startedDirty: boolean;
  offered: boolean;
  edits: number;
  /** Open after a save that ended still dirty: a clean until then is that save landing. 0 = closed. */
  landUntil: number;
};
export type SaveCommit = {
  dirty: boolean;
  saving: boolean;
  hasSave: boolean;
  savedLabel: string | false;
  editEpoch: number;
  now: number;
};
export type SaveVerdict =
  | { cycle: SaveCycle; show: "dirty" | "hold" | "none" }
  | { cycle: SaveCycle; show: "saved"; text: string };

export function decideSaveCycle(prev: SaveCycle | null, next: SaveCommit): SaveVerdict {
  const { dirty, saving, hasSave, savedLabel, editEpoch, now } = next;
  const p: SaveCycle = prev ?? { dirty, saving, startedDirty: false, offered: false, edits: 0, landUntil: 0 };
  const rose = saving && !p.saving;
  const fell = !saving && p.saving;
  const cycle: SaveCycle = rose
    ? { dirty, saving, startedDirty: dirty, offered: hasSave, edits: editEpoch, landUntil: 0 }
    : { ...p, dirty, saving };
  const untouched = cycle.startedDirty && cycle.offered && editEpoch === cycle.edits;
  let landed = false;
  if (fell) {
    landed = untouched && !dirty;
    cycle.landUntil = untouched && dirty ? now + LANDING_MS : 0;
  } else if (!saving && !dirty && p.dirty) {
    landed = untouched && cycle.landUntil > 0 && now <= cycle.landUntil;
    cycle.landUntil = 0;
  }
  if (landed && savedLabel !== false) return { cycle, show: "saved", text: savedLabel };
  if (dirty) return { cycle, show: "dirty" };
  return { cycle, show: saving && untouched ? "hold" : "none" };
}

export function PendingChangesBar(props: BarProps) {
  const {
    dirty,
    onSave,
    onDiscard,
    saving = false,
    label = "Unsaved changes",
    detail,
    saveLabel = "Save changes",
    discardLabel = "Discard",
    savedLabel = "Saved",
  } = props;
  /* ⛔ SSR: `createPortal` needs a DOM. Mount-gate it so the server renders the SPACER only —
     which is right, because the spacer belongs to the page and the bar belongs to the window. */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  /* A stable identity per instance. `useRef` rather than `useId` because the painter is elected
     by numeric order and ids must be comparable. */
  const idRef = React.useRef(0);
  if (idRef.current === 0) idRef.current = nextBarId++;
  const id = idRef.current;

  /**
   * ⚠️ THE PROPS GO IN A REF, AND THE REGISTRY HOLDS THE REF — NOT A COPY. `onSave` and
   * `onDiscard` are inline arrows at nearly every call site, so a new identity arrives on every
   * render. Registering the VALUES would mean an effect that re-runs each render, notifies the
   * painter, re-renders it, produces new arrows, and re-runs the effect: an infinite loop. The
   * painter therefore reads `entry.props.current`, which is always this render's props, and the
   * registration effect depends only on the flags it decides from, never on the callbacks.
   */
  const propsRef = React.useRef<BarProps>(props);
  propsRef.current = props;

  /**
   * ⭐ "SAVED" — JUDGED WHEN THE SAVE ENDS, NEVER WHEN THE FORM GOES CLEAN (see `savedLabel`).
   * 🔴 It used to be decided at the clean, so an officer who typed the old values back mid-save got
   * "Saved" before the result — and, if the save then failed, beside its own "Couldn't save". Each
   * cycle is now remembered from the commit where `saving` rises (was the bar dirty, did it offer a
   * Save, the edit count) and judged in the commit where it falls.
   * ⚠️ A form that marks itself clean before its transition ends is HELD: the entry stays registered,
   * spinner and all, until the result — so the bar never vanishes and comes back as "Saved".
   * ⚠️ A form that goes clean when refreshed props arrive may do so just after `saving` falls. A save
   * that ends still dirty therefore leaves a `LANDING_MS` window: the next clean inside it, with no
   * edit in between, is that save landing. A refusal never goes clean by itself; Discard is a click.
   * ⭐ THE RULES LIVE IN `decideSaveCycle` ABOVE, and this effect only carries out its verdict — so the
   * function `test:save-cycle` drives is the one that ships.
   * ⛔ ONE EFFECT DECIDES THE SLOT AND THE REGISTRY, so the slot is filled before the entry leaves and
   * no render sees "nothing to paint" — that render would unmount the bar, and a "Saved" arriving in a
   * fresh element is one nobody is announced. A layout effect, so the frame between is never painted.
   */
  const hasSave = !!onSave;
  const cycle = React.useRef<SaveCycle | null>(null);
  React.useEffect(() => watchEdits(), []);
  React.useLayoutEffect(() => {
    const wasDirty = cycle.current?.dirty ?? dirty;
    const verdict = decideSaveCycle(cycle.current, { dirty, saving, hasSave, savedLabel, editEpoch, now: Date.now() });
    cycle.current = verdict.cycle;

    let changed = false;
    if (verdict.show === "saved") {
      const token = ++savedToken;
      saved = { id, text: verdict.text, token };
      changed = true;
      setTimeout(() => { if (saved?.token === token) setSaved(null); }, SAVED_DWELL_MS);
    } else if (verdict.show === "dirty" && saved?.id === id) {
      saved = null; // editing again ends it
      changed = true;
    }
    if (verdict.show === "dirty" || verdict.show === "hold") {
      const entry = registry.get(id);
      if (!entry) registry.set(id, { id, seq: ++dirtySeq, props: propsRef });
      else if (dirty && !wasDirty) entry.seq = ++dirtySeq; // dirtied again while held: newest again
      changed = changed || !entry || (dirty && !wasDirty);
    } else if (registry.delete(id)) {
      changed = true;
    }
    if (changed) bumpRegistry();
  }, [dirty, saving, hasSave, savedLabel, id]);
  /* A bar that is gone cannot say anything — a form that navigates away on success relies on its toast. */
  React.useEffect(() => () => {
    registry.delete(id);
    if (saved?.id === id) saved = null;
    bumpRegistry();
  }, [id]);

  /* `saving` and `label` are read off the ref, so a change to either would otherwise never
     reach the painter. This nudges it without re-registering (and without touching `seq`, which
     would make a spinner steal the bar from the form the officer just edited). */
  React.useEffect(() => { if (registry.has(id)) bumpRegistry(); }, [id, saving, label]);

  const version = React.useSyncExternalStore(subscribeRegistry, getRegistryVersion, getServerVersion);
  void version; // the subscription is the point; the registry below is the actual read

  const entries = [...registry.values()];
  /* ⭐ ONE ELEMENT, THREE STATES: unsaved work anywhere on the page wins over "Saved", which wins over
     nothing. In "saved" the painter is the bar that saved — the one that was already on screen. */
  const savedNow = saved;
  const mode: "dirty" | "saved" | null = entries.length ? "dirty" : savedNow ? "saved" : null;
  const painterId = mode === "dirty" ? Math.min(...entries.map((e) => e.id)) : (savedNow?.id ?? 0);
  const top = entries.length ? entries.reduce((a, b) => (b.seq > a.seq ? b : a)) : null;

  /**
   * ⛔ IS THE FORM'S OWN SAVE ON SCREEN? (see `saveAnchor`). While it is, this bar draws no Save.
   *
   * ⚠️ IT WATCHES THE PAINTED ENTRY'S ANCHOR, NOT THIS INSTANCE'S. The bar is a singleton: what it
   * shows belongs to whichever form was dirtied last, which may be a different instance. Observing
   * this instance's own anchor would hide the Save on the strength of a button belonging to a form
   * nobody is looking at.
   * ⚠️ AND IT FAILS TOWARDS SHOWING THE SAVE. No anchor, no `IntersectionObserver`, an anchor not
   * yet mounted — every one of those leaves `anchorOnScreen` false and the bar keeps its Save. A
   * bug here must never be able to remove the only way to save a form.
   */
  const shownAnchorEl = top?.props.current.saveAnchor?.current ?? null;
  const [anchorOnScreen, setAnchorOnScreen] = React.useState(false);
  /* The bar's measured height — set by the reserve effect below, read here to cut the bar's own band
     out of what counts as "on screen". */
  const [reservePx, setReservePx] = React.useState(0);
  React.useEffect(() => {
    if (!shownAnchorEl || typeof IntersectionObserver === "undefined") {
      setAnchorOnScreen(false);
      return undefined;
    }
    /**
     * ⚠️ A high threshold on purpose: a Save button one pixel into view is not "in reach", and a low
     * threshold makes the bar's button flicker on and off as the page settles.
     * 🔴 AND THE THRESHOLD ALONE NEVER ENFORCED IT (2026-09-26). `isIntersecting` is true for ANY
     * overlap, and the observer reports on every crossing — so the old test read a button with one
     * pixel left in view as on screen, and the bar kept its Save hidden until the button was gone.
     * The RATIO is the test, read off the LAST record, which is the current state.
     * 🔴 AND THE BAR'S OWN BAND IS NOT SCREEN. The root was the whole viewport, so a form Save sitting
     * BEHIND the bar counted as visible and the bar hid its Save — no Save anywhere. The bottom margin
     * takes the measured bar height off the root, and the observer is rebuilt when that height moves.
     */
    const io = new IntersectionObserver(
      (records) => {
        const r = records[records.length - 1];
        setAnchorOnScreen(!!r && r.isIntersecting && r.intersectionRatio >= 0.75);
      },
      { threshold: 0.75, rootMargin: `0px 0px -${reservePx}px 0px` },
    );
    io.observe(shownAnchorEl);
    return () => io.disconnect();
  }, [shownAnchorEl, reservePx]);

  /**
   * ⚠️ THE PAGE RESERVES THE BAR'S MEASURED HEIGHT, AND BOTH HALVES OF THAT WERE LEARNED THE
   * HARD WAY BY `qa:pending-bar` DRIVING PRODUCTION.
   *
   * ① WHERE. An in-flow sibling spacer reserves space where THIS COMPONENT sits. Rendered
   *   mid-form, that leaves the page's LAST card still running under the bar — measured at 49px
   *   of overlap on 1440 and **102px on 390**. A kit primitive cannot require its callers to
   *   render it last, so the reserve goes on the SCROLL CONTAINER instead, the same way the
   *   kit's modal owns the scroll lock. Cleared on unmount, always.
   * ② HOW MUCH. `--h-pending-bar` is the bar's MINIMUM, not its height: at 390 the row wraps —
   *   label, detail and two buttons do not fit on one line — so a constant would under-reserve
   *   at exactly the width where the overlap is worst. The height is READ from the rendered
   *   element and re-read whenever it changes.
   */
  const barRef = React.useRef<HTMLDivElement>(null);
  /* `mode` is a dependency so the reserve holds through the "Saved" dwell and clears when it ends. */
  React.useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.body.style.paddingBottom = `${h}px`;
      setReservePx(h);
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [mounted, dirty, painterId, id, mode]);

  /* ⛔ EXACTLY ONE INSTANCE PAINTS. Everything above still runs in every instance — each one
     registers, so the count is right and the reserve follows whichever instance is painting.
     ⚠️ Not gated on this instance's own `dirty`: a held save is clean while it still paints, and in
     the one render between a save and the registry catching up, that gate would unmount the bar and
     remount it for "Saved" (see the save-cycle effect). */
  if (mode === null || id !== painterId) return null;

  /* The entry the officer touched last, which may belong to a DIFFERENT instance than this one.
     Reading it through the ref is what keeps an inline `onSave` correct. None in "saved". */
  const shown = top?.props.current;
  const shownLabel = shown?.label ?? "Unsaved changes";
  const shownDetail = shown?.detail;
  const shownSaving = shown?.saving ?? false;
  const shownSaveLabel = shown?.saveLabel ?? "Save changes";
  const shownDiscardLabel = shown?.discardLabel ?? "Discard";
  const shownSave = shown?.onSave;
  const shownDiscard = shown?.onDiscard;
  /* Only entries with unsaved work count: a HELD entry is clean (its save is still running), and
     counting it would announce "+1 more unsaved change" for a form that has nothing unsaved. */
  const others = entries.filter((e) => e !== top && e.props.current.dirty).length;

  /**
   * 🔴 IT PORTALS, AND THAT IS NOT OPTIONAL — `test:stacking` §5 names the mechanism.
   * `.route-enter` is `animation: m-settle-in … both`, and a `both` fill keeps the final
   * keyframe's `transform` applied FOR EVER. A transformed element is the containing block for
   * every `position: fixed` descendant, so a bar rendered from a route file anchors to the
   * page-transition wrapper instead of the window — it would sit at the bottom of the PAGE,
   * scrolling away, on a console page that is 4,000px tall. That is the "rendered is not
   * visible" defect, and no screenshot of the top of the page would show it.
   * ⚠️ §5.2's sweep did NOT catch this: its predicate is `fixed` + `inset-0`, i.e. a
   * FULL-VIEWPORT overlay, and this bar is edge-anchored (`inset-x-0 bottom-0`). The gate was
   * one level too shallow for this shape and has been widened in the same commit — but the
   * portal is the fix, not the gate.
   */
  const bar = (
    <div
        ref={barRef}
        /* ⭐ `status` + `polite`, not `alert`: the condition is important and is NOT an
           emergency, and an assertive live region would interrupt whatever the officer is
           typing — on the very form the message is about. */
        role="status"
        aria-live="polite"
        /* The state as a hook for drives and gates: "dirty" or "saved". */
        data-pending-state={mode}
        className="kp-rail kp-rise fixed inset-x-0 bottom-0 z-nav"
      >
        <div
          /* ⛔ NO `max-w-…` HERE — §B7, "every page states its width, once", and `test:measure`
             refused the first draft's `max-w-[1400px]` as a NEW hand-typed page width. It was
             also simply wrong: `AdminBody` states no measure at all and runs full-width at
             `px-4 lg:px-6`, so a bar that centred itself inside 1400px would not line up with
             the content it belongs to. The padding below is AdminBody's own, so the bar's
             contents sit on the same left edge as the form above them. */
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6"
          style={{ minHeight: "var(--h-pending-bar)" }}
        >
          {/* ⭐ "SAVED" — the same microlabel as "Unsaved changes" in the app-state success ink, and NO
              button: there is nothing left to act on, and a button here would be a second thing to
              read while the officer is checking whether the save worked. */}
          {mode === "saved" ? (
            <span className="inline-flex items-center gap-2 font-mono text-micro uppercase eyebrow text-success-fg">
              <I.check s={12} aria-hidden />
              {savedNow?.text}
            </span>
          ) : (
            <>
              {/* Another form is still dirty, so the bar stays "Unsaved changes" — and says, first,
                  that the one just saved did land. */}
              {savedNow && (
                <Chip size="sm" variant="success">
                  <I.check s={10} aria-hidden />
                  {savedNow.text}
                </Chip>
              )}
              <span className="inline-flex items-center gap-2 font-mono text-micro uppercase eyebrow text-warning-fg">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-pill bg-warning-fg" />
                {shownLabel}
              </span>
              {shownDetail && <span className="min-w-0 text-caption text-text-secondary">{shownDetail}</span>}
              {/* ⭐ THE OTHERS ARE COUNTED, NOT HIDDEN. Only one form's actions can sit on one bar
                  without a Save button that saves an ambiguous thing — but silently omitting the
                  rest would let an officer discard the visible one and leave believing the page was
                  clean. Nothing is at risk either way: every instance still renders its own
                  `UnsavedChangesGuard`, so all of them are covered on the way out. */}
              {/* ⚠️ `text-body-sm` (13px), NOT `text-micro` — and `test:type-scale` was right to
                  refuse the first draft. This is a SENTENCE an officer has to read, so §T4's 12.5px
                  floor applies; `text-micro`/`caption`/`label` are all below it and none of them
                  counts as a fix. The sub-micro tier is for UPPERCASE tracked microlabels only,
                  which this is not. */}
              {others > 0 && (
                <span className="text-body-sm text-text-tertiary">
                  +{others} more unsaved {others === 1 ? "change" : "changes"} on this page
                </span>
              )}
              {/* ⭐ The actions sit at the END on one line and WRAP as a pair at 390 — the same
                  `flex-wrap` + `ml-auto` shape the admin card header uses, so a narrow screen
                  never puts Save on its own orphan row. */}
              <span className="ml-auto flex items-center gap-2">
                {shownDiscard && (
                  <Button type="button" variant="ghost" size="sm" onClick={shownDiscard} disabled={shownSaving}>
                    {shownDiscardLabel}
                  </Button>
                )}
                {/* ⛔ NEVER A SECOND SAVE WHILE THE FORM'S OWN IS ON SCREEN — see `saveAnchor`. */}
                {shownSave && !anchorOnScreen && (
                  <Button type="button" variant="primary" size="sm" onClick={shownSave} loading={shownSaving}>
                    {shownSaveLabel}
                  </Button>
                )}
              </span>
            </>
          )}
        </div>
      </div>
  );

  return (
    <>
      {/* 🔴 THE SPACER IS GONE, AND ITS FAILURE IS WORTH KEEPING. The first version rendered an
          in-flow sibling of the bar's own height — which reserves space WHERE THE COMPONENT
          SITS, not at the end of the page. This component is rendered mid-form, so the page's
          LAST card still ran underneath the bar: `qa:pending-bar` measured the overlap at 49px
          on 1440 and **102px on 390**, where the bar wraps to two rows.
          ⭐ A spacer only works if the component is the last thing in the flow, and a kit
          primitive cannot require that of its callers. The reserve therefore goes on the
          SCROLL CONTAINER — `document.body`'s padding-bottom, set from the bar's MEASURED
          height and cleared on unmount, the same way the kit's modal owns the scroll lock.
          ⚠️ Measured, not assumed: at 390 the row legitimately wraps, so a constant would
          under-reserve at exactly the width where it matters most. */}
      {mounted ? createPortal(bar, document.body) : null}
    </>
  );
}

/**
 * `useFormDirty` — the honest answer to *"would leaving lose work?"* for an UNCONTROLLED form.
 *                                                    (ADMIN-TABS-2026-09-01, §K5, §K rule 7d)
 *
 * ⭐ WHY IT EXISTS. `UnsavedChangesGuard` takes a `dirty` boolean and the caller owns it. That
 * is easy where state is controlled (`updown-controls.tsx` compares `method !== observationMethod`
 * and is exact). But most admin forms are UNCONTROLLED — `config-form.tsx` alone renders 11
 * `<Input defaultValue={…}>` — and React state never sees those edits at all, so there is
 * nothing to compare and every such form would otherwise ship without a guard.
 *
 * ⛔ AND THE OBVIOUS SHORTCUT IS WRONG. A `touched` flag set by the first keystroke reports
 * dirty forever after — including once the operator has typed a value back to what it was. That
 * is a prompt over nothing, and a dialog that fires when nothing would be lost is how operators
 * learn to dismiss the dialog that matters. This SNAPSHOTS the form on mount and COMPARES, so
 * typing `40` over `40` is not dirty and typing it back to `40` stops being dirty.
 *
 * ⚠️ WHAT IT COMPARES, STATED: the form's own `FormData`, serialised in DOM order. That means
 *   · a field the form renders CONDITIONALLY (a fee model that reveals two more inputs) changes
 *     the serialisation and therefore reads dirty — which is correct, the operator changed it;
 *   · a checkbox that posts nothing when unchecked is handled, because both sides of the
 *     comparison are built the same way;
 *   · ⛔ a FILE input is skipped by name. `FormData` holds a `File` object whose stringification
 *     is the filename alone, so two different files with one name would compare equal — a
 *     silent false negative, which is the failure direction this repo does not accept. No admin
 *     form uploads today; if one does, it must own its own `dirty`.
 *
 * ⛔ `markSaved()` IS NOT OPTIONAL. After a successful save the CURRENT values are the new
 * baseline; without the call the form stays dirty forever and the guard fires on a form that
 * holds nothing unsaved.
 */
export function useFormDirty(formRef: React.RefObject<HTMLFormElement | null>) {
  const [dirty, setDirty] = React.useState(false);
  const baseline = React.useRef<string | null>(null);

  const snapshot = React.useCallback(() => {
    const form = formRef.current;
    if (!form) return null;
    const fd = new FormData(form);
    const parts: string[] = [];
    for (const [k, v] of fd.entries()) {
      if (typeof v !== "string") continue; // see the FILE note above
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
    return parts.join("&");
  }, [formRef]);

  /* The baseline is taken AFTER the first paint, not during render: a `defaultValue` is only on
     the DOM node once it exists, and a snapshot taken too early is an empty string that makes
     every field read as a change. */
  React.useEffect(() => {
    baseline.current = snapshot();
  }, [snapshot]);

  const check = React.useCallback(() => {
    const now = snapshot();
    if (now === null || baseline.current === null) return;
    setDirty(now !== baseline.current);
  }, [snapshot]);

  const markSaved = React.useCallback(() => {
    baseline.current = snapshot();
    setDirty(false);
  }, [snapshot]);

  /* ⚠️ BOTH EVENTS, ON PURPOSE. `input` covers typing; `change` covers a `<select>` and a
     checkbox, which do not fire `input` in every engine. They are cheap and idempotent. */
  return { dirty, markSaved, formProps: { onInput: check, onChange: check } };
}

export function UnsavedChangesGuard({
  dirty,
  title = "Leave without saving?",
  body = "This form has changes that have not been saved. Leaving now discards them.",
  confirmLabel = "Discard changes",
  cancelLabel = "Stay on this page",
}: {
  dirty: boolean;
  title?: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  /* ⚠️ `dirty` is read through a ref inside both listeners. They are installed once; reading
     the prop directly would close over the value at install time and the guard would answer
     with whatever `dirty` was on first render — permanently. */
  const dirtyRef = React.useRef(dirty);
  React.useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  // ① The tab closes.
  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // ⚠️ Legacy engines require `returnValue` to be SET, not merely truthy-returned. The
      // string itself is ignored by every current browser, which shows its own wording.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ② An in-app link — including a section-rail tab.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      // ⛔ Let the browser have the clicks that are NOT a same-tab navigation: a modified
      // click opens a new tab and loses nothing, and a non-primary button is not a follow.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;                 // in-page anchor: no exit
      if (a.hasAttribute("download") || a.getAttribute("target") === "_blank") return;
      // Same-origin only — an outbound link leaves the app entirely and ① covers it.
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // ⛔ Same URL is not an exit. A rail's ACTIVE tab links to where you already are, and
      // prompting there would make the current tab unclickable while the form is dirty.
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      setPending(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);           // ⛔ capture — see the header
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  /* ⭐ THE KIT'S OWN `ConfirmModal`, not a hand-built panel. It is already controlled
     (`open`/`onClose`/`onConfirm`), so nothing had to be forked to open it programmatically —
     §K5, and §B10: a second dialog composed out of `Modal` + two `Button`s would be a fourth
     spelling of a decided thing.
     ⚠️ `tier="medium"` deliberately, NOT `"hard"`: a hard gate makes the operator TYPE a word,
     and this is a reversible loss of a draft, not an irreversible act on money or a person.
     Reaching for the strongest ceremony everywhere is how a type-to-confirm stops meaning
     anything on the screens that genuinely need one. */
  return (
    <ConfirmModal
      open={pending !== null}
      onClose={() => setPending(null)}
      onConfirm={() => {
        const to = pending;
        setPending(null);
        /* ⚠️ Cleared FIRST, then pushed: the click that started this was cancelled, so the
           push below is the only navigation still travelling and it must not re-arm the
           guard on its way out. */
        if (to) router.push(to as never);
      }}
      title={title}
      body={body}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tier="medium"
    />
  );
}

/**
 * `useFormDraft` — THE EXIT NO PROMPT CAN CATCH (owner's request, 2026-09-21: *"it should be perfectly sealed
 * from all directions, if someone suddenly quits, full behaviours seen and unseen scenarios"*).
 *
 * ⭐ WHY A DRAFT AND NOT A FOURTH LISTENER. `UnsavedChangesGuard` covers the tab closing and an in-app link, and
 * its own header names the exit it does NOT cover — the browser's Back button, because the App Router gives no
 * cancellable navigation event and the `pushState` trick that fakes one corrupts the history stack. But Back is
 * only the third of a longer list, and the rest cannot be intercepted by anyone: the browser crashes, the laptop
 * sleeps and never wakes, the session expires, the power goes. A prompt is a question asked at one door. A draft
 * is the work still being there whichever door was used, including the ones with no door at all.
 *
 * ⛔ IT NEVER RESTORES BY ITSELF, AND THAT IS THE WHOLE SAFETY ARGUMENT. What this form holds are the ceilings
 * that stop real money. Silently repainting an officer's half-typed numbers over what the server now says would
 * be a change nobody chose, made by a page reload. The draft is OFFERED; a person restores it or drops it.
 *
 * ⛔ AND A DRAFT FROM A DIFFERENT VERSION IS REFUSED OUTRIGHT, never offered. `version` is the row version the
 * form was rendered from: if it has moved, somebody else has changed this account since the draft was taken, and
 * restoring would re-apply stale limits over a deliberate change with nothing on screen saying so. That is the
 * one way a draft could cost money rather than save work, and it is closed by construction.
 *
 * ⛔ THE KEY CARRIES NO RECORD ID. `key` is hashed before it is stored, so nothing identifying is written to the
 * officer's disk — this hook is used by a section whose record ids may not leave the server (D19), and a hook
 * that required its callers to remember that would eventually meet one that forgot.
 *
 * ⚠️ EVERY READ AND WRITE IS WRAPPED. `localStorage` throws in a private window, with site data blocked, and in
 * some embedded webviews — and a form that cannot save a draft must still work perfectly, so every failure here
 * is silent and the form is never worse off than it was before this existed.
 */
type DraftEntry = { v: string; at: number; values: Record<string, string>; flags: Record<string, boolean> };

/** A short, stable, non-identifying digest. ⛔ Not a security value — it exists so no id lands on disk. */
function draftSlot(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `kp:draft:${(h >>> 0).toString(36)}`;
}

function readDraft(slot: string): DraftEntry | null {
  try {
    const raw = window.localStorage.getItem(slot);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const e = parsed as Partial<DraftEntry>;
    if (typeof e.v !== "string" || typeof e.at !== "number") return null;
    if (typeof e.values !== "object" || e.values === null) return null;
    if (typeof e.flags !== "object" || e.flags === null) return null;
    return { v: e.v, at: e.at, values: e.values as Record<string, string>, flags: e.flags as Record<string, boolean> };
  } catch { return null; }
}

export function useFormDraft({
  formRef,
  storageKey,
  version,
  dirty,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  storageKey: string;
  version: string;
  dirty: boolean;
}): { found: DraftEntry | null; restore: () => void; drop: () => void } {
  const slot = React.useMemo(() => draftSlot(storageKey), [storageKey]);
  const [found, setFound] = React.useState<DraftEntry | null>(null);

  /* ⛔ READ ONCE, AFTER MOUNT. `localStorage` does not exist while the server renders, and a draft read during
     render would be a hydration mismatch on every page that has one. */
  /**
   * ⛔ THIS EFFECT IS AUTHORITATIVE — IT SETS `found` ON EVERY PATH, INCLUDING THE EMPTY ONES.
   *
   * 🔴 It used to `return` without touching `found` when there was no draft, and again when the
   * stored draft belonged to an older row version. Both leave a STALE OFFER on screen. The second
   * is the one that bites: `version` is the row version the form was rendered from, so a successful
   * save BUMPS it and re-runs this effect — which is exactly the moment the offer must go, and
   * exactly the moment the old code took the silent `return`. Found by a gate, not by reading.
   */
  React.useEffect(() => {
    const e = readDraft(slot);
    if (!e) { setFound(null); return; }
    /* A draft the account has moved past is DELETED, not shown: it can never be restored safely again. */
    if (e.v !== version) {
      try { window.localStorage.removeItem(slot); } catch { /* nothing to do */ }
      setFound(null);
      return;
    }
    setFound(e);
  }, [slot, version]);

  /**
   * ⛔ A DRAFT IS REMOVED WHEN THE FORM *BECOMES* CLEAN — NEVER MERELY BECAUSE IT *IS* CLEAN.
   *
   * 🔴 BOTH HALVES OF THIS WERE WRONG AND BOTH WERE REPRODUCED IN A BROWSER (2026-09-22), the second
   * one reported by the owner: *"I had pending changes, but clicked the save in bottom, I still had
   * the popup that pending changes from before"*.
   *
   * ① **THE DRAFT DELETED ITSELF ON MOUNT.** A form starts clean, so `!dirty` was true on the very
   *   first effect run and the entry was removed immediately — the same render that had just read it
   *   and offered it. Measured: after the reload that showed the offer, `localStorage` already held
   *   ZERO draft keys. So the offer could be taken up on that one screen and never again: reload
   *   twice, or leave and come back, and the work was gone. **That is data loss inside the feature
   *   built to prevent data loss**, and it was invisible because the offer still appeared once.
   * ② **THE OFFER SURVIVED A SAVE.** `found` is React state, and only `restore()` and `drop()`
   *   cleared it — so an officer who ignored the offer, filled the form and pressed Save was left
   *   looking at "Unsaved changes from earlier" over a form that had just saved cleanly. The bar was
   *   correctly gone; this was not. A panel offering to restore work that no longer exists is worse
   *   than no panel, because the obvious next click UNDOES the save.
   *
   * ⭐ `everDirty` is what tells the two states apart: a form that has never been edited in this
   * mount has nothing to clear, and a form that goes clean after being dirty has been saved or
   * discarded and its draft is spent. One ref, and the difference between them stops being invisible.
   */
  const everDirty = React.useRef(false);
  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return undefined;
    if (!dirty) {
      if (everDirty.current) {
        everDirty.current = false;
        try { window.localStorage.removeItem(slot); } catch { /* nothing to do */ }
        /* The offer is about work that no longer exists. Clearing it is the whole of defect ②. */
        setFound(null);
      }
      return undefined;
    }
    everDirty.current = true;
    const write = () => {
      try {
        const values: Record<string, string> = {};
        const flags: Record<string, boolean> = {};
        for (const el of form.elements) {
          if (!(el instanceof HTMLInputElement) || !el.name) continue;
          if (el.type === "checkbox") flags[el.name] = el.checked;
          else if (el.type !== "password" && el.type !== "file") values[el.name] = el.value;
        }
        window.localStorage.setItem(slot, JSON.stringify({ v: version, at: Date.now(), values, flags } satisfies DraftEntry));
      } catch { /* a draft that cannot be written must never break the form */ }
    };
    write();
    /* ⚠️ Debounced: a keystroke a character is a write a character, and this runs on the same thread as typing. */
    let t: ReturnType<typeof setTimeout> | null = null;
    const onEdit = () => { if (t) clearTimeout(t); t = setTimeout(write, 400); };
    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    return () => {
      if (t) clearTimeout(t);
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
    };
  }, [dirty, formRef, slot, version]);

  const drop = React.useCallback(() => {
    try { window.localStorage.removeItem(slot); } catch { /* nothing to do */ }
    setFound(null);
  }, [slot]);

  /**
   * ⛔ RESTORE MOVES THE REAL CONTROLS AND SAYS SO, rather than assigning values behind the form's back.
   * Setting `.value` or `.checked` fires nothing at all, so the form would hold restored work while the pending
   * bar said there was none — the exact class of defect this whole module exists for. One bubbling `input` per
   * control is what the form and the kit's own checkbox are already listening for.
   */
  const restore = React.useCallback(() => {
    const form = formRef.current;
    const e = found;
    if (!form || !e) return;
    for (const el of form.elements) {
      if (!(el instanceof HTMLInputElement) || !el.name) continue;
      if (el.type === "checkbox") {
        if (!(el.name in e.flags) || el.checked === e.flags[el.name]) continue;
        el.checked = e.flags[el.name];
      } else {
        if (!(el.name in e.values) || el.value === e.values[el.name]) continue;
        el.value = e.values[el.name];
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setFound(null);
  }, [formRef, found]);

  return { found, restore, drop };
}
