/**
 * appUrl() — the ONE source of truth for this deployment's public base URL.
 *
 * Used to build every user-facing absolute link that isn't rendered inside a
 * request (SMS, transactional email, OG images, JSON-LD). Prod sets
 * NEXT_PUBLIC_APP_URL explicitly; this default is the fallback.
 *
 * The custom domain went LIVE (verified 2026-07-20 serving the real app off
 * Railway), so the default is now the domain we actually want users to see. The
 * old kipindi-production.up.railway.app default meant any environment that
 * forgot the env var would email people a railway.app link.
 *
 * Note: pages that DO run inside a request (e.g. /profile/invite) should prefer
 * the actual request host (x-forwarded-host) so the link always matches the URL
 * the user is on, regardless of this env.
 */
const DEFAULT_APP_URL = "https://www.50pick.tz";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
}
