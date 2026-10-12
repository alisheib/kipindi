#!/usr/bin/env node
/**
 * qa:lost-chunk — A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL, driven in a real browser (the Vodacom plan
 * S7's live fix L1: `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` A13(b), A23 item 6(a)). It replaces
 * WP6c's untracked lost-chunk drive (VODACOM-PLAN §0i, WP6c's verification 4).
 *
 *   BASE=http://localhost:3061 npm run qa:lost-chunk                       the drive
 *   BASE=http://localhost:3061 npm run qa:lost-chunk -- --expect-crash     the CONTROL reading, L1's one file put back (below)
 *   npm run -s qa:lost-chunk -- --self-test                                the instrument's own controls: no server, no browser
 *
 * WHAT IT DRIVES. A classic page (`/help`: no journey pass is held, and the chat bubble, the primer and the consent
 * prompt all stand on it), once as a guest and once signed in as the demo player. For each reader:
 *   P.chat / P.primer / P.consent   THE PREMISE — nothing aborted: the chat bubble shows; the first-visit primer opens
 *                                   under `?primer=1` and the analytics consent prompt under `?consent=1` (the two
 *                                   switches each part keeps for a drive: automation is never shown either unasked).
 *                                   A part that does not show here cannot be said to have been "left out" below.
 *   L.chat      every request for the chat bubble's chunk aborted   (`layout/lazy-overlays.tsx`, L1)
 *   L.primer    every request for the primer's chunk aborted, under `?primer=1`   (the same file, L1)
 *   L.consent   every request for the consent prompt's chunk aborted, under `?consent=1` — a part of the shell's lazy
 *               module, guarded since S6 WP6c: the cell WP6c's own drive ran, kept here so the older guard stays driven
 *   and for each L cell, four readings:
 *     .0 the chunk was really aborted (a cell that aborted nothing is NOT MEASURED, never a pass);
 *     .1 the page stays up — no critical-error screen, the shell's main landmark still there;
 *     .2 the part is left out (no bubble, no primer dialog, no prompt), after the same wait that showed it in P;
 *     .3 exactly ONE report went to `/api/client-error` (the guard's once-per-page flag).
 *
 * ⭐ HOW A PART'S CHUNK IS FOUND: BY WHAT IT HOLDS, NOT BY ITS NAME. A chunk's file name is the bundler's business —
 * webpack's dev server names it after the module's path, Turbopack after the folder its modules share, a production
 * build after a hash. So every script the page asks for under `/_next/` is fetched by the drive, and the one that holds
 * the part's MARKER — a string only that part's module holds in `src/` (the marker rule `qa:first-load` keeps: checked
 * against every file under `src/` before anything is driven) — is aborted; every other script is handed on unchanged.
 * A marker held by no script a page asked for leaves .0 NOT MEASURED.
 *
 * ⭐ IT IS ITS OWN RED CONTROL (A13(b): "red on L1's parent"). With `lazy-overlays.tsx` as it stood BEFORE L1, its two
 * loaders end in no guard, so the same aborted chunk reaches `global-error.tsx`'s critical-error screen: L.chat.1 and
 * L.primer.1 FAIL, naming that screen, while L.consent still passes (the shell's parts were guarded already) — which
 * also shows the drive can tell a page that fell from one that stood.
 * ⚠️ ONLY THAT ONE FILE GOES BACK, NEVER THE CHECKOUT: L1's parent holds neither this drive nor its package script, so the
 * control keeps the drive (L1's tree) and puts `lazy-overlays.tsx` back as the parent had it. `<L1>` below is L1's
 * commit on the branch being proven. The procedure, ONE SERVER AT A TIME under the machine's heavy-job lock (never two
 * worktrees served at once):
 *   1. on L1's tree: `rm -rf .next`, start an in-memory dev server, run the drive (it must PASS), stop the server;
 *   2. `git checkout <L1>~1 -- src/components/layout/lazy-overlays.tsx`, `rm -rf .next`, start the server and run
 *      `npm run qa:lost-chunk -- --expect-crash`: the tree reader says 0 of lazy-overlays.tsx's 2 loaders end in the
 *      guard, and the run reads the three cells as a control that must hold (the two overlays' pages fall on the
 *      critical-error screen, the consent prompt's stands), exiting 0 only when they do — without the flag, the same run
 *      FAILS L.chat.1 and L.primer.1 on that screen; stop the server;
 *   3. `git checkout <L1> -- src/components/layout/lazy-overlays.tsx`, `rm -rf .next`, and `git status` must be clean.
 * Both runs are recorded in VODACOM-PLAN §0j. The drive prints which of the two trees ITS OWN checkout is (it reads the
 * loaders in `lazy-overlays.tsx`), so a reading is never taken for the other tree's.
 *
 * ⛔ LOCAL ONLY: `http://localhost:PORT`. It signs the demo player in (`/auth/demo`, which a production server does not
 * have) and makes the page send error reports. It changes nothing in the repository. Chromium only: the primer and the
 * consent prompt hide from automation by its user agent, which is what lets each cell ask for exactly one of them.
 * ⛔ SERVICE WORKERS ARE BLOCKED in the drive's contexts: a request a worker makes is not one the drive can abort.
 * Exit: 0 every reading as expected · 1 a FAIL or a NOT MEASURED · 2 refused before it started.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = process.argv.slice(2);
const SELF_TEST = ARGS.includes("--self-test");
const EXPECT_CRASH = ARGS.includes("--expect-crash");
const unknown = ARGS.filter((a) => a !== "--self-test" && a !== "--expect-crash");
if (unknown.length > 0) {
  console.error(`⛔ unknown argument ${unknown.join(" ")} — qa:lost-chunk takes --expect-crash or --self-test`);
  process.exit(2);
}

const PAGE = "/help";
/** How long a cold dev server may take to answer a page, and to show a part once the page is up. */
const GOTO_MS = 240_000;
const SHOWN_MS = 120_000;
/** After a part's chunk is aborted: long enough for the guard to answer, and for the primer's 700 ms and the consent
 *  prompt's 1,200 ms waits to have run out had the part been there after all. */
