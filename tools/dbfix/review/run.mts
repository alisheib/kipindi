// Read-only: builds the exact -Command string and runs it ONLY against mocked process tables
// (plus one unmocked listing). Nothing here kills anything; the selection only prints PIDs.
import { execFileSync, spawnSync } from "node:child_process";
import { build } from "./harness.mts";

type P = { id: number; parent: number; cmd: string | null };
const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
function mock(procs: P[], live: number[]): string {
  const objs = procs.map((p) =>
    `[pscustomobject]@{ ProcessId=[uint32]${p.id}; ParentProcessId=[uint32]${p.parent}; CommandLine=${p.cmd === null ? "$null" : q(p.cmd)} }`,
  ).join(", ");
  return (
    `$global:MOCK_CIM = @(${objs}); $global:MOCK_LIVE = @(${live.join(",")}); ` +
    `function Get-CimInstance { param([Parameter(Position=0)]$ClassName, $Filter) if ($Filter -ne "Name='postgres.exe'") { throw "bad filter: $Filter" }; $global:MOCK_CIM }; ` +
    `function Get-Process { $global:MOCK_LIVE | ForEach-Object { [pscustomobject]@{ Id = [int]$_ } } }; `
  );
}
// Parse exactly as killOwnOrphans does.
const parse = (out: string) => out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
function select(cwd: string, known: number[], procs: P[], live: number[]): string[] {
  const out = execFileSync("powershell", ["-NoProfile", "-Command", mock(procs, live) + build(cwd, known)], { encoding: "utf8", timeout: 20_000 });
  return parse(out);
}

const A8J_PM = String.raw`F:\kipindi-a8j\node_modules\@embedded-postgres\windows-x64\native\bin\postgres.exe`;
const A8J_KID = (k: string, h: number) => `"F:/kipindi-a8j/node_modules/@embedded-postgres/windows-x64/native/bin/postgres.exe" --forkchild="${k}" ${h}`;
const pm = (id: number, parent: number, dir: string, port: number, bin = A8J_PM) =>
  ({ id, parent, cmd: `${bin} -D ${dir} -p ${port} -c listen_addresses=127.0.0.1` });

const base: P[] = [
  pm(1000, 900, String.raw`F:\kipindi-a8j\.pgscratch`, 5433),       // a8j's own LIVE cluster
  { id: 1004, parent: 1000, cmd: A8J_KID("io_worker", 5940) },
  { id: 1008, parent: 1000, cmd: A8J_KID("checkpointer", 5944) },
  pm(2000, 1900, String.raw`F:\kipindi-s7\.pgscratch`, 5443),         // s7 LIVE (junctioned to a8j)
  { id: 2004, parent: 2000, cmd: A8J_KID("io_worker", 6000) },
  { id: 3004, parent: 3000, cmd: A8J_KID("io_worker", 7000) },        // wp12's ORPHAN (3000 dead)
  pm(5000, 4900, String.raw`F:\kipindi-wp12b\.pgscratch`, 5453),      // prefix sibling LIVE
  { id: 5004, parent: 5000, cmd: A8J_KID("io_worker", 7100) },
  pm(5100, 4900, String.raw`F:\kipindi-wp12\.pgscratch2`, 5454),      // same checkout, other dir
  { id: 5104, parent: 5100, cmd: A8J_KID("io_worker", 7200) },
  { id: 6004, parent: 6000, cmd: A8J_KID("io_worker", 7300) },        // s7's ORPHAN (6000 dead)
  { id: 7004, parent: 7000, cmd: null },                               // unreadable command line
  { id: 8004, parent: 8000, cmd: A8J_KID("io_worker", 7400) },        // a8j's own ORPHAN
  pm(9000, 8900, String.raw`C:\awarkeh\data`, 54330, String.raw`C:\awarkeh\node_modules\@embedded-postgres\windows-x64\native\bin\postgres.exe`),
  { id: 9004, parent: 9000, cmd: `"C:/awarkeh/node_modules/@embedded-postgres/windows-x64/native/bin/postgres.exe" --forkchild="io_worker" 1` },
  { id: 10004, parent: 10000, cmd: `"F:/kipindi-old-build/node_modules/@embedded-postgres/windows-x64/native/bin/postgres.exe" --forkchild="io_worker" 2` },
];
const baseLive = [900, 1000, 1004, 1008, 1900, 2000, 2004, 3004, 4900, 5000, 5004, 5100, 5104, 6004, 7004, 8004, 8900, 9000, 9004, 10004];

