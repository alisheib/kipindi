"use client";

/**
 * Modal + ConfirmModal — the single centered-dialog primitive (§9.1).
 *
 * Before this, 16 files rolled their own `createPortal` scrim, and only ~9
 * used `useModalLock` — so several money-critical confirms (settle, kill-
 * switch, emergency-void) shipped WITHOUT the Android scroll/zoom lock, a
 * focus trap, or focus-return. This is the one source of truth: portal +
 * useModalLock + Esc + focus-trap + focus-return + kit scrim/animation.
 *
 *   <Modal open onClose ariaLabel="…"> …custom panel content… </Modal>
 *
 *   <ConfirmModal                       // medium: one explicit confirm
 *     open={open} onClose={close}
 *     title="Settle YES now?" body={<p>…</p>}
 *     confirmLabel="Yes, settle" tone="claret"
 *     onConfirm={fire} />
 *
 *   <ConfirmModal tier="hard" typedWord="SEAL"   // hard: type-to-arm gate
 *     … />                                        //   confirm stays disabled
 *                                                 //   until the word matches
 *
 * Slide-over panels (notifications, avatar-menu, nav) are a DIFFERENT
 * pattern and intentionally out of scope here.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { haptics } from "@/lib/haptics";
import { useModalLock } from "@/lib/use-modal-lock";
import { useT } from "@/lib/i18n";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ═══════════════════════════════════════════════════════════════════════════
   ⭐ THE EXIT PHASE — §M2, "each rung pairs with its arrival and every arrival
   has its exit".

   🔴 WHAT THIS FIXES. Every portaled surface in the product ARRIVED on an eased
   kit entrance (`.m-dialog-in` / `.m-sheet-in` / `.m-float-in`) and then left by
   INSTANT UNMOUNT — `{open && createPortal(…)}`. The kit's three exits
   (`.m-out`, `.m-float-out`, and the `m-leave-out` keyframe behind both) were
   DEFINED in motion.css with zero consumers. Half a motion language shipped.

   ⭐ THE MODEL IS `ui/toast.tsx` — a two-phase dismiss that marks the surface
   exiting, holds one beat, then unmounts. This is that shape, generalised, so
   six surfaces share ONE implementation instead of six timers that drift.

   ⭐ WHY THE FALLING EDGE IS HANDLED DURING RENDER and not in an effect: an
   effect runs AFTER the commit, so for one painted frame `open` would be false
   while `leaving` was still false — the surface would blink out and back in
   before playing its exit. React's documented "adjust state when a prop
   changes" pattern re-renders before that frame is ever painted. (The rising
   edge is free either way: `present` is `open || leaving`.)

   ⛔ §M6, ALL THREE GATES, IN THIS SAME CHANGE. An exit that still runs with
   motion off is worse than no exit — it DELAYS AN UNMOUNT for someone who asked
   for no motion. `exitBeatMs` therefore returns 0 for the OS media query (gate
   1) and for the in-app switch / `minimal` tier (gate 2), which collapses the
   hold to nothing and unmounts on the spot. Gate 3, `data-motion="reduced"`,
   is deliberately NOT here: that tier is a THROTTLE (full durations, ambient
   loops off) and a one-shot 90–140ms exit is not an ambient loop — the same
   reasoning `win-celebration.tsx` states for its own counter.

   ⛔ THE BEAT IS READ FROM THE TOKEN, NEVER RETYPED (§B5 — one definition site;
   §0d — values live in globals.css / motion.css and nowhere else). A hard-coded
   `140` here is a second definition of `--t-quick` that cannot be retuned.
   A token that fails to resolve yields 0, i.e. an instant unmount: the safe
   direction, because the failure mode of the other direction is a surface
   stranded on screen forever.
   ═══════════════════════════════════════════════════════════════════════════ */

/** The two exit rungs a surface may hold for: `--t-quick` (modal `.m-out`) and
 *  `--t-flick` (float `.m-float-out`). Named, so a call site cannot invent a third. */
export type ExitBeat = "--t-quick" | "--t-flick";

function exitBeatMs(beat: ExitBeat): number {
  if (typeof window === "undefined") return 0;
  const root = document.documentElement;
  if (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    root.classList.contains("kp-reduce-motion") ||
    root.getAttribute("data-motion") === "minimal"
  ) return 0;
  const raw = getComputedStyle(root).getPropertyValue(beat).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return raw.endsWith("ms") ? n : n * 1000;
}