const SETTLE_MS = 6_000;
const POLL_MS = 250;

/**
 * THE PARTS. `marker` is a string only `file` holds in src/ — it finds the part's chunk whatever the bundler names it.
 * `query` asks the part to show to automation; `shown` counts it on the page (see `PROBE`).
 */
export const PARTS = [
  { id: "chat", name: "the chat bubble", loader: "src/components/layout/lazy-overlays.tsx", l1: true,
    file: "src/components/chat/ChatRoot.tsx", marker: "50pick-chat-history", query: "" },
  { id: "primer", name: "the first-visit primer", loader: "src/components/layout/lazy-overlays.tsx", l1: true,
    file: "src/components/onboarding/first-visit-primer.tsx", marker: "kp-primer-force", query: "?primer=1" },
  { id: "consent", name: "the analytics consent prompt (a part of the shell's lazy module)", loader: "src/components/layout/shell-lazy.tsx", l1: false,
    file: "src/components/analytics/consent-prompt.tsx", marker: "kp-consent-force", query: "?consent=1" },
];
const READERS = ["guest", "player"];

/** Every .ts and .tsx file under src/, as repository paths. */
function srcFiles(dir = "src", out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) srcFiles(rel, out);
    else if (/[.]tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

/** The marker rule: each part's marker is held by exactly one file under src/, the file its row names. */
export function markerProblems(parts = PARTS, read = (f) => readFileSync(join(ROOT, f), "utf8"), files = srcFiles()) {
  const texts = files.map((f) => [f, read(f)]);
  return parts.flatMap((p) => {
    const holders = texts.filter(([, t]) => t.includes(p.marker)).map(([f]) => f);
    return holders.length === 1 && holders[0] === p.file ? []
      : [`${p.id}: ${JSON.stringify(p.marker)} is held by ${holders.length ? holders.join(", ") : "no file"} — it must be held by ${p.file} alone`];
  });
}

/** The critical-error screen's titles in every language, read from the boundary that draws it (never retyped here). */
export function crashTitles(src = readFileSync(join(ROOT, "src/app/global-error.tsx"), "utf8")) {
  const at = src.indexOf("const MINI_DICT");
  const end = at < 0 ? -1 : src.indexOf("} as const;", at);
  if (end < 0) return [];
  return [...src.slice(at, end).matchAll(/^[ \t]*title:[ \t]*("(?:[^"\\]|\\.)*"),?[ \t]*\r?$/gm)].flatMap((m) => {
    try { return [JSON.parse(m[1])]; } catch { return []; }
  });
}

