// R5-D · THE MUTATION PROOF (2026-10-09, the visual pass round 5). Each defect the round removed is planted ON DISK in the
// real source, the suite that owns it is run on that tree, and the named check must FAIL; then every file is put back and
// its sha-256 compared with the one taken before the first plant. Run from anywhere:  node mutation-r5d.mjs
// ⛔ Nothing else may run in the worktree while this does (it rewrites real files); it restores them in a `finally`.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = "F:/kipindi-vis";
process.chdir(ROOT);
const TSX = `${ROOT}/node_modules/tsx/dist/cli.mjs`;
const SUITE = {
  r5d: "scripts/visual-pass-r5d.test.mts",
  r4j: "scripts/visual-pass-r4j.test.mts",
  offline: "scripts/offline-neutral.test.mts",
};
const sha = (b) => createHash("sha256").update(b).digest("hex");

/** { name, suite, expect (the FAIL label it must produce), edits: [{ file, from, to, all? }] } — anchors written with \n. */
const PLANTS = [
  // ── F1 · a record page's metadata never decides the page ───────────────────────────────────────────────────────────
  { name: "F1 · the market's metadata swallows a failed read and calls notFound() (round 4's body)", suite: "r5d", expect: /^1\.1 · \/markets\/\[id\]/,
    edits: [{ file: "src/app/markets/[id]/page.tsx", from: "  try { m = await getMarket(id); } catch { return { title: t.market.title }; }\n  if (!m) return notFoundMetadata();", to: "  try { m = await getMarket(id); } catch { /* graceful */ }\n  if (!m) notFound();" }] },
  { name: "F1 · a failed round read titled in English again (\"Up & Down\")", suite: "r5d", expect: /^1\.1 · \/updown\/\[roundId\]/,
    edits: [{ file: "src/app/updown/[roundId]/page.tsx", from: "  } catch { return { title: t.market.udTitle }; }", to: "  } catch { return { title: \"Up & Down\" }; }" }] },
  { name: "F1 · a failed proposal read titled in English again (\"Proposal\")", suite: "r5d", expect: /^1\.1 · \/proposals\/\[id\]/,
    edits: [{ file: "src/app/proposals/[id]/page.tsx", from: "  } catch { return { title: t.proposals.title }; }", to: "  } catch { return { title: \"Proposal\" }; }" }] },
  { name: "F1 · the round's read taken out of its try (a failed read throws beside the page)", suite: "r5d", expect: /^1\.4″/,
    edits: [{ file: "src/app/updown/[roundId]/page.tsx", from: "  try {\n    d = await getRoundDetail(roundId);\n  } catch { return { title: t.market.udTitle }; }", to: "  d = await getRoundDetail(roundId);" }] },
  { name: "F1 · the body's note calls the metadata's catch \"title garnish\" again", suite: "r5d", expect: /^1\.5 /,
    edits: [{ file: "src/app/markets/[id]/page.tsx", from: "  // ⛔ THIS read is the only one that decides the page. generateMetadata reads the market too, and its catch answers the\n  // board's neutral title, never \"missing\" (round 5, F1: a notFound() there replaced the page — its note has why).", to: "  // (generateMetadata's own catch above deliberately stays — title garnish.)" }] },
  { name: "F1 · the market's not-found keeps its stale note (the metadata \"calls notFound()\")", suite: "r5d", expect: /^1\.5 /,
    edits: [{ file: "src/app/markets/[id]/not-found.tsx", from: "CORRECTED IN ROUND 5 (review F1)", to: "NOTE" }] },
  // ── F2 · the static rule keeps only an image or a font ─────────────────────────────────────────────────────────────
  { name: "F2 · a navigation to an image-like address handed to the static rule again", suite: "offline", expect: /^11\.(navigate|offline) /,
    edits: [{ file: "public/sw.js", from: "  if (request.mode === \"navigate\") {", to: String.raw`  if (request.mode === "navigate" && !/\.(woff2?|ttf|otf|svg|png|jpg|webp|ico)$/.test(url.pathname)) {` }] },
  { name: "F2 · the static rule keeps any ok answer again (a page, the router's data)", suite: "offline", expect: /^11\.(rsc|html) /,
    edits: [{ file: "public/sw.js", from: "if (keepable(response)) cache.put(request, response.clone());", to: "if (response.ok) cache.put(request, response.clone());" }] },
  { name: "F2 · the cache name kept at v5 (a name whose rule could keep a page)", suite: "offline", expect: /^2\.name /,
    edits: [{ file: "public/sw.js", from: "const CACHE_NAME = \"50pick-v6\";", to: "const CACHE_NAME = \"50pick-v5\";" }] },
  // ── F3 · the offline document stays fresh ─────────────────────────────────────────────────────────────────────────
  { name: "F3 · a page the network answered no longer refreshes the offline document (install only)", suite: "offline", expect: /^12\.(retry|stale|undated) /,
    edits: [{ file: "public/sw.js", from: "        if (response.ok) event.waitUntil(refreshOffline());\n", to: "" }] },
  { name: "F3 · the refresh sends the session cookie", suite: "offline", expect: /^12\.retry /,
    edits: [{ file: "public/sw.js", from: "return cache.add(precacheRequest(OFFLINE_URL));", to: "return cache.add(OFFLINE_URL);" }] },
  { name: "F3 · every page refetches it (no one look per worker wake)", suite: "offline", expect: /^12\.wake /,
    edits: [{ file: "public/sw.js", from: "  if (offlineLooked) return Promise.resolve();\n", to: "" }] },
  // ── F4 · the mark answers for the path being drawn ────────────────────────────────────────────────────────────────
  { name: "F4 · the hook back to the span's presence (\"not found\" for the next page while the old span is up)", suite: "r4j", expect: /^5\.1 /,
    edits: [{ file: "src/lib/not-found-mark.ts", from: "  return isNotFoundFor(markPath, path);", to: "  return markPath !== null;" }] },
  { name: "F4 · the one decision answers presence", suite: "r4j", expect: /^5\.15 /,
    edits: [{ file: "src/lib/not-found-mark.ts", from: "  return markPath !== null && markPath === path;", to: "  return markPath !== null;" }] },
  { name: "F4 · arrival announced by a passive effect (a transition paints the not-found page with a tab lit first)", suite: "r4j", expect: /^5\.2 /,
    edits: [ // R5-H: the file imports only useLayoutEffect now — the plant brings useEffect in with it
      { file: "src/components/ui/not-found-mark.tsx", from: "import { useLayoutEffect } from \"react\";", to: "import { useEffect, useLayoutEffect } from \"react\";" },
      { file: "src/components/ui/not-found-mark.tsx", from: "  useLayoutEffect(() => { announceNotFound(); }, [path]);", to: "  useEffect(() => { announceNotFound(); }, [path]);" }] },
  { name: "F4 · the mark names no path", suite: "r4j", expect: /^5\.2 /,
    edits: [{ file: "src/components/ui/not-found-mark.tsx", from: "return <span hidden id={NOT_FOUND_MARK} data-path={path} />;", to: "return <span hidden id={NOT_FOUND_MARK} />;" }] },
  // ── F5 · the first paint reads the server's verdict ───────────────────────────────────────────────────────────────
  { name: "F5 · the rule reads the mark alone again (a missing question's first paint keeps its tab lit)", suite: "r4j", expect: /^5\.12 /,
    edits: [{ file: "src/app/globals.css", from: ":root:has(#kp-not-found, template[data-dgst=\"NEXT_HTTP_ERROR_FALLBACK;404\"])", to: ":root:has(#kp-not-found)", all: true }] },
  // ── G1 · the route ghosts are a client chunk ──────────────────────────────────────────────────────────────────────
  { name: "G1 · the ghosts drawn by a server component again (no directive)", suite: "r5d", expect: /^2\.1 /,
    edits: [{ file: "src/components/journey/route-ghost.tsx", from: "\"use client\";\n\n/**\n * THE JOURNEY'S LOADING STATE", to: "/**\n * THE JOURNEY'S LOADING STATE" }] },
  { name: "G1 · the lazy binding turns the server render off (ssr: false — the ghost leaves the first HTML)", suite: "r5d", expect: /^2\.3 /,
    edits: [{ file: "src/components/journey/route-ghost-lazy.tsx", from: ".then((m) => m.JourneyRouteGhost).catch(nothingIfLost));", to: ".then((m) => m.JourneyRouteGhost).catch(nothingIfLost), { ssr: false });" }] },
  { name: "G1 · the lost-chunk guard takes every error", suite: "r5d", expect: /^2\.4 /,
    edits: [{ file: "src/components/journey/route-ghost-lazy.tsx", from: "  if (!(error instanceof Error) || error.name !== \"ChunkLoadError\") throw error;\n", to: "" }] },
  { name: "G1 · the root loading file hands the ghost the whole dictionary (every payload carries it)", suite: "r5d", expect: /^2\.(5|6) /,
    edits: [
      { file: "src/app/loading.tsx", from: "import { LazyJourneyRouteGhost } from \"@/components/journey/route-ghost-lazy\";", to: "import { LazyJourneyRouteGhost } from \"@/components/journey/route-ghost-lazy\";\nimport { getServerT } from \"@/lib/i18n-server\";" },
      { file: "src/app/loading.tsx", from: "    return <LazyJourneyRouteGhost rails={heroRailNames(null)} />;", to: "    return <LazyJourneyRouteGhost rails={heroRailNames(null)} t={(await getServerT()).t} />;" },
    ] },
  { name: "G1 · a second drawing of the deposit's ghost in the root ghost (not the one its loading file renders)", suite: "r5d", expect: /^2\.10 /,
    edits: [{ file: "src/components/journey/route-ghost.tsx", from: "    \"/wallet/deposit\": <DepositGhost journey />,", to: "    \"/wallet/deposit\": <div className=\"mx-auto w-full max-w-form px-3 py-6\" aria-busy=\"true\" />," }] }, // R5-H/R5-G: the routes table
  // ── G1's sibling · the not-found elements ─────────────────────────────────────────────────────────────────────────
  { name: "G1′ · the not-found view drawn on the server again (no directive: ~6 KB in every payload)", suite: "r5d", expect: /^4\.(1|2) /,
    edits: [{ file: "src/components/ui/not-found-view.tsx", from: "\"use client\";\n\nimport Link from \"next/link\";", to: "import Link from \"next/link\";" }] },
  { name: "G1′ · the root not-found reads its words and title out of the client view (a reference on the server)", suite: "r5d", expect: /^4\.3 /,
    edits: [
      { file: "src/components/ui/not-found-view.tsx", from: "import { NotFoundMark } from \"@/components/ui/not-found-mark\";", to: "import { NotFoundMark } from \"@/components/ui/not-found-mark\";\nexport { NOT_FOUND_WORDS, notFoundTitle } from \"@/components/ui/not-found-words\";" },
      { file: "src/app/not-found.tsx", from: "import { NotFoundView } from \"@/components/ui/not-found-view\";\nimport { NOT_FOUND_WORDS, notFoundTitle } from \"@/components/ui/not-found-words\";", to: "import { NOT_FOUND_WORDS, NotFoundView, notFoundTitle } from \"@/components/ui/not-found-view\";" },
    ] },
  // ── G2 · said where it lives ──────────────────────────────────────────────────────────────────────────────────────
  { name: "G2 · the shell's note on the uncontained render error removed", suite: "r5d", expect: /^3\.2 /,
    edits: [{ file: "src/components/layout/app-shell.tsx", from: "A SERVER RENDER ERROR IN EITHER PART IS NO LONGER CONTAINED (round 5, review G2)", to: "A NOTE" }] },
  // ── F4's pattern · the census and the framework pin ──────────────────────────────────────────────────────────────
  { name: "F4′ · a new store reader of a DOM mark, unclassified", suite: "r5d", expect: /^5\.1 /,
    edits: [{ file: "src/lib/journey/header-state.ts", from: "  return { capsule, pill, authPills: !i.isAuthed };\n}", to: "  return { capsule, pill, authPills: !i.isAuthed };\n}\nexport const useMarkShownPlant = () => useSyncExternalStore(() => () => {}, () => document.getElementById(\"kp-x\") !== null, () => false);" }] },
  { name: "F4′ · cacheComponents turned on (left pages kept in a hidden <Activity>)", suite: "r5d", expect: /^5\.2 /,
    edits: [{ file: "next.config.ts", from: "  experimental: {", to: "  cacheComponents: true,\n  experimental: {" }] },
];

