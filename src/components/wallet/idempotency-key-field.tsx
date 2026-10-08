"use client";

import { useRef } from "react";

/**
 * Hidden idempotency-key input whose value is generated ONCE per mount (per
 * intent) and stays stable across re-renders (audit M6).
 *
 * The old server-rendered `value={crypto.randomUUID()}` regenerated the key on
 * every `revalidatePath("/wallet")` — which fires after each deposit — so a
 * refresh / back / retry submitted a NEW key and the second attempt was NOT
 * deduplicated (a real risk of a double deposit on a flaky 2G connection). A
 * client `useRef` persists across the server re-render, so retrying the same
 * form re-submits the SAME key and the server dedupes it. Mirrors the bet
 * path's per-intent `useRef` key.
 *
 * ⭐ THE `hidden` ATTRIBUTE IS LAYOUT, NOT A REPEAT OF `type="hidden"` (2026-10-08, WP12 tiles 067/068/173/174).
 * Tailwind 3's `space-y-*` gives a margin to every child that FOLLOWS a sibling not carrying `[hidden]`, and an
 * `<input type="hidden">` paints nothing but is still such a sibling. As the first child of the deposit and withdraw
 * forms it handed the first visible child — the method chooser's fieldset — the form's 24px gap ABOVE it: 24px of blank
 * at the top of the card (measured 50px above "CHAGUA NJIA YA KULIPA" / "MAHALI" against 27px above the hero's eyebrow
 * and 24px at the card's sides). With `hidden` the selector skips it, so the card's padding is the only space above
 * its first line. A `hidden` input is still submitted with its form; nothing else about it changes.
 * ⚠️ It was not the only such input: React writes its own `$ACTION_ID_…` hidden input first in every server-action form,
 * so the two money forms now keep their rhythm on an inner wrapper (round 3, 2026-10-08). This attribute still keeps
 * THIS input from counting inside that wrapper.
 */
export function IdempotencyKeyField({ name = "idempotencyKey" }: { name?: string }) {
  const key = useRef<string>(crypto.randomUUID());
  return <input type="hidden" hidden name={name} value={key.current} />;
}
