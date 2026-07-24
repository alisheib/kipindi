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
 */
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import type { AiToolkitStatus } from "@/lib/server/ai-controls";
import {
  setChatbotEnabledAction,
  setPollGenEnabledAction,
  setResolutionAiPausedAction,
  setAutoResolveAction,
} from "@/app/admin/_actions/ai-toolkit";

export function AiToolkit({ status }: { status: AiToolkitStatus }) {
  const [open, setOpen] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const boxRef = useRef<HTMLDivElement>(null);

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

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okTitle: string, okDesc: string, tone: "success" | "warning" = "success") =>
    start(async () => {
      const r = await fn();
      if (!r.ok) { toast({ title: "Couldn't apply", description: r.error, variant: "danger" }); return; }
      toast({ title: okTitle, description: okDesc, variant: tone });
      router.refresh();
    });

  const toggleChatbot = () => {
    const next = !chatbotEnabled;
    run(() => act(setChatbotEnabledAction, { enabled: String(next) }),
      next ? "Chatbot enabled" : "Chatbot disabled",
      next ? "The help assistant is available to players again." : "The help chat widget is hidden and makes no AI calls.",
      next ? "success" : "warning");
  };
  const togglePollGen = () => {
    const next = !pollGenEnabled;
    run(() => act(setPollGenEnabledAction, { enabled: String(next) }),
      next ? "Poll generation enabled" : "Poll generation disabled",
      next ? "Admins can generate market ideas with the AI again." : "The AI poll generator is blocked.",
      next ? "success" : "warning");
  };
  const toggleResolution = () => {
    const nextPaused = resolutionActive; // active → pause; paused → resume
    run(() => act(setResolutionAiPausedAction, { paused: String(nextPaused) }),
      nextPaused ? "AI market resolution PAUSED" : "AI market resolution resumed",
      nextPaused ? "Markets reaching their resolve date go to the two-officer ceremony — no AI call." : "The AI checks each market at its resolve date again.",
      nextPaused ? "warning" : "success");
  };
  const toggleAuto = () => {
    if (autoResolve) {
      // Turning auto OFF is always safe → direct.
      run(() => act(setAutoResolveAction, { auto: "false" }), "Auto-resolve OFF", "Every market is sealed by the two-officer ceremony; the AI only recommends.");
      return;
    }
    setConfirmAuto(true); // turning ON overrides the two-officer rule → confirm
  };
  const confirmAutoOn = () => {
    setConfirmAuto(false);
    run(() => act(setAutoResolveAction, { auto: "true" }),
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
              ? "border-warning-border bg-warning-bg/40 text-warning-fg"
              : "border-border bg-bg-elevated text-text hover:border-brand-500/60"
        }`}
      >
        <I.sparkle s={13} className={!hasKey ? "text-text-subtle" : anyPaused ? "text-warning-fg" : "text-brand-300"} />
        <span className="hidden sm:inline">AI</span>
        <span className="tabular-nums font-semibold">{hasKey ? `${onCount}/4` : "off"}</span>
        <I.chevronDown s={10} className="opacity-50" />
      </button>

      {open && (
        <div
          // Mobile: pin to the viewport's right edge (fixed, anchored to the
          // backdrop-filtered bar) so a 300px panel never runs off the LEFT edge when
          // the button sits mid-bar. Desktop (≥sm): drop under the button as usual.
          className="fixed right-3 top-[58px] sm:absolute sm:right-0 sm:top-full sm:mt-2 w-[300px] max-w-[calc(100vw-24px)] rounded-lg glass-panel p-3.5 shadow-e4 z-50"
          style={{ animation: "np-rise 160ms cubic-bezier(.2,.8,.2,1)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500/12 text-brand-300"><I.sparkle s={15} /></span>
            <div className="min-w-0">
              <p className="font-display text-[13px] font-semibold text-text leading-tight">AI toolkit</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">Every AI feature · one place</p>
            </div>
          </div>

          {!hasKey ? (
            <div className="rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2.5 text-[11.5px] text-warning-fg leading-snug">
              <strong>No ANTHROPIC_API_KEY on this deployment.</strong> Every AI feature below is
              inert regardless of these switches — set the key in Railway to enable AI.
            </div>
          ) : (
            <div className="space-y-1.5">
              <ToggleRow
                icon={<I.bot s={14} />}
                label="Help chatbot"
                hint={chatbotEnabled ? "Player help assistant is live." : "Chat widget hidden; no AI calls."}
                on={chatbotEnabled} disabled={pending} onClick={toggleChatbot}
              />
              <ToggleRow
                icon={<I.shieldcheck s={14} />}
                label="AI market resolution"
                hint={resolutionActive ? "AI checks each market at its resolve date." : "Paused — markets go to the human ceremony."}
                on={resolutionActive} disabled={pending} onClick={toggleResolution}
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
              />
              <ToggleRow
                icon={<I.sparkle s={14} />}
                label="AI poll generation"
                hint={pollGenEnabled ? "Admins can generate market ideas." : "Generator blocked."}
                on={pollGenEnabled} disabled={pending} onClick={togglePollGen}
              />
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
  icon, label, hint, on, disabled, onClick, warn,
}: {
  icon: React.ReactNode; label: string; hint: string; on: boolean; disabled?: boolean; onClick: () => void; warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-inset px-3 py-2">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 font-display text-[12.5px] font-bold text-text">
          <span className={warn ? "text-warning-fg" : "text-text-tertiary"}>{icon}</span>{label}
        </p>
        <p className="mt-0.5 text-[10.5px] text-text-tertiary leading-snug">{hint}</p>
      </div>
      <Toggle on={on} disabled={disabled} onClick={onClick} aria-label={`${label}: ${on ? "on" : "off"}`} />
    </div>
  );
}

/** Build a FormData and call a server action — keeps the call sites terse. */
function act<T>(fn: (fd: FormData) => Promise<T>, fields: Record<string, string>): Promise<T> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fn(fd);
}
