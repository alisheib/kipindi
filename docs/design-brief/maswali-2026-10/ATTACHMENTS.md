# `MASWALI-DESIGN-R2` — sending the commission (session D1)

> Part of the R2 commission folder; the folder's purpose and boundary are in [`BRIEF.md`](BRIEF.md). The tracker is
> [`MASWALI-PLAN.md`](../../MASWALI-PLAN.md). A Claude Code session on its own branch does all of this (AGENTS.md §4).
> **Ali only uploads and pastes.**

**A1 · Filing — done in S0 (2026-10-16).** Ali's rulings are recorded in `docs/COMPLIANCE-DECISIONS.md` § "2026-10-16 ·
Maswali Millionea — the management-reviewed proposal of 2026-10-16 is final; every 2026-08-29 Maswali ruling is void
(owner)", and the two 2026-08-29 entries are marked in place. The outbound record is this folder (the deviation from
DESIGN_AUTHORITY §0b's root row is recorded in `BRIEF.md`). In any `.md` whose path contains "design", never write the
front-door phrases that `test:design-one-door` rejects.

**A2 · Assemble outside the checkout.** Run from the repo root in Git Bash. `<OUTSIDE>` is outside the repo; the archive is `F:/50pick-design-archive`. `<SCRATCH>` is the session scratchpad.

First, write `<SCRATCH>/extract-globals.cjs` with your editor:
```js
const postcss = require(require.resolve("postcss", { paths: [process.cwd()] }));
const css = require("fs").readFileSync(0, "utf8");
const named = /\.(amount|gilt-|seal-|btn\b|btn-|eyebrow|mat-)/;
const keep = (n) =>
  (n.type === "rule" && n.selectors.some((s) => s.trim() === ":root" || named.test(s))) ||
  (n.type === "atrule" && /keyframes$/i.test(n.name));
const out = postcss.root();
postcss.parse(css).each((n) => {
  if (keep(n)) { out.append(n.clone()); return; }
  if (n.type === "atrule" && (n.name === "media" || n.name === "supports")) {
    const w = n.clone({ nodes: [] });
    n.each((c) => { if (keep(c)) w.append(c.clone()); });
    if (w.nodes.length) out.append(w);
  }
});
process.stdout.write(out.toString());
```
Then run:
```bash
git fetch origin
SHA=$(git rev-parse origin/main)
S9=${SHA:0:9}
DAY=$(date +%F)
OUT="<OUTSIDE>/MASWALI-DESIGN-R2-package-$S9"
mkdir -p "$OUT/01-law" "$OUT/02-values" "$OUT/03-symbols" "$OUT/04-language" "$OUT/05-r1/sources/assets" "$OUT/05-r1/glyphs" "$OUT/05-r1/artboards" "$OUT/06-frames"
g() { git show "$SHA:$1" > "$2"; }
g docs/DESIGN_AUTHORITY.md "$OUT/01-law/DESIGN_AUTHORITY.md"
g src/app/motion.css "$OUT/02-values/motion.css"
g src/app/state-tokens.css "$OUT/02-values/state-tokens.css"
g tailwind.config.ts "$OUT/02-values/tailwind.config.ts"
git show "$SHA:src/app/globals.css" | node "<SCRATCH>/extract-globals.cjs" > "$OUT/02-values/globals-extract.css"
g src/components/ui/glyphs.tsx "$OUT/03-symbols/glyphs.tsx"
g src/lib/brand-mark.ts "$OUT/03-symbols/brand-mark.ts"
for m in color dark simplified white; do g "public/brand/mark-$m.svg" "$OUT/03-symbols/mark-$m.svg"; done
g src/components/markets/win-celebration.tsx "$OUT/03-symbols/win-celebration.tsx"
g docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md "$OUT/04-language/LANGUAGE-AND-CONTENT.md"
g src/lib/i18n-dict.ts "$OUT/04-language/i18n-dict.ts"
R=docs/design-brief/maswali-2026-08/handover
for f in DECISIONS.md OPEN-QUESTIONS.md sources/A-slip.dc.html sources/B-receipt.dc.html sources/C-money-figure.dc.html sources/D-tier-glyphs.dc.html sources/support.js sources/assets/mark-color.svg glyphs/millionea.svg artboards/A-slip-partial-360-sw.png artboards/A-slip-ready-360-sw.png artboards/B-receipt-360-sw.png artboards/C-figure-mono-360-en.png; do g "$R/$f" "$OUT/05-r1/$f"; done
```

