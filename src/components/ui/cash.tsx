"use client";

/**
 * Balance privacy — `Cash` + `CashEye` (kit: DEVELOPER_REFERENCE → "Balance privacy").
 *
 * One eye masks EVERY personal balance at once (banking-app pattern). The
 * shared state lives on `window.__cashHidden` + a `cash-privacy` CustomEvent,
 * so independent React roots (nav pill, wallet page, position cards) stay in
 * sync without a context provider. Persisted to localStorage so the choice
 * survives navigation + reloads.
 *
 * Display-only: this never changes any amount, just whether the numeric part
 * is rendered. The currency prefix + sign are preserved so layout rhythm holds.
 *
 *   <Cash>TZS 84,200</Cash>      → "TZS 84,200"  or  "TZS •••••" when hidden
 *   <CashEye />                  → boxed 28px toggle
 *   <CashEye bare size={14} />   → borderless inline (e.g. the nav balance pill)
 *   useCashHidden()              → boolean, re-renders on toggle
 *   setCashHidden(bool)          → programmatic control
 */

import * as React from "react";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

const EVENT = "cash-privacy";
const STORAGE_KEY = "cashHidden";

declare global {
  // eslint-disable-next-line no-var
  var __cashHidden: boolean | undefined;
}

export function getCashHidden(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.__cashHidden;
}

export function setCashHidden(hidden: boolean): void {
  if (typeof window === "undefined") return;
  window.__cashHidden = hidden;
  try { localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0"); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: hidden }));
}

/** Subscribe to the global mask state. SSR-safe: starts `false`, hydrates in effect. */
export function useCashHidden(): boolean {
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    // Hydrate from storage on mount (deterministic first render avoids mismatch).
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const v = stored === "1";
        window.__cashHidden = v;
        setHidden(v);
      } else {
        setHidden(getCashHidden());
      }
    } catch {
      setHidden(getCashHidden());
    }
    const handler = (e: Event) => setHidden(!!(e as CustomEvent).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return hidden;
}

/** Render a money string; mask the numeric part (keeping currency prefix + sign) when hidden. */
export function Cash({
  children,
  mask = "•••••",
  className,
  style,
}: {
  children: React.ReactNode;
  mask?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const hidden = useCashHidden();
  const text = String(children ?? "");
  if (!hidden) return <span className={className} style={style}>{text}</span>;
  // Preserve a leading non-numeric token (e.g. "TZS ", "+", "-") then mask the rest.
  const m = text.match(/^([^\d]*)/);
  const prefix = m?.[1] ?? "";
  return (
    <span className={className} style={style} aria-label="balance hidden">
      {prefix}{mask}
    </span>
  );
}

/** The global show/hide toggle. `bare` = borderless inline variant. */
export function CashEye({
  bare,
  size = 16,
  className,
}: {
  bare?: boolean;
  size?: number;
  className?: string;
}) {
  const hidden = useCashHidden();
  return (
    <button
      type="button"
      aria-label={hidden ? "Show balances · Onyesha salio" : "Hide balances · Ficha salio"}
      aria-pressed={hidden}
      onClick={() => setCashHidden(!hidden)}
      className={cn(
        "inline-flex items-center justify-center text-text-subtle hover:text-text transition-colors",
        !bare && "h-7 w-7 rounded-md border border-border hover:border-border-strong",
        className,
      )}
    >
      {hidden ? <I.eyeOff s={size} /> : <I.eye s={size} />}
    </button>
  );
}
