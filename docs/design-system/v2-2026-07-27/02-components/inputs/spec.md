# Inputs — spec (GIVEN)

Contract: Input { prefix?, mono?, placeholder?, value?, error? }. 44px tall, radius --r-md, sunken --bg-inset. Money entry is always .input-group with a TZS prefix and mono numerals; error state swaps border to --danger-500.
Quick-stake chip (BuyTray): 28px, pad 0 12px, r-pill, border --border, mono 12px, ink --text-muted.
GAP: no select, no date/time field exists anywhere in the system (see OPEN-GAPS.md).

## Authoritative CSS
```css
/* ---------- Input ---------- */
.input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  background: var(--bg-inset);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  transition: border-color var(--ease-micro), box-shadow var(--ease-micro), background-color var(--ease-micro);
}

.input.input-mono { font-family: var(--font-mono);
}

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg-inset);
  transition: border-color var(--ease-micro), box-shadow var(--ease-micro);
  overflow: hidden;
}

.input-group .input {
  border: none;
  background: transparent;
  box-shadow: none;
  padding-left: 0;
}

.input-group .input:focus { box-shadow: none;
}

/* Markets board search — an .input-group capped to a tasteful width on desktop
   (full-width on mobile, since the cap exceeds a phone's content width). */
.market-search { max-width: 460px;
}

.market-search .input { flex: 1; min-width: 0; font-size: 13px;
}

/* Win celebration animations are co-located in the component's inline
   <style> tag (same pattern as OperationResultModal / BetConfirmModal). */

/* Brand focus ring opt-in for inputs / ghost buttons that aren't using the
   `.input` class directly. */
.aqua-focus:focus-visible,
.aqua-focus:focus-within {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px oklch(63% 0.18 262 / 0.25);
}

/* Defensive baseline — any keyboard-focusable element that doesn't
   set its own focus-visible style still gets an aqua ring. The kit's
   .btn / .input / link patterns override locally; this catches the
   long tail (custom <a>, <details>, [role="..."], etc.) so a keyboard
   user can never lose focus on the page.

   :where() keeps specificity at 0,0,0 so component-level overrides
   still win without !important. */
:where(a, button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])):focus-visible {
  outline: 2px solid var(--brand-500);
  outline-offset: 2px;
  transition: outline-offset 120ms ease-out;
}
```
