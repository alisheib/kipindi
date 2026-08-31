/**
 * B-8 — one wrapper for every admin mutation call site.
 *
 * `requireStaff` (and any server failure) THROWS out of a Server Action; a
 * throw escapes `startTransition`, clears the pending state, and shows the
 * officer NOTHING — a money control that ends its spinner silently. Wrapping
 * the awaited action maps a throw onto the same `{ ok:false, error }` shape
 * every control already renders, so the failure surfaces through the existing
 * toast / ActionOverlay path instead of vanishing.
 *
 * The message is deliberately non-committal: after a thrown action the client
 * cannot know whether the mutation applied. Say so; tell the officer to
 * refresh before retrying.
 */
/**
 * ⭐ DG-S-05 (2026-08-31) — the failure shape carries an optional `field`, so a refusal can name
 * the control an operator has to fix and `focusFirstInvalid` can take them there. ⛔ OPTIONAL,
 * and additive: every existing `{ ok: false, error }` still satisfies this and still renders
 * exactly as it does today. The thrown-error path below cannot name a field — it does not know
 * one — and says so by omitting it rather than guessing.
 */
export async function runAdminAction<T>(fn: () => Promise<T>): Promise<T | { ok: false; error: string; field?: string }> {
  try {
    return await fn();
  } catch (e) {
    // A Next.js redirect() also throws — rethrow it so auth/step-up redirects
    // keep working (they are navigation, not failure).
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")) throw e;
    // In production Next masks thrown server errors, so e.message is generic —
    // lead with the honest instruction and append whatever detail survives.
    const detail = e instanceof Error && e.message ? ` (${e.message.slice(0, 140)})` : "";
    return { ok: false, error: `Server error — nothing may have applied. Refresh before retrying.${detail}` };
  }
}
