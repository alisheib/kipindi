/**
 * THE JOURNEY SHELL'S MARK — the id of an empty, hidden span that AppShell writes into the SERVER'S HTML for a request
 * the resolver shows the journey to, and for no other (the Vodacom plan S6, WP7). `journeyFlagSnapshot` reads it beside
 * the flag's attribute.
 *
 * ⭐ WHY THE FLAG ALONE WAS NOT ENOUGH (the WP7 drive, 2026-10-03). The flag hydrates inside its own Suspense
 * boundary, so it raises `data-journey` a moment after the page hydrates (and since WP6c it also arrives in a chunk of
 * its own, through `next/dynamic` in `layout/shell-lazy.tsx`: later still). The Needle hydrates outside that boundary
 * and started its engine first: on every fresh load of `/` and `/positions` a journey viewer saw it draw for
 * 1–3 frames (≈280–370 ms) and then vanish. The mark is in the HTML before any script runs, so `useSyncExternalStore`
 * finds it in the check it makes right after hydration, and every overlay stands down before it can draw. The flag
 * stays the EVENT that tells a mounted overlay when the shell changes its answer on `router.refresh()`.
 *
 * Pure — no import, no directive: the server shell and the client hook both load it.
 */
export const JOURNEY_SHELL_MARK = "kp-journey-shell";