const files = [...new Set(PLANTS.flatMap((p) => p.edits.map((e) => e.file)))];
const original = new Map(files.map((f) => [f, readFileSync(f)]));
const before = new Map(files.map((f) => [f, sha(original.get(f))]));
const results = [];
let caught = 0;
try {
  for (const p of PLANTS) {
    const touched = [...new Set(p.edits.map((e) => e.file))];
    let landed = true, why = "";
    for (const e of p.edits) {
      const text = readFileSync(e.file, "utf8");
      const crlf = text.includes("\r\n");
      const from = crlf ? e.from.replace(/\r?\n/g, "\r\n") : e.from;
      const to = crlf ? e.to.replace(/\r?\n/g, "\r\n") : e.to;
      const n = text.split(from).length - 1;
      if (e.all ? n < 1 : n !== 1) { landed = false; why = `anchor found ${n}× in ${e.file}`; break; }
      writeFileSync(e.file, e.all ? text.split(from).join(to) : text.replace(from, () => to));
    }
    let hit = false, fails = [], status = null;
    if (landed) {
      const r = spawnSync(process.execPath, [TSX, SUITE[p.suite]], { encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
      status = r.status;
      const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
      fails = [...out.matchAll(/FAIL (.+)$/gm)].map((m) => m[1].trim());
      hit = r.status !== 0 && fails.some((l) => p.expect.test(l));
    }
    for (const f of touched) writeFileSync(f, original.get(f));
    const restored = touched.every((f) => sha(readFileSync(f)) === before.get(f));
    if (hit && restored) caught++;
    results.push({ name: p.name, suite: p.suite, landed, why, hit, status, restored, failing: fails.map((l) => l.slice(0, 70)) });
    console.log(`${hit && restored ? "CAUGHT" : "MISSED"}  ${p.name}  [${p.suite}${landed ? `, exit ${status}` : `, NOT LANDED: ${why}`}]${hit ? `  → ${fails.filter((l) => p.expect.test(l)).map((l) => l.split(" · ")[0]).join(", ")}` : `  failing: ${fails.slice(0, 4).map((l) => l.split(" · ")[0]).join(", ") || "(none)"}`}${restored ? "" : "  ⛔ NOT RESTORED"}`);
  }
} finally {
  for (const f of files) if (sha(readFileSync(f)) !== before.get(f)) writeFileSync(f, original.get(f));
}
const intact = files.filter((f) => sha(readFileSync(f)) === before.get(f));
console.log(`\nMUTATION PROOF r5d — ${caught}/${PLANTS.length} plants caught on their named check · ${intact.length}/${files.length} files byte-identical after (sha-256)`);
for (const f of files) console.log(`  ${before.get(f).slice(0, 16)}…  ${sha(readFileSync(f)) === before.get(f) ? "==" : "!="}  ${f}`);
process.exit(caught === PLANTS.length && intact.length === files.length ? 0 : 1);