/** The primer dialog's accessible name in every language, read from the dictionary. */
export function primerLabels(src = readFileSync(join(ROOT, "src/lib/i18n-dict.ts"), "utf8")) {
  return [...src.matchAll(/(?<![A-Za-z0-9_])primerLabel:[ \t]*("(?:[^"\\]|\\.)*")/g)].flatMap((m) => {
    try { return [JSON.parse(m[1])]; } catch { return []; }
  });
}

/** How many of `lazy-overlays.tsx`'s two loaders end in the guard, in THIS checkout (comments left out of the count). */
export function guardedOverlayLoaders(src = readFileSync(join(ROOT, "src/components/layout/lazy-overlays.tsx"), "utf8")) {
  const code = src.split("\n").filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join("\n");
  return (code.match(/\.catch\(nothingIfLost\)/g) ?? []).length;
}

/**
 * THE VERDICT, pure, so `--self-test` can hand it readings no server gave. `r` is what a cell read:
 *   { aborted: [urls], crashed, crashTitle, mainUp, shown (how many of the part the page draws), reports }
 * Each row is [label, "PASS" | "FAIL" | "NOT MEASURED", detail].
 */
export function judge(cell, part, r, expectCrash = false) {
  const id = `${cell.reader} · ${cell.id}`;
  if (cell.kind === "premise") {
    const ok = r.shown > 0 && !r.crashed && r.mainUp;
    return [[`${id} · PREMISE: with nothing aborted, ${part.name} shows on ${cell.path}`, ok ? "PASS" : "FAIL",
      ok ? "" : r.crashed ? `the critical-error screen${r.crashTitle ? ` ("${r.crashTitle}")` : ""}` : !r.mainUp ? "the page's main landmark is not there" : "it never showed"]];
  }
  const rows = [];
  const hit = r.aborted.length > 0;
  rows.push([`${id}.0 · the chunk holding ${JSON.stringify(part.marker)} was really aborted`, hit ? "PASS" : "NOT MEASURED",
    hit ? r.aborted.join(", ") : "no script the page asked for holds the marker: nothing was aborted, so nothing below is a reading"]);
  if (!hit) return rows;
  const fell = r.crashed || !r.mainUp;
  const fellAs = r.crashed ? `the critical-error screen${r.crashTitle ? ` ("${r.crashTitle}")` : ""}` : "the page's main landmark is gone";
  if (expectCrash && part.l1) {
    rows.push([`${id}.1 · CONTROL (L1's parent): with no guard on its loader, the same lost chunk reaches the critical-error screen`,
      fell ? "PASS" : "FAIL", fell ? fellAs : "the page stayed up: this tree's loader already ends in the guard, or the drive cannot see a page fall"]);
    return rows;
  }
  rows.push([`${id}.1 · the page stays up: no critical-error screen, the shell's main landmark still there`, fell ? "FAIL" : "PASS", fell ? fellAs : ""]);
  rows.push([`${id}.2 · ${part.name} is left out`, r.shown === 0 ? "PASS" : "FAIL", r.shown === 0 ? "" : `${r.shown} drawn although its chunk was aborted`]);
  rows.push([`${id}.3 · exactly one report to /api/client-error`, r.reports === 1 ? "PASS" : "FAIL", r.reports === 1 ? "" : `${r.reports} sent`]);
  return rows;
}

/** The cells, per reader: the three premises, then the three lost chunks. */
export function cellsFor(reader) {
  return ["premise", "lost"].flatMap((kind) => PARTS.map((p) => ({
    reader, kind, part: p.id, id: `${kind === "premise" ? "P" : "L"}.${p.id}`, path: `${PAGE}${p.query}`,
  })));
}

