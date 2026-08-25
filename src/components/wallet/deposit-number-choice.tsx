"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * DEPOSIT · "use another number" — `E-215`'s other half, and it points the opposite way.
 *
 * > *"On deposit he can: put by default the one he registered with, and an option to use
 * >  another number."* — Ali, 2026-08-25
 *
 * ⭐ THE ASYMMETRY IS THE WHOLE POINT. Money going OUT may only reach the number the account
 * is registered to (`payoutDestinationFor`, sealed in `wallet-service.withdraw()`). Money
 * coming IN from a friend's or a relative's handset is completely ordinary, and refusing it
 * would break real top-ups for the players least likely to hold the SIM they signed up with.
 * So withdrawal STATES its destination and deposit OFFERS one — same registered number, two
 * different jobs.
 *
 * ⛔ WHY THE AFFORDANCE HAS TO EXIST AT ALL, given the field was already editable. E-210
 * prefilled it, which is a genuine improvement and also a quiet one: a box that already
 * contains your own number reads as *settled*, not as *editable*. The player who needs a
 * different number is exactly the player who will not think to try. An affordance that is
 * only discoverable by attempting to clear a filled field is not an affordance.
 *
 * ⚠️ IT CLEARS AND FOCUSES; IT DOES NOT REPLACE THE FIELD. The `Input` above stays the one
 * control that holds the value, so `deposit/actions.ts` keeps reading exactly the same
 * `msisdn` and every validation it already ran still runs. This component only decides what
 * is in the box and where the caret is.
 *
 * 🔴 AND IT MUST NOT FIGHT THE ERROR ROUND-TRIP. `moneyFormMsisdn` re-seeds the field with
 * whatever was SUBMITTED when the page comes back with an error, precisely so a player who
 * chose another number does not lose it to a validation failure. If this component reset the
 * field on mount it would throw that away and silently restore the account number — on the
 * screen that decides where money is sent from. So the initial state is DERIVED from what
 * the field was rendered with: if it already differs from the registered number, we open in
 * the "another number" state rather than assuming the default.
 */
export function DepositNumberChoice({
  registered,
  current,
  copy,
}: {
  /** The 9-digit local part of the account's own number. */
  registered: string;
  /** What the field was actually seeded with (may be a number the player chose). */
  current: string;
  copy: { useAnother: string; useMine: string };
}) {
  // ⚠️ Derived, not assumed — see the note above. A returning error round-trip carrying a
  // different number opens in the state the player was already in.
  const [other, setOther] = useState(() => current !== "" && current !== registered);
  const first = useRef(true);

  // Only ever touch the input in response to a CLICK. The effect is skipped on mount so the
  // server-rendered value — which may be a deliberate choice surviving an error — stands.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = document.getElementById("msisdn") as HTMLInputElement | null;
    if (!el) return;
    el.value = other ? "" : registered;
    // Fire `input` so React and any listener see the change rather than only the DOM.
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (other) el.focus();
  }, [other, registered]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-1.5 -ml-1"
      onClick={() => setOther((v) => !v)}
    >
      {other ? copy.useMine : copy.useAnother}
    </Button>
  );
}
