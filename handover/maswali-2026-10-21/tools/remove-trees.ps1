# remove-trees.ps1 — removes idle Maswali/Codex worktrees safely (2026-10-21, Ali: "clean any stale previous states").
# Every tree's branch/HEAD was verified pushed to origin or contained in a pushed branch, and archived in
# F:\kipindi-archive\maswali-codex-and-lanes-20261021.bundle. For each tree: unlink every junction/symlink (the LINK only,
# never its target), prove none is left, then `git worktree remove --force`.
param([switch]$DryRun)
$names = @(
  'codex-vis-p-20261019','codex-vis-r-20261019','kipindi-maswali','kipindi-d1','kipindi-a6zip','kipindi-mln-f4',
  'kipindi-mln-redfix','kipindi-mln-s4','kipindi-mln-tab','kipindi-mln-vp','kipindi-mln-vr','kipindi-s7-codex',
  'maswali-access-doc-20261020','maswali-admin-targets-20261020','maswali-build','maswali-dark-ticket-404-20261019',
  'maswali-engine-redfix-20261020','maswali-hb-console-red-20261020','maswali-kyc-triage-20261020',
  'maswali-parity-base-da35b826','maswali-parity-candidate-f688dd89a','maswali-parity-main-870772af25',
  'maswali-parity-main-a504ad','maswali-red-s5-5b15314e5-20261019','maswali-s5-admin-tap-446','maswali-s5-browser-c53',
  'maswali-s5-bulk-seal-audit-20261020','maswali-s5-chatbot-red-fix','maswali-s5-docs-prepush-20261020',
  'maswali-s5-final-parity-461','maswali-s5-final-render-461','maswali-s5-gate-audit-20261020',
  'maswali-s5-leaderboard-7f91','maswali-s5-merge-guards-20261020','maswali-s5-multislip-20261020',
  'maswali-s5-parity-main-a504','maswali-s5-prod-baseline-20261020','maswali-s5-red-c5-5df','maswali-s5-red-others-5df',
  'maswali-s5-render-bc8','maswali-s5-sitemap-20261020','maswali-s5-visual-5df','maswali-s5-visual-proof-20261019',
  'maswali-s5-week-cache-20261020','maswali-s6-ld-prep-20261019','maswali-s6-n-cont-20261019',
  'maswali-s6-n-r17-finish-20261019','maswali-type-anchors-20261020','maswali-visual-pair-20261020',
  'maswali-wallet-redfix-20261020')
$keep = @('maswali-coord-20261019','maswali-s7-integrate-20261019','kipindi-mln-base','kipindi-mln-r1','kipindi-mln-red',
  'kipindi-mln-not','kipindi-mln-int','kipindi-mln-rep')
function Get-Links($root) {
  $top = @(Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
  $deep = @()
  foreach ($d in @(Get-ChildItem -LiteralPath $root -Force -Directory -ErrorAction SilentlyContinue | Where-Object { -not $_.LinkType })) {
    $deep += @(Get-ChildItem -LiteralPath $d.FullName -Force -Recurse -Depth 2 -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
  }
  return @($top + $deep)
}
# Phase 1: unlink every link in every tree to remove, BEFORE any tree is deleted (one tree's link may target another).
foreach ($n in $names) {
  if ($keep -contains $n) { throw "refusing: $n is on the keep list" }
  $w = "C:\50pick-ssd\$n"
  if (-not (Test-Path -LiteralPath $w)) { "skip (absent): $n"; continue }
  foreach ($l in Get-Links $w) {
    "unlink: $($l.FullName) -> $($l.Target -join ',') [$($l.LinkType)]"
    if (-not $DryRun) {
      if ($l.PSIsContainer) { [System.IO.Directory]::Delete($l.FullName, $false) } else { [System.IO.File]::Delete($l.FullName) }
    }
  }
}
if ($DryRun) { "dry run: no tree removed"; return }
# Phase 2: prove no link is left, then remove the tree through git.
foreach ($n in $names) {
  $w = "C:\50pick-ssd\$n"
  if (-not (Test-Path -LiteralPath $w)) { continue }
  $left = Get-Links $w
  if ($left.Count -gt 0) { "KEPT (links remain): $n :: $($left.FullName -join '; ')"; continue }
  git -C F:\kipindi-main worktree remove --force $w 2>&1 | ForEach-Object { "  git: $_" }
  if (Test-Path -LiteralPath $w) { "LEFTOVER dir: $n" } else { "removed: $n" }
}
git -C F:\kipindi-main worktree prune
