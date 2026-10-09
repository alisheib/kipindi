/**
 * THE MUTATION PROOF FOR R4-J — each plant writes a real defect into a real source file of the worktree, runs the suites
 * that must catch it, and puts the file back BYTE FOR BYTE (sha-256 compared before the next plant; a mismatch stops
 * the run). Run from the worktree:  node <this file>   (cwd F:\kipindi-r4j)
 *
 * A plant passes when every suite named for it exits non-zero AND prints the expected check as a failure.
 * ⛔ Never run while anything else reads the worktree (the suites would read the plant).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const R4J = ["npx", ["tsx", "scripts/visual-pass-r4j.test.mts"]];
const SHELL = ["npx", ["tsx", "scripts/journey-shell.test.mts"]];
const FLAG = ["npx", ["tsx", "scripts/simple-journey-flag.test.mts"]];
const HOST = ["npx", ["tsx", "scripts/needle-host.test.mts"]];

/** file, the exact text to find (once), what to put there, and per suite the failure line it must print. */
const PLANTS = [
  { id: "M1", note: "the journey header back in its Suspense boundary over the bar's empty box (E36)", file: "src/components/layout/app-shell.tsx",
    edits: [["{journeyShown ? <LazyJourneyTopBar user=", '{journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar user='],
      ["invitePaid={invitePaid} /> : <TopAppBar", "invitePaid={invitePaid} /></Suspense> : <TopAppBar"]],
    expect: [[R4J, "FAIL 1.1 ·"], [SHELL, "FAIL 12.shell.bare ·"], [FLAG, "10.shell.chrome.header"]] },
  { id: "M2", note: "the tabs back in theirs (E36: no rail on a slow first paint)", file: "src/components/layout/app-shell.tsx",
    edits: [["{journeyShown ? <LazyJourneyTabs userId={session?.userId ?? null} /> :", "{journeyShown ? <Suspense fallback={null}><LazyJourneyTabs userId={session?.userId ?? null} /></Suspense> :"]],
    expect: [[R4J, "FAIL 1.1 ·"], [SHELL, "FAIL 12.shell.bare ·"]] },
  { id: "M3", note: "the bell's slot empty until hydration again (E36)", file: "src/components/journey/journey-top-bar.tsx",
    edits: [["{pollers.bell && !notFoundShown ? <NotificationsPanel /> : <BellStill label={t.common.notifications} />}", "{pollers.bell && <NotificationsPanel />}"]],
    expect: [[R4J, "FAIL 1.4 ·"], [SHELL, "FAIL 8.poll.bar ·"]] },
  { id: "M4", note: "a journey reader's route change cross-fades the document again (E37)", file: "src/components/ui/route-transition.tsx",
    edits: [[" && !journeyFlagSnapshot()) {", ") {"]], expect: [[R4J, "FAIL 2.1 ·"]] },
  { id: "M5", note: "the desktop destinations' transitions back (two underlines, E41)", file: "src/app/globals.css",
    edits: [[".kp-jnav__link:not(:hover), .kp-jnav__link:not(:hover)::after { transition: none; }", ""]], expect: [[R4J, "FAIL 2.3 ·"]] },
  { id: "M6", note: "the journey rail's fades back (two tabs lit, E41)", file: "src/app/globals.css",
    edits: [[".kp-rail--journey .kp-rail__item, .kp-rail--journey .kp-rail__pip { transition: none; }", ""]], expect: [[R4J, "FAIL 2.4 ·"]] },
  { id: "M7", note: "the root loading file draws the journey's ghost for every reader (E38)", file: "src/app/loading.tsx",
    edits: [[" && (await resolveSimpleJourney()).journey", ""]], expect: [[R4J, "FAIL 3.1 ·"]] },
  { id: "M8", note: "Juu/Chini back to the frameless spinner (E38)", file: "src/components/journey/route-ghost.tsx",
    edits: [['        "/updown": <UpDownLoading />,\r\n', ""]], expect: [[R4J, "FAIL 3.3 ·"]] },
  { id: "M22", note: "a question back to the frameless spinner (E38)", file: "src/components/journey/route-ghost.tsx",
    edits: [['      patterns={[["^/markets/[^/]+$", <MarketDetailLoading />]]}\r\n', ""]], expect: [[R4J, "FAIL 3.3 ·"]] },
  { id: "M9", note: "RoutePick by prefix: /positions' ghost on every page below it (E38)", file: "src/components/ui/route-pick.tsx",
    edits: [["if (Object.prototype.hasOwnProperty.call(routes, pathname)) return <>{routes[pathname]}</>;",
      'const pre = Object.keys(routes).find((k) => k === pathname || (k !== "/" && pathname.startsWith(k))); if (pre) return <>{routes[pre]}</>;']],
    expect: [[R4J, "FAIL 3.5 ·"]] },
  { id: "M10", note: "the hero's intro pulls the market card into the root's first load (E38)", file: "src/components/home/hero-intro.tsx",
    edits: [['import { I } from "@/components/ui/glyphs";', 'import { I } from "@/components/ui/glyphs";\r\nimport { MarketCard } from "@/components/markets/market-card";']],
    expect: [[R4J, "FAIL 3.8 ·"]] },
  { id: "M11", note: "the /account ghost in the board's column (the 100px jump, E38)", file: "src/components/journey/route-ghost.tsx",
    edits: [['function AccountGhost({ t }: { t: Dict }) {\r\n  return (\r\n    <PageContainer tier="reading">', 'function AccountGhost({ t }: { t: Dict }) {\r\n  return (\r\n    <PageContainer tier="board">']],
    expect: [[R4J, "FAIL 3.11 ·"]] },
  { id: "M12", note: "/live's search ghost out of the page's band (R4-H's request)", file: "src/app/live/loading.tsx",
    edits: [['<div className={QUERY_SEARCH_BAND_CLASS} aria-hidden>\r\n        <div className="search-box-wrap">', '<div aria-hidden>\r\n        <div className="search-box-wrap">']],
    expect: [[R4J, "FAIL 3.13 ·"]] },
  { id: "M13", note: "the rest rule stops reading text (the caption under the disc, E40)", file: "src/lib/needle-rest.ts",
    edits: [["return !hits(q.above, abovePad(q.glow), dy)\r\n      && !hits(q.controls, pad, dy) && !(tier.text && hits(q.text, pad, dy))",
      "return !hits(q.above, abovePad(q.glow), dy)\r\n      && !hits(q.controls, pad, dy) && !(false && hits(q.text, pad, dy))"]],
    expect: [[R4J, "FAIL 4.2 ·"], [HOST, "FAIL"]] },
  { id: "M14", note: "the chat bubble stands down on the market not-found again (NEW)", file: "src/components/chat/ChatRoot.tsx",
    edits: [["if (journeyOn && isJourneySurface(pathname) && !notFoundShown) return null;", "if (journeyOn && isJourneySurface(pathname)) return null;"]],
    expect: [[R4J, "FAIL 5.4 · the chat bubble"], [SHELL, "FAIL 11.chat ·"]] },
  { id: "M15", note: "the Needle's gate deaf to the mark (NEW)", file: "src/components/layout/needle.tsx",
    edits: [["}, [hiddenPref, pathname, journeyOn, notFoundShown]);", "}, [hiddenPref, pathname, journeyOn]);"]],
    expect: [[R4J, "FAIL 5.5 ·"], [SHELL, "FAIL 11.needle.deps ·"]] },
  { id: "M16", note: "the Akaunti dot polls a not-found page into 404s again (NEW)", file: "src/components/journey/journey-tabs.tsx",
    edits: [[" && pollers.dot && !notFoundShown", " && pollers.dot"]], expect: [[R4J, "FAIL 5.7 ·"]] },
  { id: "M17", note: "the header lights Maswali on the market not-found again (NEW)", file: "src/components/journey/journey-top-bar.tsx",
    edits: [["const pathname = notFoundShown ? null : route;", "const pathname = route;"]], expect: [[R4J, "FAIL 5.6 ·"]] },
  { id: "M18", note: "the mark never announces its going (NEW)", file: "src/components/ui/not-found-mark.tsx",
    edits: [["    return announceNotFound;\r\n", ""]], expect: [[R4J, "FAIL 5.2 ·"]] },
  { id: "M20", note: "the journey capsule paints the figure before the hide-balances choice is read (E36's protection)", file: "src/components/layout/wallet-balance-pill.tsx",
    edits: [["const hidden = chosen || !choiceRead;", "const hidden = chosen;"]], expect: [[R4J, "FAIL 1.5 ·"], [R4J, "FAIL 1.6 ·"]] },
  { id: "M21", note: "the not-found page's first paint keeps the server's lit pip (NEW)", file: "src/app/globals.css",
    edits: [[":root:has(#kp-not-found) .kp-rail--journey .kp-rail__item[data-on] .kp-rail__pip { background: none; box-shadow: none; }\r\n", ""]],
    expect: [[R4J, "FAIL 5.12 ·"]] },
  { id: "M19", note: "the hook's server snapshot claims a not-found page (NEW)", file: "src/lib/not-found-mark.ts",
    edits: [["export function notFoundServerSnapshot(): boolean {\r\n  return false;", "export function notFoundServerSnapshot(): boolean {\r\n  return true;"]],
    expect: [[R4J, "FAIL 5.1 ·"]] },
];