/**
 * Keeps a surface mounted for one exit beat after `open` goes false.
 *
 *   const { present, exiting } = useExitPhase(open);
 *   if (!present) return null;
 *   <div className={exiting ? "m-out" : "m-dialog-in"} …>
 *
 * `present` is what gates the render; `exiting` is what swaps the arrival class
 * for its exit. Re-opening mid-exit cancels the hold and re-arms the entrance.
 */
export function useExitPhase(open: boolean, beat: ExitBeat = "--t-quick"): { present: boolean; exiting: boolean } {
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [leaving, setLeaving] = React.useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setLeaving(!open); // falling edge → play out; rising edge → cancel any hold
  }
  React.useEffect(() => {
    if (!leaving) return;
    const ms = exitBeatMs(beat);
    if (ms <= 0) { setLeaving(false); return; } // motion off → unmount now
    const tm = setTimeout(() => setLeaving(false), ms);
    return () => clearTimeout(tm);
  }, [leaving, beat]);
  return { present: open || leaving, exiting: leaving };
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** aria-label for the dialog when there's no visible heading to point at. */
  ariaLabel?: string;
  /** id of the visible heading (preferred over ariaLabel when present). */
  labelledBy?: string;
  /** "alertdialog" for irreversible confirmations, else "dialog". */
  role?: "dialog" | "alertdialog";
  /** Panel max width in px (default 360 — the kit confirm width). */
  maxWidth?: number;
  /** Show the top-right ✕ close button (default true). */
  showClose?: boolean;
  /** Clicking the scrim closes (default true). Set false for must-decide gates. */
  closeOnScrim?: boolean;
  /** Element to focus on open; falls back to the first focusable in the panel. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Extra classes for the panel (spacing/tone overrides). */
  panelClassName?: string;
  /** Stacking context. Defaults to 100. Raise for overlays that must sit above
   *  other modals/toasts (e.g. the win celebration + reality-check at 1700). */
  zIndex?: number;
  /** Reflects a mutation-in-flight to assistive tech (sets aria-busy on the
   *  dialog). Used by the bet-confirm while the wager is submitting. */
  ariaBusy?: boolean;
  /** Bottom-sheet on phones, centered dialog on ≥sm. For the onboarding primer
   *  and the RG reality-check, which dock to the bottom edge on mobile for
   *  thumb reach. Default false = the standard centered dialog. */
  sheet?: boolean;
};

