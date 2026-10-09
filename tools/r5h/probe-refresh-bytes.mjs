// R5-H · LOCK-TURN PROBE — the bytes each polled page's REFRESH payload carries, on a running server (dev or production),
// and how much of it is a loading ghost's drawn tree. A `router.refresh()` re-renders from the root and Next answers it with
// the route's RSC payload; this asks for the same payload the way the router does (the `RSC: 1` header and the router-state
// tree of the page itself), so the number is per refresh (the RefreshPoller's beat).
//
// Run it against the branch tip, and against the base (95ff793b) for the "before":
//   KP_BASE=http://localhost:3000 KP_COOKIE="kp-locale=sw; <session cookie>" node probe-refresh-bytes.mjs > tip.txt
//   (a journey reader: the session of a player the journey is shown to, or the preview pass cookie; a classic reader: one
//    it is not shown to — run both)
// Expected after R5-H, read as tip minus base: per page the payload shrinks by its segment ghosts' trees and their
// "kp-shimmer-track" nodes go (S/r5h/per-page.log: e.g. /wallet/receipts 16,868 → 541 B of loading elements per refresh,
// journey sw); a page's own in-page Suspense skeleton (e.g. /results' ResultsSkeleton) keeps its nodes in both.
const BASE = process.env.KP_BASE ?? "http://localhost:3000";
const COOKIE = process.env.KP_COOKIE ?? "kp-locale=sw";
const PAGES = ["/markets", "/live", "/updown", "/positions", "/wallet", "/wallet/receipts", "/results", "/leaderboard", "/watchlist",
  ...(process.env.KP_MARKET ? [`/markets/${process.env.KP_MARKET}`] : []), ...(process.env.KP_ROUND ? [`/updown/${process.env.KP_ROUND}`] : [])];
/** The router-state tree a refresh of `path` sends: the page's own segments, the page marked as the refetch point. */
const tree = (path) => {
  const segs = path.split("/").filter(Boolean);
  let node = ["__PAGE__", {}, null, "refetch"];
  for (const s of segs.reverse()) node = [s, { children: node }];
  return encodeURIComponent(JSON.stringify(["", { children: node }, null, null, true]));
};
const ghostNodes = (s) => (s.match(/kp-shimmer-track/g) ?? []).length;
const refs = (s) => [...new Set([...s.matchAll(/(?:loading|ghost|page-loader|loading-shared)[^"\\]*?\.tsx?[^"\\]*?"\s*,\s*\[[^\]]*\]\s*,\s*"([A-Za-z]+)"/g)].map((m) => m[1]))];
console.log(`base ${BASE} · cookie ${COOKIE.split(";")[0]}…`);
console.log("page | refresh payload B | ghost nodes (kp-shimmer-track) | ghost client references named");
for (const p of PAGES) {
  try {
    const r = await fetch(BASE + p, { headers: { RSC: "1", "Next-Router-State-Tree": tree(p), "Next-Url": p, cookie: COOKIE } });
    const body = await r.text();
    console.log(`${p} | ${Buffer.byteLength(body)} | ${ghostNodes(body)} | ${refs(body).join(", ") || "—"}${r.ok ? "" : ` (HTTP ${r.status})`}`);
  } catch (e) { console.log(`${p} | ERROR ${String(e).slice(0, 80)}`); }
}
