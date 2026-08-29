"use client";

/**
 * AI toolkit — the ONE admin dropdown that owns every AI switch. Lives in the admin
 * top bar. Nothing here is duplicated elsewhere: the chatbot + poll-gen flags come
 * from ai-controls.ts, the resolution pause from market-sentinel.ts, the auto-resolve
 * mode from market-config.ts — each control has exactly one home, and this is the one
 * place they are shown and changed.
 *
 * Kit only: <Toggle>, <ConfirmModal>, <I> glyphs, glass-panel popover. Enabling
 * auto-resolve overrides the two-officer rule, so it is the one switch gated behind a
 * claret confirm; the rest apply directly (reversible, not money-moving).
 *
 * ⚠️ `canAct` (finding E-19) — this dropdown lives in the admin SHELL HEADER, so it
 * renders on EVERY admin page for every role that can open the console, while all four
 * of its actions require `compliance`. A MODERATOR therefore saw four switches that
 * refused, and each refused click wrote a SECURITY `privilege_escalation_blocked` row.
 * The switches stay compliance-only (AI spend + resolution policy; roles.ts CONFIG_ROLES
 * says "NEVER MODERATOR") — but the panel now renders READ-ONLY for anyone who cannot
 * work it, because knowing whether AI resolution is paused is exactly what a trading
 * officer needs. See lib/server/control-gates.ts.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmModal, useExitPhase } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import type { AiToolkitStatus } from "@/lib/server/ai-controls";
import {
  setChatbotEnabledAction,
  setPollGenEnabledAction,
  setResolutionAiPausedAction,
  setAutoResolveAction,
} from "@/app/admin/_actions/ai-toolkit";

export function AiToolkit({ status, canAct = true }: { status: AiToolkitStatus; canAct?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const boxRef = useRef<HTMLDivElement>(null);
  /* §M2 — float rung: `.m-float-in` in, `.m-float-out` out. The dropdown arrived on
     the kit entrance and left by instant unmount; the exit half of the rung had zero
     consumers anywhere in the product. Outside-click and Escape stay keyed to `open`. */
  const { present, exiting } = useExitPhase(open, "--t-flick");

  // Close on outside-click / Escape (same behaviour the old sentinel widget had).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const { hasKey, chatbotEnabled, pollGenEnabled, resolutionActive, autoResolve, confidenceThreshold } = status;

  // How many AI features are currently ON (for the button's summary dot/label).
  const onCount = [chatbotEnabled, resolutionActive, autoResolve, pollGenEnabled].filter(Boolean).length;
  const anyPaused = hasKey && (!resolutionActive || !chatbotEnabled || !pollGenEnabled);

  /**
   * ⭐ WHICH SWITCH IS WORKING. One `useTransition` drives all four rows, so `pending`
   * disables the whole panel — flip "Auto-resolve when confident" and the chatbot row goes
   * grey with it, with no spinner anywhere and nothing saying which one is saving or that
   * anything is happening at all. On a slow save that is indistinguishable from a dead
   * panel, and this is the panel where the auto-resolve rule is set.
   *
   * ⛔ THE SHARED `disabled` IS KEPT ON PURPOSE — it is not the defect. These four write
   * config through the same store; letting a second flip start while the first is in flight
   * is a write race for no benefit. The fix is to SAY which row is busy, not to allow two.
   */
  const [busyRow, setBusyRow] = useState<null | "chatbot" | "resolution" | "auto" | "pollgen">(null);

  const run = (
    key: "chatbot" | "resolution" | "auto" | "pollgen",
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okTitle: string,
    okDesc: string,
    tone: "success" | "warning" = "success",
  ) => {
    setBusyRow(key);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) { toast({ title: "Couldn't apply", description: r.error, variant: "danger" }); return; }
        toast({ title: okTitle, description: okDesc, variant: tone });
        router.refresh();
      } finally {
        // ⛔ `finally`, so a thrown action cannot strand the panel showing a spinner for ever.
        setBusyRow(null);
      }
    });
  };

  const toggleChatbot = () => {
    const next = !chatbotEnabled;
    run("chatbot", () => act(setChatbotEnabledAction, { enabled: String(next) }),
      next ? "Chatbot enabled" : "Chatbot disabled",
      next ? "The help assistant is available to players again." : "The help chat widget is hidden and makes no AI calls.",
      next ? "success" : "warning");
  };
  const togglePollGen = () => {
    const next = !pollGenEnabled;
    run("pollgen", () => act(setPollGenEnabledAction, { enabled: String(next) }),
      next ? "Poll generation enabled" : "Poll generation disabled",
      next ? "Admins can generate market ideas with the AI again." : "The AI poll generator is blocked.",
      next ? "success" : "warning");
  };
  const toggleResolution = () => {
    const nextPaused = resolutionActive; // active → pause; paused → resume
    run("resolution", () => act(setResolutionAiPausedAction, { paused: String(nextPaused) }),
      nextPaused ? "AI market resolution PAUSED" : "AI market resolution resumed",
      nextPaused ? "Markets reaching their resolve date go to the two-officer ceremony — no AI call." : "The AI checks each market at its resolve date again.",
      nextPaused ? "warning" : "success");
  };
  const toggleAuto = () => {
    if (autoResolve) {
      // Turning auto OFF is always safe → direct.
      run("auto", () => act(setAutoResolveAction, { auto: "false" }), "Auto-resolve OFF", "Every market is sealed by the two-officer ceremony; the AI only recommends.");
      return;
    }
    setConfirmAuto(true); // turning ON overrides the two-officer rule → confirm
  };
  const confirmAutoOn = () => {
    setConfirmAuto(false);
    run("auto", () => act(setAutoResolveAction, { auto: "true" }),
      "Auto-resolve ENABLED",
      `The AI seals markets at their resolve date when ≥ ${confidenceThreshold}% confident. Anything less still goes to two officers.`,
      "warning");
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="AI toolkit"
        aria-expanded={open}
        title="AI toolkit — enable/disable every AI feature"
        className={`font-mono text-micro tracking-[0.12em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border transition-colors ${
          !hasKey
            ? "border-border bg-bg-inset text-text-subtle"
            : anyPaused
              ? "border-warning-border bg-warning-bg text-warning-fg"
              : "border-border bg-bg-elevated text-text hover:border-brand-500/60"
        }`}
      >
        <I.sparkle s={13} className={!hasKey ? "text-text-subtle" : anyPaused ? "text-warning-fg" : "text-brand-300"} />
        <span className="hidden sm:inline">AI</span>
        <span className="tabular-nums font-semibold">{hasKey ? `${onCount}/4` : "off"}</span>
        <I.chevronDown s={10} className="opacity-50" />
      </button>

      {present && (
        <div
          // Mobile: pin to the viewport's right edge (fixed, anchored to the
          // backdrop-filtered bar) so a 300px panel never runs off the LEFT edge when
          // the button sits mid-bar. Desktop (≥sm): drop under the button as usual.
          // Leaving: unclickable, so a switch cannot be worked through its own fade —
          // every control in here is a compliance decision. ⛔ Not `aria-hidden`: this
          // dropdown does not return focus to its trigger, so Escape pressed on a
          // focused Toggle would put aria-hidden over the focused element. `<Modal>`
          // and the bell panel DO return focus, which is why they may set it and this
          // may not.
          className={`${exiting ? "m-float-out pointer-events-none" : "m-float-in"} fixed right-3 top-[58px] sm:absolute sm:right-0 sm:top-full sm:mt-2 w-[300px] max-w-[calc(100vw-24px)] glass-panel p-3.5 shadow-e4 z-50`}
          // Anchored (kit law 1): this panel hangs off the RIGHT of its trigger, so it
          // grows from that corner rather than the utility's default top-left.
          style={{ transformOrigin: "top right" }}
        >
          <div className="flex items-center gap-2 mb-3">
            {/* `/[0.12]` and not `/12` — off Tailwind's 5-step opacity ladder, so this
                glyph tile had no brand wash behind it. */}
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500/[0.12] text-brand-300"><I.sparkle s={15} /></span>
            <div className="min-w-0">
              <p className="font-display text-[13px] font-semibold text-text leading-tight">AI toolkit</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">Every AI feature · one place</p>
            </div>
          </div>

          {!hasKey ? (
            <div className="rounded-md border border-warning-border bg-warning-bg px-3 py-2.5 text-body-sm text-warning-fg leading-snug">
              <strong>No ANTHROPIC_API_KEY on this deployment.</strong> Every AI feature below is
              inert regardless of these switches — set the key in Railway to enable AI.
            </div>
          ) : (
            <div className="space-y-1.5">
              <ToggleRow
                icon={<I.bot s={14} />}
                label="Help chatbot"
                hint={chatbotEnabled ? "Player help assistant is live." : "Chat widget hidden; no AI calls."}
                on={chatbotEnabled} disabled={pending} onClick={toggleChatbot} readOnly={!canAct} busy={busyRow === "chatbot"}
              />
              <ToggleRow
                icon={<I.shieldcheck s={14} />}
                label="AI market resolution"
                hint={resolutionActive ? "AI checks each market at its resolve date." : "Paused — markets go to the human ceremony."}
                on={resolutionActive} disabled={pending} onClick={toggleResolution} readOnly={!canAct} busy={busyRow === "resolution"}
              />
              <ToggleRow
                icon={<I.bolt s={14} />}
                label="Auto-resolve when confident"
                hint={
                  !resolutionActive ? "Needs AI market resolution ON."
                    : autoResolve ? `AI seals at ≥ ${confidenceThreshold}% (bypasses two-officer).`
                      : "AI recommends; two officers seal."
                }
                on={autoResolve && resolutionActive}
                disabled={pending || !resolutionActive}
                onClick={toggleAuto}
                warn={autoResolve && resolutionActive}
                readOnly={!canAct}
                busy={busyRow === "auto"}
              />
              <ToggleRow
                icon={<I.sparkle s={14} />}
                label="AI generation"
                hint={pollGenEnabled
                  ? "Admins can generate poll ideas and Up & Down round proposals."
                  : "Both generators blocked."}
                // ℹ️ MERGE NOTE (2026-08-01). The label and hint come from the feed branch
                // — this one switch now governs BOTH generators, so "AI poll generation"
                // under-described what it turns off. `readOnly={!canAct}` is E-18 and is
                // NOT optional: that branch predates it, and without it a viewer who
                // cannot act still gets a live-looking switch. Every other row here
                // carries it; a single row missing it is the whole E-18 defect.
                on={pollGenEnabled} disabled={pending} onClick={togglePollGen} readOnly={!canAct} busy={busyRow === "pollgen"}
              />
              {/* E-19: say WHY the switches are inert, so the panel reads as a status
                  board rather than a broken console. */}
              {!canAct && (
                <p className="flex items-start gap-1.5 pt-0.5 text-body-sm leading-snug text-text-subtle">
                  <I.lock s={11} aria-hidden className="mt-[1px] shrink-0" />
                  <span>
                    Status only — switching an AI feature is a <strong className="text-text-tertiary">compliance</strong> decision.
                    Ask an Admin or Compliance officer.
                  </span>
                </p>
              )}
            </div>
          )}

          <Link
            href={"/admin/ai-usage" as never}
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted hover:border-brand-500 hover:text-text transition-colors"
          >
            <span className="inline-flex items-center gap-1.5"><I.activity s={12} /> AI usage &amp; spend</span>
            <I.chevronRight s={12} />
          </Link>
        </div>
      )}

      <ConfirmModal
        open={confirmAuto}
        onClose={() => setConfirmAuto(false)}
        onConfirm={confirmAutoOn}
        tone="claret"
        eyebrow="Compliance · Uzingatiaji"
        title="Auto-resolve markets without a human officer?"
        confirmLabel="Yes, enable auto-resolve"
        cancelLabel="Keep human resolution"
        body={
          <>
            <p>
              With this ON, a market reaching its resolve date is sealed by the <strong>AI alone</strong> —
              no human officer — whenever it is at least <strong>{confidenceThreshold}% confident</strong>
              the outcome is locked. The money then pays automatically once the objection window closes.
            </p>
            <p className="mt-2">
              <strong>This overrides human resolution (POCA §16).</strong> A low-confidence or UNKNOWN
              read always falls back to a human officer; the objection window, objection freeze and
              winner-floor still gate every payout; every auto-resolution is audited with the AI&rsquo;s evidence.
            </p>
          </>
        }
      />
    </div>
  );
}