/** The shared centered-dialog shell. Controlled — the caller owns `open`. */
export function Modal({
  open,
  onClose,
  children,
  ariaLabel,
  labelledBy,
  role = "dialog",
  maxWidth = 360,
  showClose = true,
  closeOnScrim = true,
  initialFocus,
  panelClassName = "",
  zIndex = 100,
  ariaBusy,
  sheet = false,
}: ModalProps) {
  const { t } = useT();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const prevFocus = React.useRef<HTMLElement | null>(null);
  /* §M2 — the modal rung's exit is `.m-out` over one `--t-quick` beat.
     ⛔ `useModalLock`, the focus trap and the focus RETURN all stay keyed to
     `open`, not to `present`: the dialog must stop being modal the instant it
     is closed, and the trigger must get focus back then — not a beat later.
     What lingers is a non-interactive, `aria-hidden` ghost playing its fade. */
  const { present, exiting } = useExitPhase(open, "--t-quick");

  useModalLock(open);
  React.useEffect(() => { setMounted(true); }, []);

  // 🔴 THE CALLBACKS ARE HELD IN REFS SO THEY ARE NOT EFFECT DEPENDENCIES.
  //
  // This effect used to depend on `[open, onClose, initialFocus]`. Every caller passes
  // `onClose` as a fresh inline arrow (`onClose={() => { if (!pending) onCancel(); }}`),
  // so its identity changed on EVERY render — and the effect therefore tore down and
  // re-ran on every render, not on every open.
  //
  // Each of those re-runs did three things in order: the cleanup restored focus to the
  // trigger (still enabled, sitting behind the scrim), the body re-captured
  // `prevFocus` from whatever was focused *after* that restore, and 30 ms later the
  // timer forced focus onto `initialFocus`. The net effect is that focus is dragged
  // off whatever the user selected and onto the dialog's primary button.
  //
  // ⛔ On the BET CONFIRM dialog that happened ONCE A SECOND, because the modal
  // re-renders each time its countdown label ticks. A keyboard or screen-reader user
  // who tabbed to Cancel had focus pulled onto Confirm within the second — so pressing
  // Enter placed the bet they were cancelling. It is a money dialog; that is the whole
  // severity of it.
  //
  // ⭐ With `[open]` as the only dependency the cleanup now runs on a TRUE close (or
  // unmount) and nowhere else, which is what "restore focus to the trigger" always
  // meant. `initialFocus` is a ref object and is read at timer time, so it needs no
  // dependency either — reading it late is strictly more correct than pinning it.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const initialFocusRef = React.useRef(initialFocus);
  React.useEffect(() => { initialFocusRef.current = initialFocus; }, [initialFocus]);

  React.useEffect(() => {
    if (!open) return;
    // Remember what had focus so keyboard/SR users land back on the trigger.
    prevFocus.current = document.activeElement as HTMLElement | null;
    // Captured now, not read at cleanup time: by then the DOM may have moved on, and
    // this is the element that was focused when the dialog actually opened.
    const restoreTo = prevFocus.current;
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const timer = setTimeout(() => {
      const target = initialFocusRef.current?.current ?? focusables()[0] ?? panelRef.current;
      target?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); return; }
      if (e.key !== "Tab") return;
      // Focus trap: keep Tab inside the dialog instead of leaking behind the scrim.
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      // Restore focus to the trigger (guard: it may have unmounted).
      restoreTo?.focus?.();
    };
  }, [open]);

  if (!mounted || !present) return null;

  return createPortal(
    <div
      role={role}
      /* ⛔ ONCE IT IS LEAVING IT IS NOT A DIALOG ANY MORE. Focus has already been
         returned to the trigger by the effect above, so the fading ghost must not
         keep claiming `aria-modal` (which tells AT the rest of the page is inert)
         and must not be clickable — a scrim that still closes something, or a
         Confirm still hittable, during the fade is a real mis-click. */
      aria-modal={exiting ? undefined : "true"}
      aria-hidden={exiting || undefined}
      aria-busy={exiting ? undefined : ariaBusy}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
      className={`fixed inset-0 flex justify-center overflow-y-auto overscroll-contain ${
        sheet ? "items-end sm:items-center px-0 sm:px-3 py-0 sm:py-4" : "px-3 py-4"
      } ${exiting ? "pointer-events-none" : ""}`}
      style={{ zIndex }}
    >
      <button
        type="button"
        aria-label={t.common.cancel}
        tabIndex={-1}
        onClick={exiting ? undefined : closeOnScrim ? onClose : undefined}
        /* The scrim fades with the panel. `.m-scrim` and `.m-out` are both
           `animation` shorthands, so they cannot be worn at once — the later
           declaration would win outright. Swapping the class keeps the blur by
           naming the same token the utility does; no value is restated. */
        className={`${exiting ? "m-out" : "m-scrim"} fixed inset-0 bg-black/60`}
        style={exiting ? { backdropFilter: "blur(var(--m-blur-behind))" } : undefined}
      />
      {/* ⭐ RUNG 3 (M2) — the dialog PICKS a rung instead of composing one. `mat-modal`
          carries the wash, the border and `--elev-modal` together, so the three classes
          it replaces (`border border-border-strong bg-bg-elevated shadow-modal`) are
          gone rather than left beside it (INTAKE §3b: a class that lands while the
          literals survive has bought nothing).
          ⚠️ IT KEEPS ITS BORDER, and that was checked rather than assumed. The
          border-drop rule applies to rungs whose cast carries an OUTER ring —
          `--elev-float` at 42% and `--elev-toast` at 46% — because a 1px ring
          immediately outside a 44% border reads as one muddy 2px edge. `--elev-modal`
          carries only the inset `--edge-lit-strong`, so there is nothing to double up
          with, and dropping the border here would have cost the dialog its edge. */}
      <div
        ref={panelRef}
        /* ⭐ `data-rung` IS THE ADOPTION LEDGER, not a test hook bolted on.
           A surface that picks a rung declares WHICH one, in the markup, so the set of
           rung-adopting surfaces can be ENUMERATED instead of grepped for whichever
           class name the merge happens to be using this week. Two things made this
           worth one attribute: the material probe had been selecting `.shadow-modal`,
           which this very commit removed — so the instrument went stale the moment the
           product improved — and Ali's standing instruction is that the design applies
           everywhere with no inconsistency, which you cannot check without being able
           to list what has adopted and what has not.
           ⚠️ The repo already uses exactly this idiom for exactly this reason:
           `data-unread` on the bell and `data-stagger` on a cascade are both selected
           by drivers precisely because a `data-` attribute survives restyling. */
        data-rung="modal"
        /* §M2: modal → `.m-dialog-in` or `.m-sheet-in` on the way in, `.m-out` on
           the way out. The sheet's ≥sm keyframe swap goes with the entrance only —
           `.m-out` is one exit for both variants, which is what the law names. */
        className={`${exiting ? "m-out" : sheet ? "m-sheet-in kp-modal-sheet" : "m-dialog-in"} mat-modal relative w-full p-5 lg:p-6 ${
          sheet ? "rounded-t-modal sm:rounded-modal sm:my-auto" : "my-auto rounded-modal"
        } ${panelClassName}`}
        style={{ maxWidth }}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >
            <I.x s={16} />
          </button>
        )}
        {children}
      </div>
      {/* The sheet variant docks to the bottom edge only below `sm` (see the wrapper's
          items-end sm:items-center). Above it the panel is a centered dialog, so it must
          arrive as one — a full-height sheet rise on a centred panel reads as a mistake.
          Scoped to `.kp-modal-sheet`, NOT to `.m-sheet-in` itself: overriding the kit
          utility globally would silently break any future real bottom sheet at ≥sm.
          Swaps the kit keyframe only; no new motion vocabulary. Reduced motion is handled
          globally by motion.css. */}
      <style>{`@media (min-width: 640px) { .kp-modal-sheet { animation-name: m-settle-lift; } }`}</style>
    </div>,
    document.body,
  );
}