/* ══ --self-test: the instrument's own controls, with no server and no browser ══════════════════════════════════════ */
function selfTest() {
  let fail = 0;
  const check = (label, cond, detail = "") => { if (!cond) fail += 1; console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${cond || !detail ? "" : ` — ${detail}`}`); };
  const problems = markerProblems();
  check("S1 every part's marker is held by exactly one file under src/, its own module", problems.length === 0, problems.join(" | "));
  const twice = markerProblems([PARTS[0]], (f) => (f === "a.tsx" || f === "b.tsx" ? PARTS[0].marker : ""), ["a.tsx", "b.tsx"]);
  check("S1′ a marker held by two files, or by another file than the row's, is refused", twice.length === 1);
  const titles = crashTitles();
  check("S2 the critical-error screen's three titles are read from global-error.tsx", titles.length === 3 && titles.every((t) => typeof t === "string" && t.length > 10), JSON.stringify(titles));
  check("S2′ a boundary that holds no title table reads as none (the drive then refuses to run)", crashTitles("export default function GlobalError() {}").length === 0);
  const labels = primerLabels();
  check("S3 the primer dialog's three names are read from the dictionary", labels.length === 3, JSON.stringify(labels));
  const before = "const A = dynamic(\n  () => import(\"x\").then(m => m.A),\n  { ssr: false },\n);\n// .catch(nothingIfLost) in a note\n";
  const after = "const A = dynamic(() => import(\"x\").then((m) => m.A).catch(nothingIfLost), { ssr: false });\nconst B = dynamic(() => import(\"y\").then((m) => m.B).catch(nothingIfLost), { ssr: false });\n";
  check("S4 the tree reader counts the loaders that end in the guard, and not a note that names it", guardedOverlayLoaders(before) === 0 && guardedOverlayLoaders(after) === 2);
  const [chat, , consent] = PARTS;
  const lost = { reader: "guest", kind: "lost", part: "chat", id: "L.chat", path: PAGE };
  const stood = { aborted: ["/_next/static/chunks/x.js"], crashed: false, crashTitle: null, mainUp: true, shown: 0, reports: 1 };
  const fell = { ...stood, crashed: true, crashTitle: titles[0] ?? "x", mainUp: false };
  const verdicts = (rows) => rows.map((x) => x[1]).join(",");
  check("S5 a guarded tree's reading passes all four", verdicts(judge(lost, chat, stood)) === "PASS,PASS,PASS,PASS");
  check("S5′ L1's parent's reading FAILS .1, naming the critical-error screen", (() => {
    const rows = judge(lost, chat, fell);
    return rows[1][1] === "FAIL" && rows[1][2].includes("critical-error screen");
  })());
  check("S6 a cell that aborted nothing is NOT MEASURED, and reads nothing else", verdicts(judge(lost, chat, { ...stood, aborted: [] })) === "NOT MEASURED");
  check("S7 a part still drawn fails .2; no report, or two, fails .3",
    verdicts(judge(lost, chat, { ...stood, shown: 1 })) === "PASS,PASS,FAIL,PASS" && verdicts(judge(lost, chat, { ...stood, reports: 0 })) === "PASS,PASS,PASS,FAIL"
      && verdicts(judge(lost, chat, { ...stood, reports: 2 })) === "PASS,PASS,PASS,FAIL");
  check("S8 --expect-crash: an L1 part's page must fall, and a page that stood fails the control",
    verdicts(judge(lost, chat, fell, true)) === "PASS,PASS" && verdicts(judge(lost, chat, stood, true)) === "PASS,FAIL");
  check("S8′ --expect-crash leaves the shell's part to the ordinary four readings (it was guarded before L1)",
    verdicts(judge({ ...lost, part: "consent", id: "L.consent" }, consent, stood, true)) === "PASS,PASS,PASS,PASS");
  const premise = { reader: "guest", kind: "premise", part: "chat", id: "P.chat", path: PAGE };
  check("S9 the premise passes only when the part shows on a page that is up",
    verdicts(judge(premise, chat, { ...stood, shown: 1 })) === "PASS" && verdicts(judge(premise, chat, stood)) === "FAIL" && verdicts(judge(premise, chat, { ...fell, shown: 1 })) === "FAIL");
  check("S10 each reader gets the three premises, then the three lost chunks", cellsFor("guest").map((c) => c.id).join(" ") === "P.chat P.primer P.consent L.chat L.primer L.consent");
  console.log(fail === 0 ? "\nqa:lost-chunk --self-test — every control holds\n" : `\nqa:lost-chunk --self-test — ${fail} control(s) FAILED\n`);
  return fail === 0 ? 0 : 1;
}

/* ══ the drive ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function drive() {
  const { localBase, demoSession, LOCALE_COOKIE } = await import("./live/journey-pass.mjs");
  const BASE = (process.env.BASE || "http://localhost:3061").replace(/\/$/, "");
  if (!localBase(BASE)) {
    console.error(`⛔ REFUSING ${BASE}: this drive signs the demo player in and makes a page send error reports — local dev only, addressed as http://localhost:PORT.`);
    return 2;
  }
  const problems = markerProblems();
  if (problems.length > 0) {
    console.error(`⛔ the marker table does not hold against src/, so no chunk can be told from another:\n  ${problems.join("\n  ")}`);
    return 2;
  }
  const TITLES = crashTitles();
  const LABELS = primerLabels();
  if (TITLES.length !== 3 || LABELS.length !== 3) {
    console.error(`⛔ the drive could not read what it looks for (${TITLES.length} critical-error titles from global-error.tsx, ${LABELS.length} primer names from the dictionary; 3 of each wanted): a drive that cannot see the critical-error screen proves nothing.`);
    return 2;
  }
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health) {
    console.error(`⛔ no server answered at ${BASE}/api/health — start one: rm -rf .next, then npx next dev -p <port> with no DATABASE_URL.`);
    return 2;
  }
  const guarded = guardedOverlayLoaders();
  console.log(`qa:lost-chunk — ${BASE}${PAGE}, as a guest and as the demo player${EXPECT_CRASH ? " — THE CONTROL READING (--expect-crash)" : ""}`);
  console.log(guarded === 2
    ? "  this checkout: both of lazy-overlays.tsx's loaders end in the guard (L1 or later) — every reading below should PASS on a server of this tree"
    : `  this checkout: ${guarded} of lazy-overlays.tsx's 2 loaders end in the guard (lazy-overlays.tsx as L1's parent had it, or older) — on a server of this tree L.chat.1 and L.primer.1 are expected to FAIL on the critical-error screen (A13's control${EXPECT_CRASH ? "" : "; --expect-crash reads it as one"})`);
  if (EXPECT_CRASH && guarded === 2) console.log("  ⚠️ --expect-crash on a tree that carries the guard: the control is expected to FAIL here");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const rows = [];
  const say = (row) => { rows.push(row); console.log(`  ${row[1].padEnd(12)} ${row[0]}${row[2] ? ` — ${row[2]}` : ""}`); };

  /** What the page draws now: the critical-error screen (by its title in any language, or its own frame), the shell's
   *  main landmark, and each part. */
  const PROBE = ({ titles, labels }) => {
    const text = document.body ? document.body.innerText || "" : "";
    const crashTitle = titles.find((t) => text.includes(t)) ?? null;
    return {
      crashed: crashTitle !== null || document.getElementById("ge-coin") !== null,
      crashTitle,
      mainUp: document.querySelector("main#main-content") !== null,
      chat: document.querySelectorAll("button.cm-bubble").length,
      primer: Array.from(document.querySelectorAll('[role="dialog"]')).filter((d) => labels.includes(d.getAttribute("aria-label") || "")).length,
      consent: document.querySelectorAll('[data-testid="consent-prompt"]').length,
    };
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runCell(cell, cookies) {
    const part = PARTS.find((p) => p.id === cell.part);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const seen = { aborted: [], reports: 0, errors: [] };
    try {
      await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: "en", url: BASE }]);
      if (cell.kind === "lost") {
        await ctx.route((url) => url.pathname.startsWith("/_next/"), async (route) => {
          const req = route.request();
          if (req.resourceType() !== "script") return route.continue();
          let res;
          try { res = await route.fetch({ timeout: GOTO_MS }); } catch { return route.continue().catch(() => {}); }
          const body = await res.text();
          if (body.includes(part.marker)) {
            seen.aborted.push(new URL(req.url()).pathname);
            return route.abort("failed");
          }
          // Handed on as fetched: the body is the decoded text, so the headers that described its transfer go.
          const headers = { ...res.headers() };
          delete headers["content-encoding"];
          delete headers["content-length"];
          return route.fulfill({ status: res.status(), headers, body });
        });
      }
      const page = await ctx.newPage();
      page.on("request", (r) => {
        if (r.method() === "POST" && new URL(r.url()).pathname === "/api/client-error") seen.reports += 1;
      });
      page.on("pageerror", (e) => seen.errors.push(String(e?.message ?? e).slice(0, 160)));
      await page.goto(`${BASE}${cell.path}`, { waitUntil: "domcontentloaded", timeout: GOTO_MS });
      const read = () => page.evaluate(PROBE, { titles: TITLES, labels: LABELS }).catch(() => null);
      let now = await read();
      if (cell.kind === "premise") {
        // Until the part shows, the page falls, or the wait runs out.
        for (const until = Date.now() + SHOWN_MS; Date.now() < until && !(now && (now[cell.part] > 0 || now.crashed)); now = await read()) await sleep(POLL_MS);
      } else {
        // Until the chunk has been asked for (and aborted) or the page falls; then the settle, watching for a fall.
        for (const until = Date.now() + SHOWN_MS; Date.now() < until && seen.aborted.length === 0 && !(now && now.crashed); now = await read()) await sleep(POLL_MS);
        for (const until = Date.now() + SETTLE_MS; Date.now() < until && !(now && now.crashed); now = await read()) await sleep(POLL_MS);
        now = await read();
      }
      const r = now ?? { crashed: false, crashTitle: null, mainUp: false, chat: 0, primer: 0, consent: 0 };
      for (const row of judge(cell, part, { aborted: seen.aborted, crashed: r.crashed, crashTitle: r.crashTitle, mainUp: r.mainUp, shown: r[cell.part], reports: seen.reports }, EXPECT_CRASH)) say(row);
      if (seen.errors.length > 0) console.log(`               (script errors on the page, not judged: ${seen.errors.slice(0, 2).join(" | ")})`);
    } catch (e) {
      say([`${cell.reader} · ${cell.id} · the cell could not be driven`, "NOT MEASURED", String(e?.message ?? e).split("\n")[0].slice(0, 200)]);
    } finally {
      await ctx.close().catch(() => {});
    }
  }

  try {
    for (const reader of READERS) {
      console.log(`\n${reader === "guest" ? "A GUEST" : "THE DEMO PLAYER, signed in"}`);
      let cookies = [];
      if (reader === "player") {
        try { cookies = [await demoSession(browser, BASE)]; }
        catch (e) { say([`player · the demo player could not be signed in`, "NOT MEASURED", String(e?.message ?? e).slice(0, 200)]); continue; }
      }
      for (const cell of cellsFor(reader)) await runCell(cell, cookies);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const count = (v) => rows.filter((r) => r[1] === v).length;
  const bad = rows.filter((r) => r[1] !== "PASS");
  console.log(`\nqa:lost-chunk — ${count("PASS")} passed, ${count("FAIL")} failed, ${count("NOT MEASURED")} not measured${EXPECT_CRASH ? " (the control reading)" : ""}`);
  for (const r of bad) console.log(`  · ${r[1]} ${r[0]}${r[2] ? ` — ${r[2]}` : ""}`);
  if (!EXPECT_CRASH && bad.some((r) => r[1] === "FAIL" && / · L[.](?:chat|primer)[.]1 · /.test(r[0]) && r[2].includes("critical-error screen"))) {
    console.log("  ↳ a lost overlay chunk reached the critical-error screen: this is the control's reading (lazy-overlays.tsx as L1's parent had it, A13). With L1's file it is a regression.");
  }
  return bad.length === 0 ? 0 : 1;
}

process.exitCode = SELF_TEST ? selfTest() : await drive();
