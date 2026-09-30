/**
 * THE PREVIEW PASS'S OWN SECRET (Vodacom plan S1) — in its own module so `boot-checks.ts` can ask about it without
 * importing the request-time resolver (`journey-preview.ts` reads cookies and headers).
 *
 * `JOURNEY_PREVIEW_SECRET`, not `SESSION_SECRET`: everything `signSession` seals is mutually verifiable, and a pass
 * must not be something any of those could be passed off as. In production it must be ≥ 32 characters, not a
 * template placeholder, and differ from `SESSION_SECRET` and `AUDIT_CHAIN_SECRET`.
 * ⛔ A MISSING OR UNUSABLE SECRET TURNS THE PREVIEW OFF — NOTHING HERE THROWS. The resolver runs inside AppShell,
 * on every page, and a throw there would take the site down for everyone (the C7 boot-throw outage).
 */

const DEV_SECRET = "dev-only-journey-preview-secret-never-in-production";

/** Is this value usable as the preview secret in production? Exported for boot-checks and the suite. */
export function previewSecretUsable(raw: string | undefined | null): boolean {
  if (typeof raw !== "string" || raw.length < 32) return false;
  if (/placeholder|change[-_ ]?me|replace|paste|your[-_ ]?secret/i.test(raw)) return false;
  if (raw === process.env.SESSION_SECRET || raw === process.env.AUDIT_CHAIN_SECRET) return false;
  return true;
}

/** The key, or null when the preview must stay off. Outside production a fixed dev key stands in. Never throws. */
export function previewSecret(): string | null {
  try {
    const raw = process.env.JOURNEY_PREVIEW_SECRET;
    if (process.env.NODE_ENV === "production") return previewSecretUsable(raw) ? (raw as string) : null;
    return previewSecretUsable(raw) ? (raw as string) : DEV_SECRET;
  } catch {
    return null;
  }
}