/* ⭐ D1 (Ali's ruling, 2026-08-21) — THE CONTRADICTION IS RESOLVED IN FAVOUR OF THIS FILE.
   Two laws were live at once: CLAUDE.md's gold-budget list said "Confirm CTA → `btn-gold`
   (the actual money commit)", and the comment that used to stand here said the opposite.
   The ruling keeps THIS one for the shared dialog and deletes the sentence in CLAUDE.md.

   Gold is NOT a `ConfirmModal` tone. Gold-discipline (§M3) reserves struck gold for the
   resolved-seal / earned-money language, never for a generic confirm CTA — and this
   primitive is the generic one: it carries settle, emergency-void, kill-switch, the
   provider switch, deposit and withdraw. `bet-confirm-modal.tsx` and `sell-confirm-modal.tsx`
   are NOT this component and keep their own gold commit button, unchanged: they are the
   two surfaces gold was actually reserved for.

   ⛔ Do not add a fourth tone here to bring gold back. The next session that wants a gold
   confirm wants one of those two bespoke modals, or it wants §M3 amended — not a tone. */
type Tone = "claret" | "warning" | "brand";

type ConfirmModalBase = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  /** Small mono eyebrow above the title. Defaults per tier/tone. */
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  /** D1 — the button pair's footprint. "md" is the dialog default; "lg" is the
   *  money-commit footprint the deposit and withdraw confirms take. BOTH stacked
   *  buttons move together: a large Confirm over a medium Cancel would make the
   *  size itself an argument for one of the two answers, which is the opposite of
   *  what a confirmation is for. */
  size?: "md" | "lg";
  /** Override the header glyph (defaults to the warning triangle). */
  icon?: React.ReactNode;
  maxWidth?: number;
  /** DS-2 / B-28 — mutation in flight. Disables BOTH buttons (the provider
   *  switch could double-fire), swaps the confirm label for a spinner, blocks
   *  scrim/Esc/✕ dismissal, and sets aria-busy. Wire it from useTransition's
   *  pending at every consequential call site. */
  loading?: boolean;
};

