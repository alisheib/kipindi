/**
 * THE MUTATION PROOF FOR R6-B — each plant writes a real defect into a real file of the worktree, runs the suites that
 * must catch it, and puts the file back BYTE FOR BYTE (sha-256 compared after every plant; a mismatch stops the run).
 * Run from anywhere:  node <this file>        (it works in F:/kipindi-r6b)
 *
 * A plant is CAUGHT when every suite named for it exits non-zero AND prints its expected check as a FAIL line.
 * ⛔ Never run while anything else reads the worktree (a suite would read the plant). Every original is also copied to
 * mut-backup/ beside this file before it is planted, and restored in a `finally`.
 * Anchors are written with \n and matched in the file's own line endings (CRLF here). Anchors that hold a backslash are
 * String.raw literals (the backslash exactly as the file has it); anchors that hold `${` are plain strings.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "F:/kipindi-wip"; // the merged tree (2026-10-09)
const HERE = dirname(fileURLToPath(import.meta.url));
const LOG = join(HERE, "mutation-r6b-vis.log");
const BACKUP = join(HERE, "mut-backup-vis");
mkdirSync(BACKUP, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const suite = (file) => ["npx", ["tsx", `scripts/${file}`]];
const R6B = suite("visual-pass-r6b.test.mts"), PROXY = suite("proxy-scope.test.mts"), CACHE = suite("static-cache-scope.test.mts");
const EWP = suite("enter-where-pressed.test.mts"), R5A = suite("visual-pass-r5a.test.mts"), R5E = suite("visual-pass-r5e.test.mts"), R4H = suite("visual-pass-r4h.test.mts");

const MODAL = "src/components/ui/modal.tsx", CHART = "src/components/charts/terminal-chart.tsx", NS = "src/lib/server/notification-service.ts";
const PLANTS = [
  // ── A4 · the hotfix (proxy.ts, next.config.ts) ────────────────────────────────────────────────────────────────────────
  { id: "A4a", note: "the favicons back to an unescaped, unanchored prefix (/favicon.icon, /favicon.ico/x skip the proxy)", file: "src/proxy.ts",
    edits: [[String.raw`favicon\\.ico$|favicon\\.svg$`, "favicon.ico|favicon.svg"]], expect: [[PROXY, "1.2"], [PROXY, "3.5"]] },
  { id: "A4b", note: "next.config's /:path* security rule taken out (a page the proxy skips is frameable again)", file: "next.config.ts",
    edits: [["      { source: \"/:path*\", headers: staticSecurityHeaders(process.env.NODE_ENV === \"production\") },\n", ""]], expect: [[CACHE, "5.1"], [CACHE, "5.3"]] },
  { id: "A4c", note: "a CSP put into the every-response rule (it must stay the proxy's, per request)", file: "next.config.ts",
    edits: [["headers: staticSecurityHeaders(process.env.NODE_ENV === \"production\") },", "headers: [...staticSecurityHeaders(process.env.NODE_ENV === \"production\"), { key: \"Content-Security-Policy\", value: \"default-src 'self'\" }] },"]],
    expect: [[CACHE, "5.2"]] },
  { id: "A4d", note: "HSTS sent in development too", file: "next.config.ts",
    edits: [["staticSecurityHeaders(process.env.NODE_ENV === \"production\")", "staticSecurityHeaders(true)"]], expect: [[CACHE, "5.1"]] },
  { id: "A4e", note: "the proxy defines its own header list again (two senders that can drift)", file: "src/proxy.ts",
    edits: [["import { PROD_HEADERS, SECURITY_HEADERS } from \"@/lib/security-headers\";", "import { PROD_HEADERS } from \"@/lib/security-headers\";\nconst SECURITY_HEADERS: Record<string, string> = { \"X-Frame-Options\": \"DENY\" };"]],
    expect: [[CACHE, "5.4"]] },
  // ── B-1 · the focus trap (modal.tsx) ──────────────────────────────────────────────────────────────────────────────────
  { id: "B1a", note: "round 5's trap: with nothing focusable, Tab is the browser's own (it leaves the dialog)", file: MODAL,
    edits: [["      if (f.length === 0) { e.preventDefault(); panelRef.current?.focus(); return; }", "      if (f.length === 0) return;"]], expect: [[R6B, "1.3"]] },
  { id: "B1b", note: "the panel takes no script focus (focusIn's and the trap's fallback dead again)", file: MODAL,
    edits: [["        tabIndex={-1}\n        /* ⭐ `data-rung` IS THE ADOPTION LEDGER", "        /* ⭐ `data-rung` IS THE ADOPTION LEDGER"]], expect: [[R6B, "1.8"]] },
  { id: "B1c", note: "focus on the panel treated as inside (Shift+Tab from it walks out behind the scrim)", file: MODAL,
    edits: [["      if (!panelRef.current?.contains(active) || active === panelRef.current) {", "      if (!panelRef.current?.contains(active)) {"]], expect: [[R6B, "1.5"]] },
  { id: "B1d", note: "round 5's `safe`: focus handed to a disabled Cancel (nowhere)", file: MODAL,
    edits: [["      safe: () => {\n        const way = safeFocusRef.current?.current ?? null;\n        return way === null ? null : way.isConnected && !way.matches(\":disabled\") ? way : panelRef.current;\n      },", "      safe: () => safeFocusRef.current?.current ?? null,"]],
    expect: [[R6B, "1.10"], [EWP, "5.8"]] },
  // ── B-2 · the chart's retries (terminal-chart.tsx) ────────────────────────────────────────────────────────────────────
  { id: "B2a", note: "round 5's poll, awaiting each request (requests at 0, 30, 160, 290s against a stall)", file: CHART,
    edits: [["      timer = setTimeout(() => {\n        if (inFlight === null || (inFlight.overdue && !inFlight.answering)) void load();\n        if (alive) paceNext();\n      }, wait);", "      timer = setTimeout(async () => { await load(); if (alive) paceNext(); }, wait);"]],
    expect: [[R6B, "2.1"]] },
  { id: "B2b", note: "an answer's start no longer marked (a slow body is replaced at the next poll and never draws)", file: CHART,
    edits: [["        mine.answering = true; // its answer has begun: a poll waits for it, so a slow body still draws (B-2, above)\n", ""]], expect: [[R6B, "2.5"]] },
  { id: "B2c", note: "a new request no longer aborts the one before it (hung requests pile up)", file: CHART,
    edits: [["      inFlight?.abort.abort(); // a newer request owns the state: the one before it stands down, its connection freed\n", ""]], expect: [[R6B, "2.1"]] },
  { id: "B2d", note: "a request no longer chained to the effect's abort (a closed chart's request runs on)", file: CHART,
    edits: [["      ac.signal.addEventListener(\"abort\", chained);\n", ""]], expect: [[R6B, "2.6"]] },
  { id: "B2e", note: "the deadline no longer marks its request overdue (the poll waits the stall out)", file: CHART,
    edits: [["        mine.overdue = true; // unanswered past its deadline: presumed hung, so the next poll replaces it (B-2, above)\n", ""]], expect: [[R6B, "2.1"], [R5A, "11.3"]] },
  // ── B-3 · the three readers ───────────────────────────────────────────────────────────────────────────────────────────
  { id: "B3a", note: "moneySentence back on the quadratic pattern", file: "src/lib/fill-nodes.tsx",
    edits: [["  let at = IDEOGRAPH.test(text) ? -1 : lastTwoWordsAt(text);", String.raw`  let at = IDEOGRAPH.test(text) ? -1 : text.search(/\S+\s+\S+\s*$/);`]], expect: [[R6B, "3.4"]] },
  { id: "B3b", note: "KeepHyphenated back on the quadratic split", file: "src/app/live/pulse-grid.tsx",
    edits: [["  const parts = hyphenParts(text);", String.raw`  const parts = text.split(/([^\s\p{Script=Han}]*(?:\p{L}-[\p{L}\p{N}]|\p{N}-\p{L})[^\s\p{Script=Han}]*)/u);`]],
    expect: [[R6B, "3.4"], [R4H, "4.6"]] },
  { id: "B3c", note: "endClause back on the quadratic pattern", file: "src/lib/notification-text.ts",
    edits: [["  let end = t.length;\n  while (end > 0 && (t[end - 1] === \".\" || t[end - 1] === \"。\")) end--;\n  return `${t.slice(0, end)}${stop}`;", "  return `${t.replace(/[.。]+$/, \"\")}${stop}`;"]],
    expect: [[R6B, "3.4"]] },
  { id: "B3d", note: "lastTwoWordsAt stops after the space (one word short of the pattern's answer)", file: "src/lib/fill-nodes.tsx",
    edits: [["  while (i > 0 && !SPACE.test(text[i - 1])) i--; // the word before it\n", ""]], expect: [[R6B, "3.1"]] },
  { id: "B3e", note: "hyphenParts no longer runs a token on past its core (\"month-end?\" cut to \"h-e\")", file: "src/app/live/pulse-grid.tsx",
    edits: [["    const end = runEnd[at + 3];", "    const end = at + 3;"]], expect: [[R6B, "3.1"], [R6B, "3.5"]] },
  // ── B-4 · the name's cut ──────────────────────────────────────────────────────────────────────────────────────────────
  { id: "B4a", note: "the editor re-derives the cut in the browser (round 5's keepNameEnd)", file: "src/components/profile/name-editor.tsx",
    edits: [["import { nameWithEnd } from \"@/components/ui/keep-words\";", "import { keepNameEnd, nameWithEnd } from \"@/components/ui/keep-words\";"],
      ["? nameWithEnd(currentName, currentNameEnd) : (", "? keepNameEnd(currentName) : ("]],
    expect: [[R6B, "4.5"], [R6B, "4.7"], [R5E, "4.4"], [R4H, "2.1"]] },
  { id: "B4b", note: "the server page no longer hands its cut down", file: "src/app/profile/page.tsx",
    edits: [["              currentNameEnd={nameEndAt(user.displayName ?? \"\")}", "              currentNameEnd={-1}"]], expect: [[R6B, "4.5"]] },
  { id: "B4c", note: "nameWithEnd draws at a cut that cuts nothing", file: "src/components/ui/keep-words.tsx",
    edits: [["  if (!Number.isInteger(at) || at <= 0 || at >= name.length) return name;", "  if (at < 0) return name;"]], expect: [[R6B, "4.2"]] },
  // ── A5 · the old ".." ─────────────────────────────────────────────────────────────────────────────────────────────────
  { id: "A5a", note: "round 5's mend (\"..\" anywhere: \"range 1..2\" → \"range 1.2\")", file: "src/lib/notification-text.ts",
    edits: [[String.raw`.replace(/(^|[^.])\.\.(?=\s|$)/g, "$1.")`, String.raw`.replace(/(^|[^.])\.\.(?!\.)/g, "$1.")`]], expect: [[R6B, "5.2"], [R6B, "5.4"]] },
  // ── A6 · a round in its page's words ──────────────────────────────────────────────────────────────────────────────────
  { id: "A6a", note: "the round page's <title> back on the stored English title", file: "src/app/updown/[roundId]/page.tsx",
    edits: [["  return { title: roundName(t, pickLocalized(locale, d.asset.nameEn, d.asset.nameSw, d.asset.nameZh), d.round.durationMinutes) };", "  return { title: d.titleEn };"]],
    expect: [[R6B, "6.5"]] },
  { id: "A6b", note: "/positions/performance's rows back on the stored title", file: "src/app/positions/performance/page.tsx",
    edits: [["      title: m ? titleOf(m) : p.marketId.slice(0, 8),", "      title: m ? pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh) : p.marketId.slice(0, 8),"]], expect: [[R6B, "6.6"]] },
  { id: "A6c", note: "the stored Swahili title read with the page's words (no stored round reads back)", file: "src/lib/updown-round-name.ts",
    edits: [[String.raw`const STORED_SW = /^(.+) Juu au Chini · dakika (\d+)$/;`, String.raw`const STORED_SW = /^(.+) Juu na Chini · dakika (\d+)$/;`]], expect: [[R6B, "6.1"]] },
  // ── A7 · the win notice ───────────────────────────────────────────────────────────────────────────────────────────────
  { id: "A7a", note: "the win's Swahili quotes its market whole again (round 5)", file: NS,
    edits: [["    bodySw: `${clipQuote(label.sw, 70)} kimelipa. Bonyeza kuona.`,", "    bodySw: `${label.sw} kimelipa. Bonyeza kuona.`,"]], expect: [[R6B, "7.1"]] },
  { id: "A7b", note: "the win's Swahili room split from its family (50 where the loss and the refund cut at 70)", file: NS,
    edits: [["    bodySw: `${clipQuote(label.sw, 70)} kimelipa. Bonyeza kuona.`,", "    bodySw: `${clipQuote(label.sw, 50)} kimelipa. Bonyeza kuona.`,"]], expect: [[R6B, "7.1"], [R6B, "7.2"]] },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const runSuite = ([cmd, args]) => spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
const say = (s) => { console.log(s); appendFileSync(LOG, s + "\n"); };
writeFileSync(LOG, `# R6-B mutation proof · ${new Date().toISOString()} · ${PLANTS.length} plants\n`);
const cache = new Map();
let caught = 0, missed = 0;
for (const p of PLANTS) {
  const path = `${ROOT}/${p.file}`;
  const original = readFileSync(path);
  const before = sha(original);
  copyFileSync(path, join(BACKUP, `${p.id}-${basename(p.file)}`));
  const text = original.toString("utf8");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  let planted = text, bad = "";
  for (const [from, to] of p.edits) {
    const f = from.replace(/\n/g, nl), t = to.replace(/\n/g, nl);
    const n = planted.split(f).length - 1;
    if (n !== 1) { bad = `anchor occurs ${n} times: ${JSON.stringify(from.slice(0, 70))}`; break; }
    planted = planted.replace(f, () => t);
  }
  if (bad) { missed++; say(`MISSED  ${p.id} · ${p.note} — the plant could not be made: ${bad}`); continue; }
  const results = [];
  try {
    writeFileSync(path, planted, "utf8");
    for (const [s, check] of p.expect) {
      const key = `${s[1].join(" ")}`;
      const r = runSuite(s);
      const out = String(r.stdout ?? "") + String(r.stderr ?? "");
      const hit = r.status !== 0 && new RegExp(`FAIL ${esc(check)} `).test(out);
      results.push({ suite: key.replace("tsx scripts/", ""), check, status: r.status, hit });
    }
  } finally {
    writeFileSync(path, original);
    const after = sha(readFileSync(path));
    if (after !== before) { say(`RESTORE MISMATCH ${p.file} — STOPPING (backup in ${BACKUP})`); process.exit(2); }
  }
  const ok = results.every((r) => r.hit);
  if (ok) caught++; else missed++;
  say(`${ok ? "CAUGHT " : "MISSED "} ${p.id} · ${p.note} — ${results.map((r) => `${r.suite} ${r.check}: ${r.hit ? "FAIL ✓" : `exit ${r.status}, no FAIL line`}`).join(" · ")} · restored ${before.slice(0, 12)} ✓`);
}
say(`\nMUTATION — ${caught}/${PLANTS.length} caught, ${missed} missed; every file restored byte for byte (sha-256).`);
process.exit(missed === 0 ? 0 : 1);
