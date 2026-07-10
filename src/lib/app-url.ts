/**
 * appUrl() — the ONE source of truth for this deployment's public base URL.
 *
 * Used to build every user-facing absolute link that isn't rendered inside a
 * request (SMS, transactional email, OG images, JSON-LD). Defaults to the
 * current Railway host so links work on the live deploy today; set
 * NEXT_PUBLIC_APP_URL to the custom domain (https://www.50pick.tz) when it goes
 * live and every link follows — no code change.
 *
 * Note: pages that DO run inside a request (e.g. /profile/invite) should prefer
 * the actual request host (x-forwarded-host) so the link always matches the URL
 * the user is on, regardless of this env.
 */
const DEFAULT_APP_URL = "https://kipindi-production.up.railway.app";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
}