/* ⛔ THE TIER AND ITS TYPED WORD ARE ONE DECISION, NOT TWO INDEPENDENT PROPS (S-17,
   scan #1, 2026-08-28).
 *
 * They used to be two optionals, and `isHard` was `tier === "hard" && !!typedWord`. So
 * passing `tier="hard"` WITHOUT a `typedWord` did not fail — it silently produced an
 * ordinary one-click confirm wearing the styling, the claret tone and the eyebrow of a
 * hard gate. It failed in the direction of LOOKING SAFE, which is the only direction that
 * matters for a control whose entire job is to be hard to fire by accident.
 *
 * Four live call sites did exactly that, and three of them were RBAC-destructive on
 * /admin/staff and /admin/roles — the two OWNER_ONLY_PREFIXES. The most privileged surface
 * in the product was where the gate silently wasn't.
 *
 * ⭐ A GUARD THAT COUNTS `tier="hard"` OCCURRENCES CANNOT SEE THIS. The string was present;
 * the pairing was absent. So the pairing is made unrepresentable instead of merely audited.
 *
 * ⚠️ A CORRELATED PAIR AT THE CALL SITE MUST BE SPREAD, NOT WRITTEN AS TWO TERNARIES.
 * `tier={c ? "hard" : "medium"} typedWord={c ? "X" : undefined}` is REJECTED, and correctly
 * so: TypeScript sees `"medium" | "hard"` and `string | undefined` independently, and that
 * pair genuinely can express hard-without-a-word. Write one object instead:
 *     {...(c ? { tier: "hard" as const, typedWord: "X" } : { tier: "medium" as const })} */
type ConfirmGate =
  | { tier: "hard"; typedWord: string }
  | { tier?: "medium"; typedWord?: never };

export type ConfirmModalProps = ConfirmModalBase & ConfirmGate;

const TONE_BTN: Record<Tone, string> = {
  claret: "btn btn-claret",
  warning: "btn btn-claret",
  brand: "btn btn-primary",
};
const TONE_INK: Record<Tone, { ring: string; ink: string }> = {
  claret: { ring: "var(--claret-500)", ink: "var(--claret-300)" },
  warning: { ring: "var(--claret-500)", ink: "var(--claret-300)" },
  brand: { ring: "var(--brand-500)", ink: "var(--brand-300)" },
};