const cases: [string, string, number[], P[], number[], string[]][] = [
  ["wp12, no known parent", "F:\\kipindi-wp12", [], base, baseLive, []],
  ["wp12, known dead 3000 (pid file read before stop/start)", "F:\\kipindi-wp12", [3000], base, baseLive, ["3004"]],
  ["wp12, known 1000 but 1000 is LIVE (reused by a8j's postmaster)", "F:\\kipindi-wp12", [1000], base, baseLive, []],
  ["wp12, two known dead [3000,6000]", "F:\\kipindi-wp12", [3000, 6000], base, baseLive, ["3004", "6004"]],
  ["wp12 with its own LIVE postmaster 4000", "F:\\kipindi-wp12", [],
    [...base, pm(4000, 3900, String.raw`F:\kipindi-wp12\.pgscratch`, 5471), { id: 4004, parent: 4000, cmd: A8J_KID("io_worker", 8000) }],
    [...baseLive, 3900, 4000, 4004], ["4000", "4004"]],
  ["a8j (junction target), no known", "F:\\kipindi-a8j", [], base, baseLive, ["1000", "1004", "1008", "3004", "6004", "8004"]],
  ["s7, no known", "F:\\kipindi-s7", [], base, baseLive, ["2000", "2004"]],
  ["wp1 (prefix of wp12)", "F:\\kipindi-wp1", [], base, baseLive, []],
  ["old-build (own node_modules), no known", "F:\\kipindi-old-build", [], base, baseLive, ["10004"]],
  ["empty table", "F:\\kipindi-wp12", [3000], [], [1], []],
  ["wp12: data dir '.pgscratch - Copy' (space boundary)", "F:\\kipindi-wp12", [],
    [{ id: 11000, parent: 1, cmd: `${A8J_PM} -D "F:\\kipindi-wp12\\.pgscratch - Copy" -p 5499` }], [1, 11000], ["11000"]],
  ["wp12: data dir nested '.pgscratch\\sub'", "F:\\kipindi-wp12", [],
    [{ id: 11100, parent: 1, cmd: `${A8J_PM} -D F:\\kipindi-wp12\\.pgscratch\\sub -p 5498` }], [1, 11100], ["11100"]],
  ["odd path with ' $ ( ) [ ] + spaces", "F:\\it's a (test) [x] $y+z.w", [],
    [{ id: 12000, parent: 1, cmd: `"F:\\it's a (test) [x] $y+z.w\\node_modules\\pg\\postgres.exe" -D "F:\\it's a (test) [x] $y+z.w\\.pgscratch" -p 5433` },
     { id: 12004, parent: 12000, cmd: `"F:/it's a (test) [x] $y+z.w/node_modules/pg/postgres.exe" --forkchild="io_worker" 3` },
     { id: 12104, parent: 12100, cmd: `"F:/it's a (test) [x] $y+z.w/node_modules/pg/postgres.exe" --forkchild="io_worker" 4` }],
    [1, 12000, 12004, 12104], ["12000", "12004", "12104"]],
];

let bad = 0;
for (const [label, cwd, known, procs, live, want] of cases) {
  let got: string[];
  try { got = select(cwd, known, procs, live); } catch (e) { got = ["THREW: " + (e as Error).message.split("\n")[0]]; }
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

// What powershell.exe actually receives (Node's quoting on Windows): compare argv[3] to the string we meant.
const cmd = build("F:\\it's a (test) [x] $y+z.w", [3000, 6000]);
const echo = spawnSync("powershell", ["-NoProfile", "-Command",
  "[Console]::Out.Write([Environment]::GetCommandLineArgs()[3]); exit 0; " + cmd], { encoding: "utf8" });
const received = echo.stdout;
console.log("\nargv[3] received intact:", received === "[Console]::Out.Write([Environment]::GetCommandLineArgs()[3]); exit 0; " + cmd,
  `(argc tail check: ${received.length} chars)`);

// The real command, unmocked (lists only), for timing and syntax.
const t0 = Date.now();
const real = execFileSync("powershell", ["-NoProfile", "-Command", build(process.cwd(), [3000])], { encoding: "utf8", timeout: 20_000 });
console.log(`real (unmocked) listing: ${JSON.stringify(parse(real))} in ${Date.now() - t0} ms`);
console.log("\nthe command for F:\\kipindi-wp12 with known [3000]:\n" + build("F:\\kipindi-wp12", [3000]));
console.log("\nthe command with no known:\n" + build("F:\\kipindi-wp12", []).match(/\$gone = [^;]*;/)![0]);
console.log(bad ? `\n${bad} FAILED` : "\nall cases as expected");
