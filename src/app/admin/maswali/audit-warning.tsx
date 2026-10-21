"use client";

/**
 * ⭐ ONE FEEDBACK FOR AN ACT THAT LANDED WITHOUT ITS FULL AUDIT RECORD (S5-FIX-SRV; "one truth for every consequential
 * act"). Every console act whose service reports `recorded: false` — a seal, a confirmation, a correction, an
 * attestation, an open, a moved close, a week void, the Owner's stop — shows its warning in this one element, in its
 * act's own words ("The … landed, but its audit record could not be fully written. Tell an administrator; …"). The act
 * stands; only its record is short, so this warns and never reports a failure.
 *
 * An act whose control leaves the page as it lands — the open's controls go with the DRAFT state, a voided week leaves
 * the list of weeks to void — RAISES its warning into the page's standing slot (`StandingAuditWarning`), which the page
 * keeps through the refresh that removes the control, and clears when it is left.
 */
import { useEffect, useSyncExternalStore } from "react";

/** The warning, or nothing when there is none. */
export function AuditWarning({ text }: { text: string | null | undefined }) {
  return text ? <p role="alert" className="text-body-sm text-warning w-full">{text}</p> : null;
}

const standing = new Map<string, string>();
const listeners = new Set<() => void>();
const emit = (): void => { for (const l of listeners) l(); };
const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Raise a page's standing warning, or clear it with null (a later act on the same slot that was recorded clears it). */
export function raiseAuditWarning(slot: string, text: string | null): void {
  if (text) standing.set(slot, text);
  else standing.delete(slot);
  emit();
}

/** The page's standing slot: it outlives the control that raised it, and is cleared when the page is left. */
export function StandingAuditWarning({ slot }: { slot: string }) {
  const text = useSyncExternalStore(subscribe, () => standing.get(slot) ?? null, () => null);
  useEffect(() => () => { if (standing.delete(slot)) emit(); }, [slot]);
  return <AuditWarning text={text} />;
}