/**
 * The one confirm surface. Medium tier = a single explicit confirm; hard tier
 * = a type-the-word gate that arms the (irreversible) action only on an exact
 * match — the pattern behind typed-SEAL / typed-PAUSE.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  eyebrow,
  confirmLabel,
  cancelLabel,
  tone = "claret",
  size = "md",
  tier = "medium",
  typedWord,
  icon,
  maxWidth = 400,
  loading = false,
}: ConfirmModalProps) {
  const { t } = useT();
  const [typed, setTyped] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  /* ⛔ FAILS CLOSED. The union above makes `tier="hard"` without a `typedWord`
     unrepresentable in TypeScript, but a value can still arrive EMPTY at runtime — an
     untyped JS caller, or a word computed from state that happened to be "". The old
     expression turned exactly that into a one-click confirm (`isHard` went false and
     `armed` was permanently true). Now an unusable word keeps the gate on screen and
     never arms it: the officer sees a control that will not fire and says so, instead of
     one that fires on the first click. A gate may refuse; it may not quietly stand down. */
  const isHard = tier === "hard";
  const gateWord = typedWord?.trim() ?? "";
  const armed = !isHard || (gateWord !== "" && typed.trim().toUpperCase() === gateWord.toUpperCase());

  if (process.env.NODE_ENV !== "production" && isHard && gateWord === "") {
    throw new Error(
      'ConfirmModal: tier="hard" requires a non-empty `typedWord` — the gate cannot arm ' +
        `without one and would otherwise look armed but be dead (title: ${JSON.stringify(title)}).`,
    );
  }

  // Reset the typed gate every time the dialog re-opens.
  React.useEffect(() => { if (open) setTyped(""); }, [open]);

  const ink = TONE_INK[tone];
  // D1 — one size for the pair (see the `size` prop note). Named from the kit's
  // button scale; never a hand-typed height.
  const btnSize = size === "lg" ? "btn-lg" : "btn-md";
  const effectiveEyebrow = eyebrow ?? t.common.confirm;
  const typeLabel = typedWord ? `${t.common.type} ${typedWord} ${t.common.typeToConfirm}` : "";

  return (
    <Modal
      open={open}
      // While the mutation is in flight the dialog must not be dismissable —
      // closing it mid-action reads as cancelled while the server proceeds.
      onClose={loading ? () => {} : onClose}
      role="alertdialog"
      ariaLabel={title}
      maxWidth={maxWidth}
      /* 🔴 A5 (2026-08-21) — THE DIALOG OPENS ON CANCEL, NOT ON THE ACTION.
       *
       * A medium-tier confirm used to open with focus already ON the confirm button, so the
       * very next Enter or Space — the key a keyboard user has just pressed to GET here, and
       * the key a screen-reader user presses to activate anything — committed the action the
       * dialog exists to slow down. On this platform those actions are settle, emergency-void,
       * kill-switch and the provider switch: real money, mostly irreversible. A confirmation
       * that can be satisfied by the same keystroke that opened it has confirmed nothing.
       * (`modal.tsx`'s own focus-loop comment above records the sibling defect: focus being
       * DRAGGED onto Confirm once a second on the bet dialog.)
       *
       * ⛔ THE HARD TIER IS UNTOUCHED AND THAT IS DELIBERATE. It focuses the typed-word input,
       * which is not the destructive control at all — it is the arming gate, and the confirm
       * button behind it is `disabled` until the word matches, so Enter there cannot fire
       * anything. Flattening the two tiers to one rule would move focus AWAY from the field
       * the officer must type into, making the safer tier the more awkward one.
       *
       * ⚠️ Cancel for every medium tone, including `brand`. A non-destructive confirm is still
       * a decision someone chose to interrupt the flow for, and one rule is one fact — a
       * per-tone exception is a second definition of "which button is safe". */
      initialFocus={isHard ? inputRef : cancelRef}
      ariaBusy={loading}
      closeOnScrim={!loading}
      showClose={!loading}
    >
      <div className="mb-3 flex items-start gap-3">
        {/* 36px tone medallion — ARBITRARY LITERAL. The spacing scale is OVERRIDDEN
            (tailwind.config.ts:200-215), so `h-9 w-9` was a 64px disc beside a 15px
            headline. ⛔ Never a scale token here. (Distinct from the 48px close ✕
            above, which is deliberately 48 and must not be shrunk to match this.) */}
        <span
          className="mt-0.5 shrink-0 inline-flex h-[36px] w-[36px] items-center justify-center rounded-full"
          style={{
            background: `color-mix(in oklab, ${ink.ring} 15%, transparent)`,
            color: ink.ink,
            border: `1px solid color-mix(in oklab, ${ink.ring} 30%, transparent)`,
          }}
        >
          {icon ?? <I.warning s={18} />}
        </span>
        <div>
          <p className="font-mono text-micro uppercase tracking-[0.16em] font-bold text-text-subtle">
            {effectiveEyebrow}
          </p>
          <h2 className="mt-0.5 font-display text-[18px] font-bold text-text leading-tight">
            {title}
          </h2>
        </div>
      </div>

      <div className="text-[13.5px] text-text-muted leading-relaxed mb-4">
        {body}
      </div>

      {isHard && (
        <label className="block mb-4">
          <span className="font-mono text-micro uppercase tracking-[0.14em] text-claret-300 font-bold">
            {typeLabel}
          </span>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={typeLabel}
            /* ⛔ DG-A-12 · §T1 — NOT A LABEL. This is `ConfirmModal`'s hard-tier type-to-confirm
               INPUT: the operator types the word into it to arm an irreversible action, so the
               uppercase and the 0.2em tracking are the CONTROL's own design and both stay. What
               was wrong is only the size — `text-[15px]` is on neither ladder (§T1), and 15 sits
               between the `text-body` (14) and `text-body-lg` (16) rungs. It takes 16: this is
               something a human types under pressure, and §T4's floor argues up, never down.
               ⛔ Exempted by name in `qa:dg-eyebrow`, which would have swept it to `text-micro`
               — 10px — because it is uppercase and tracked. It is an input, not an eyebrow. */
            className="mt-1 w-full rounded-lg border border-border-strong bg-bg-overlay px-3 py-2.5 font-mono text-body-lg tracking-[0.2em] uppercase text-text outline-none focus:border-[color:var(--brand-400)]"
            placeholder={typedWord}
          />
        </label>
      )}

      <div className="flex flex-col gap-2">
        <button
          ref={confirmRef}
          type="button"
          disabled={!armed || loading}
          aria-busy={loading || undefined}
          onClick={() => { haptics.warning(); onConfirm(); }}
          className={`${TONE_BTN[tone]} ${btnSize} w-full`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2"><Spinner size={14} />{t.common.working}</span>
          ) : (
            confirmLabel ?? t.common.confirm
          )}
        </button>
        <button ref={cancelRef} type="button" disabled={loading} onClick={onClose} className={`btn btn-ghost ${btnSize} w-full disabled:opacity-50`}>
          {cancelLabel ?? t.common.cancel}
        </button>
      </div>
    </Modal>
  );
}