let held = 0;
const lines = [];
for (const p of PLANTS) {
  const original = readFileSync(p.file);
  const before = sha(original);
  let text = original.toString("utf8");
  for (const [from, to] of p.edits) {
    const n = text.split(from).length - 1;
    if (n !== 1) { console.error(`REFUSED ${p.id}: ${JSON.stringify(from).slice(0, 90)} found ${n}×`); process.exit(2); }
    text = text.replace(from, to);
  }
  const caught = [];
  try {
    writeFileSync(p.file, text);
    for (const [[cmd, args], line] of p.expect) {
      const r = spawnSync(cmd, args, { encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
      const out = `${r.stdout}\n${r.stderr}`;
      const failLines = out.split("\n").filter((l) => /\bFAIL\b/.test(l) && l.includes(line.replace(/^FAIL /, "")));
      const ok = r.status !== 0 && (line === "FAIL" ? /\bFAIL\b/.test(out) : failLines.length > 0);
      caught.push({ suite: args[1], status: r.status, ok, line });
    }
  } finally {
    writeFileSync(p.file, original);
  }
  const after = sha(readFileSync(p.file));
  if (after !== before) { console.error(`RESTORE MISMATCH ${p.id} ${p.file}`); process.exit(3); }
  const all = caught.every((c) => c.ok);
  if (all) held++;
  const row = `${all ? "CAUGHT" : "MISSED"} ${p.id} · ${p.note} — ${caught.map((c) => `${c.suite} exit ${c.status}${c.ok ? "" : " (expected " + c.line + ")"}`).join("; ")} — restored ${after.slice(0, 12)}`;
  lines.push(row);
  console.log(row);
}
console.log(`\nmutation-r4j: ${held}/${PLANTS.length} plants caught, every file restored byte-identical`);
process.exit(held === PLANTS.length ? 0 : 1);
