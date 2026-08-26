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
}: {
  field: string;
  subjectId: string;
  masked: string;
  label: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
        className="inline-flex items-center gap-1.5 font-mono text-caption text-text-tertiary hover:text-text-muted disabled:cursor-default"
      >
        <span>{shown && raw !== null ? raw : masked}</span>
        <GlyphSwap state={shown} className="text-text-subtle">
          {shown ? <I.eyeOff s={10} /> : <I.eye s={10} />}
        </GlyphSwap>
      </button>
      {error && <span className="text-caption text-danger">{error}</span>}
    </span>
  );
}
