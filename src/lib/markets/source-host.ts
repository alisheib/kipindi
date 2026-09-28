/**
 * A source URL's host for DISPLAY ("www." dropped), or null when it does not parse — never the raw URL.
 *
 * ONE definition, two readers: the settled strip names the host it links (`trust-band.tsx`, WP13), and a
 * market's "Settles on …" line falls back to it when the registry has no name for the host
 * (`sourceNameFor`, WP3/WP4).
 *
 * ⛔ NOT A MATCH RULE. `sourceMatchesAny` (`lib/server/source-registry.ts`) is the only place a host is
 * compared with a registered domain; this only prints one. A look-alike domain printed as itself is
 * true; a look-alike domain matched to a registered name would be a lie.
 *
 * ⚠️ NO IMPORTS, NO "use client": the server page and any client component may both call it.
 */
export function sourceHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