**A3 · Check the package (falsifiable).** Expected results:
- the first two counts are equal;
- the `--rh-close` line sits under `@media (min-width: 768px)`;
- the last command shows non-zero counts (R1's canvases link the stale file, and the prompt tells Claude Design to re-point them).
```bash
git show "$SHA:src/app/globals.css" | grep -cE '^\s*@keyframes'
grep -cE '^\s*@keyframes' "$OUT/02-values/globals-extract.css"
grep -n -B3 -- '--rh-close: var(--sp-12)' "$OUT/02-values/globals-extract.css"
grep -c 'tokens-locked' "$OUT"/05-r1/sources/*.dc.html
```

**A4 · Write the prompt and stamp.** Use your editor, never `printf` or `sed`.
- `PROMPT.txt`: a copy of this folder's `PROMPT.txt` placed in the package, with `{FULL_SHA}` and both
  `{YYYY-MM-DD}` filled in the copy only.
- `STAMP.txt`: the commit, the cut date, and "every file is a copy of that commit; if the repo has moved, rebuild, never resend".

**A5 · Capture `06-frames`.** Use a local server at `$SHA` from an SSD worktree under `C:\50pick-ssd\` (AGENTS.md §10):
- the journey through the staff-preview doors in `scripts/live/journey-pass.mjs`, with the demo player;
- the seal through the `qa:seal` drive (`scripts/qa-seal-drive.mjs`);
- the list in prompt §15. Check every frame by eye for QA personas only. Never commit these frames.

**A6 · Zip and hand over.** Never `Compress-Archive`. In Windows PowerShell 5.1 it names entries with `\` (measured
2026-10-16: 75 of 77 entries), and the ZIP format allows only `/` (APPNOTE 4.4.17). macOS, Linux and web unzippers
then turn every folder into part of one long file name, so the R1 canvases lose their relative links to `support.js`
and `assets/`.

First, write `<SCRATCH>/zip-package.ps1` with your editor:
```powershell
param([Parameter(Mandatory = $true)][string]$Package, [Parameter(Mandatory = $true)][string]$Zip)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$root = (Resolve-Path -LiteralPath $Package).ProviderPath.TrimEnd('\')
$Zip = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Zip)
if ($Zip.StartsWith($root + '\', 'OrdinalIgnoreCase')) { throw "the zip must sit outside $root" }
if (Test-Path -LiteralPath $Zip) { throw "$Zip already exists; delete it first" }
# Entry name = path under the package, with "/" (ZIP APPNOTE 4.4.17); written in ordinal order.
$files = @{}
Get-ChildItem -LiteralPath $root -Recurse -File -Force |
  ForEach-Object { $files[$_.FullName.Substring($root.Length + 1).Replace('\', '/')] = $_.FullName }
$names = [string[]]@($files.Keys)
[Array]::Sort($names, [StringComparer]::Ordinal)
$archive = [System.IO.Compression.ZipFile]::Open($Zip, 'Create')
try {
  foreach ($n in $names) {
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $files[$n], $n, 'Optimal')
  }
} finally { $archive.Dispose() }
# Read the zip back: every entry's name and SHA-256 against the folder.
$sha = [System.Security.Cryptography.SHA256]::Create()
$archive = [System.IO.Compression.ZipFile]::OpenRead($Zip)
try {
  $entries = @($archive.Entries)
  $backslash = @($entries | Where-Object { $_.FullName.Contains('\') }).Count
  $unequal = 0
  foreach ($e in $entries) {
    $s = $e.Open()
    try { $h = [BitConverter]::ToString($sha.ComputeHash($s)).Replace('-', '') } finally { $s.Dispose() }
    if (-not $files.ContainsKey($e.FullName) -or
        $h -ne (Get-FileHash -LiteralPath $files[$e.FullName] -Algorithm SHA256).Hash) { $unequal++ }
  }
  $read = [string[]]@($entries | ForEach-Object { $_.FullName })
  [Array]::Sort($read, [StringComparer]::Ordinal)
  $sameNames = ($read -join '|') -ceq ($names -join '|')
} finally { $archive.Dispose() }
"files in the folder:          $($names.Count)"
"entries in the zip:           $($entries.Count)"
"entries with a backslash:     $backslash"
"entries unequal to the file:  $unequal"
"names equal to the folder's:  $sameNames"
if ($entries.Count -ne $names.Count -or $backslash -ne 0 -or $unequal -ne 0 -or -not $sameNames) {
  [Console]::Error.WriteLine('FAIL: the zip does not match the folder')
  exit 1
}
```
Then run it in A2's Git Bash (`$OUT` is A2's folder; the zip lands beside it, never inside). `-ExecutionPolicy Bypass`
applies to this one process only; without it, Windows' default policy refuses the file ("running scripts is disabled").
Use `C:\Windows\System32\tar.exe` by its full path: Git Bash's own `tar` cannot read a zip.
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "<SCRATCH>/zip-package.ps1" "$OUT" "$OUT.zip"
find "$OUT" -type f | wc -l
/c/Windows/System32/tar.exe -tf "$OUT.zip" | wc -l
diff <(cd "$OUT" && find . -type f | sed 's|^\./||' | LC_ALL=C sort) <(/c/Windows/System32/tar.exe -tf "$OUT.zip" | tr -d '\r' | LC_ALL=C sort) && echo "same names"
```
**Check the zip (falsifiable).** Expected results; the zip goes to Ali only if all of them hold:
- the script prints `entries with a backslash: 0`, `entries unequal to the file: 0` and `names equal to the folder's:
  True`, with the folder and zip counts equal, and exits 0 (otherwise it prints `FAIL` and exits 1);
- the two counts after it are equal, and equal to the script's;
- the last command prints `same names`.

`tar.exe` checks only the count and the names. It turns `\` into `/` when it lists, so it reported 0 backslashes and
the same names for a `Compress-Archive` zip whose raw names held 28 backslashes in 30 entries (measured 2026-10-16).
The backslash count comes from the script's own read-back, which reads names raw: with `.Replace('\', '/')` removed,
it prints 28 for the same folder and exits 1. `tar.exe` ends each line with CR, so the `diff` strips it first.

Ali's instruction: "Open Claude Design, start a new project, upload the zip, paste all of PROMPT.txt as the first message, send." If the upload refuses the 577 KB dictionary, the session replaces it with a key excerpt, notes that in STAMP.txt, deletes the zip and runs A6 again. Ali does not decide this.

**A7 · Record the send.** In the same session: fill the stamp into `PROMPT.txt`'s copy in the package (never into the tracked
`PROMPT.txt`, which stays the record with its placeholders), write the send date and the stamp SHA into
`MASWALI-PLAN.md` §0, set D1 ✅ citing that commit, and change `BRIEF.md`'s status line to SENT.
