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
 */
export function IdempotencyKeyField({ name = "idempotencyKey" }: { name?: string }) {
  const key = useRef<string>(crypto.randomUUID());
  return <input type="hidden" name={name} value={key.current} />;
}