function ToggleRow({
  icon, label, hint, on, disabled, onClick, warn, readOnly, busy,
}: {
  icon: React.ReactNode; label: string; hint: string; on: boolean; disabled?: boolean; onClick: () => void; warn?: boolean;
  /** E-19: the viewer may SEE this switch but not work it — render its state, not a control. */
  readOnly?: boolean;
  /** ⭐ THIS row is the one being saved. Every row is `disabled` while any one is in flight
   *  (a shared transition, deliberately — see `busyRow`), so without this the panel goes
   *  uniformly grey and the officer cannot tell which switch they just moved, or whether
   *  the press registered at all. */
  busy?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-inset px-3 py-2 transition-colors"
      /* The working row is lifted out of the greyed-out panel rather than tinted a new
         colour — no second vocabulary for "in flight", just the row that still reads live. */
      style={busy ? { borderColor: "var(--border-strong)", background: "var(--bg-elevated)" } : undefined}
    >
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 font-display text-body-sm font-bold text-text">
          <span className={warn ? "text-warning-fg" : "text-text-tertiary"}>
            {busy ? <Spinner size={14} /> : icon}
          </span>{label}
        </p>
        {/* ⛔ THE HINT IS REPLACED, NOT DECORATED. It describes the state the switch is IN,
            which is exactly the thing that is mid-change — leaving it up during the save
            states the old setting as current while the new one is being written. */}
        <p className="mt-0.5 text-body-sm text-text-tertiary leading-snug" aria-live="polite">
          {busy ? "Saving…" : hint}
        </p>
      </div>
      {readOnly ? (
        // A STATE, not a disabled control: a greyed-out toggle reads as "temporarily
        // unavailable, try again", which is not what is happening.
        <span
          aria-label={`${label}: ${on ? "on" : "off"} (read-only)`}
          className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] ${
            on ? "border-border-strong bg-bg-elevated text-text-secondary" : "border-border bg-bg-overlay text-text-subtle"
          }`}
        >
          {on ? "On" : "Off"}
        </span>
      ) : (
        <Toggle on={on} disabled={disabled} onClick={onClick} aria-label={`${label}: ${on ? "on" : "off"}`} />
      )}
    </div>
  );
}

/** Build a FormData and call a server action — keeps the call sites terse. */
function act<T>(fn: (fd: FormData) => Promise<T>, fields: Record<string, string>): Promise<T> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fn(fd);
}
