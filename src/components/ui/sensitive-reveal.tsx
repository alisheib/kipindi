"use client";

/**
 * The reveal control for a masked field. Rendered ONLY when the viewer's read cell is `read`
 * (docs/READ-TIERS.md §4c) — a role at the `masked` ceiling never receives this component, so
 * the refusal is the ABSENCE of a control rather than a disabled one.
 *
 * ⭐ IT LOOKS LIKE `profile/ip-reveal.tsx` ON PURPOSE — dots at rest, an eye, one tap. The
 * platform already taught that vocabulary and a second one would read as a different kind of
 * thing. ⛔ IT DOES NOT WORK LIKE IT. `ip-reveal` holds the full value in the DOM and unhides it
 * client-side; that is fine for a player looking at their own address and is exactly what §5.4
 * forbids here. This component is handed ONLY the masked string, and the raw value exists in the
 * page for the first time after a permitted server round trip that writes an audit row (D4).
 *
 * ⚠️ ONCE REVEALED IT STAYS REVEALED FOR THAT RENDER, AND HIDING AGAIN IS LOCAL. Re-hiding does
 * not un-write the audit row and must never look like it does — the read HAPPENED. So the eye
 * toggles the display of a value already fetched, and no second row is written on re-reveal of
 * the same value.
 *
 * ⭐ U19 · "COPY NUMBER" IS A REVEAL (`copyable`). It fetches through the SAME action, so the copy
 * writes the same `pii.revealed` row a look would — and it shows the value it copied, because the
 * read happened and the control must not pretend otherwise. ⛔ It lives HERE, on the `read` branch
 * only: a role at the `masked` ceiling never receives this component, so it has no copy control to
 * find, disable or forge (`test:read-tiers` §8).
 */
import { useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { GlyphSwap } from "@/components/ui/glyph-swap";
import { revealSensitiveAction } from "@/app/admin/players/actions";

export function SensitiveReveal({
  field,
  subjectId,
  masked,
  label,
  copyable = false,
}: {
  field: string;
  subjectId: string;
  masked: string;
  label: string;
  /** Offer "Copy" beside the eye — itself a reveal, through the same audited action. */
  copyable?: boolean;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const onCopy = () => {
    setError(null);
    start(async () => {
      let value = raw;
      if (value === null) {
        const r = await revealSensitiveAction(field, subjectId);
        if (!r.ok) { setError(r.error); return; }
        value = r.value;
        setRaw(value);
      }
      setShown(true);
      if (value === null) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        // The value is on screen (the read happened), so the officer can still select it.
        setError("Couldn't copy — select the number instead.");
      }
    });
  };

  const onClick = () => {
    setError(null);
    // Already fetched → this is a local show/hide. No second audit row for the same value.
    if (raw !== null) { setShown((s) => !s); return; }
    start(async () => {
      const r = await revealSensitiveAction(field, subjectId);
      if (!r.ok) { setError(r.error); return; }
      setRaw(r.value);
      setShown(true);
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        // ⚠️ The accessible name says WHICH field, because a page carries several of these and
        // "Reveal" alone is the same control repeated to a screen reader.
        aria-label={shown ? `Hide ${label}` : `Reveal ${label}`}
        // ⚠️ `sensitive-reveal` carries the REACH, not a size. Measured on production
        // 2026-09-06 the box is 86 × 15px, and it must stay text-sized because it renders
        // mid-sentence in the player header as well as in table cells — see globals.css.
        className="sensitive-reveal inline-flex items-center gap-1.5 font-mono text-caption text-text-tertiary hover:text-text-muted disabled:cursor-default"
      >
        <span>{shown && raw !== null ? raw : masked}</span>
        <GlyphSwap state={shown} className="text-text-subtle">
          {shown ? <I.eyeOff s={10} /> : <I.eye s={10} />}
        </GlyphSwap>
      </button>
      {copyable && (
        <button
          type="button"
          onClick={onCopy}
          disabled={pending}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          className="sensitive-reveal inline-flex items-center font-mono text-caption text-text-tertiary hover:text-text-muted disabled:cursor-default"
        >
          <GlyphSwap state={copied} className="text-text-subtle">
            {copied ? <I.check s={10} /> : <I.copy s={10} />}
          </GlyphSwap>
        </button>
      )}
      {error && <span className="text-caption text-danger">{error}</span>}
    </span>
  );
}
