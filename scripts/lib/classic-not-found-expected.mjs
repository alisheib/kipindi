/**
 * MASWALI-BUILD S5 VIS-P P14: the shared 404 hint now describes any missing page.
 * These are the exact rendered `notFound.main` transitions observed against the
 * a504ad28 live-main baseline. The rest of each cell remains strict.
 */
const ROUTES = ["/account", "/kp-parity-no-such-page"];
const CELLS_PER_LOCALE = 4 /* viewers */ * 4 /* widths */ * ROUTES.length;

export const CLASSIC_NOT_FOUND_EXPECTED = [
  {
    id: "maswali-neutral-404-en",
    field: "notFound.main",
    routes: ROUTES,
    from: "404 · PAGE NOT FOUND We couldn’t find that page The link may be stale, the market may have resolved, or the URL was typed in slightly off. Pick a destination below to keep going. Home Markets Help BROWSE OPEN MARKETS",
    to: "404 · PAGE NOT FOUND We couldn’t find that page The link may be out of date, or the address was typed slightly off. Pick a destination below to keep going. Home Markets Help BROWSE OPEN MARKETS",
    cells: CELLS_PER_LOCALE,
    reason: "MASWALI-BUILD S5 VIS-P P14: the shared English 404 hint names an old link or a mistyped address, not a resolved market. The exact whole `notFound.main` text changed in every classic /account and unmatched-path control; no status, title, robots, region, geometry or other route changed.",
  },
  {
    id: "maswali-neutral-404-sw",
    field: "notFound.main",
    routes: ROUTES,
    from: "404 · HAKUNA UKURASA Hatukupata ukurasa huo Kiungo kinaweza kuwa kimepitwa na wakati, soko linaweza kuwa limetatuliwa, au URL imeandikwa vibaya. Chagua mahali pa kwenda hapa chini. Mwanzo Masoko Msaada TAZAMA MASOKO YALIYO WAZI",
    to: "404 · HAKUNA UKURASA Hatukupata ukurasa huo Kiungo kinaweza kuwa kimepitwa na wakati, au anwani imeandikwa vibaya kidogo. Chagua mahali pa kwenda hapa chini. Mwanzo Masoko Msaada TAZAMA MASOKO YALIYO WAZI",
    cells: CELLS_PER_LOCALE,
    reason: "MASWALI-BUILD S5 VIS-P P14: the shared Swahili 404 hint now describes an old link or mistyped address for every product. The exact whole `notFound.main` text changed in every classic /account and unmatched-path control; no status, title, robots, region, geometry or other route changed.",
  },
];
