# clean-local.ps1 [-Go] — Ali 2026-10-21: "make sure no stale stays … keep a clean repo".
# 1) archive every local branch not used by a live lane and not merged into origin/main (verified bundle);
# 2) remove the stale worktrees (every junction/symlink unlinked first — the LINK only — deepest first);
# 3) delete the archived/merged local branches. Without -Go it only reports.
param([switch]$Go)
$repo = 'F:\kipindi-main'
$staleTrees = @('C:\50pick-ssd\kipindi-red','C:\50pick-ssd\kipindi-rel2','C:\50pick-ssd\kipindi-rel2-build',
  'C:\50pick-ssd\kipindi-s10-finish','C:\50pick-ssd\kipindi-s11-finish','C:\50pick-ssd\kipindi-s13-finish',
  'C:\50pick-ssd\kipindi-s8v2','C:\50pick-ssd\kipindi-s9fix','C:\50pick-ssd\kipindi-seal',
  'F:\kipindi-main\.claude\worktrees\infallible-dewdney-c8204b','F:\kipindi-main\.claude\worktrees\zen-swartz-a88424')
git -C $repo fetch -q --prune origin
# branches checked out by worktrees that are NOT stale = live
$porc = git -C $repo worktree list --porcelain
$live = @('main'); $cur = $null
foreach ($l in $porc) {
  if ($l -like 'worktree *') { $cur = $l.Substring(9) -replace '/', '\' }
  if ($l -like 'branch refs/heads/*') { if ($staleTrees -notcontains $cur) { $live += $l.Substring(18) } }
}
$remoteKeep = @(git -C $repo for-each-ref --format='%(refname:short)' refs/remotes/origin/ | ForEach-Object { $_ -replace '^origin/', '' })
$all = @(git -C $repo for-each-ref --format='%(refname:short)' refs/heads/)
$cand = @($all | Where-Object { ($live -notcontains $_) -and ($remoteKeep -notcontains $_) })
$unmerged = @($cand | Where-Object { git -C $repo merge-base --is-ancestor "refs/heads/$_" origin/main; -not $? })
"local branches: $($all.Count) · live (checked out by a live tree, or main): $($live.Count) · candidates: $($cand.Count) · of which unmerged (archive): $($unmerged.Count)"
if (-not $Go) { "dry run"; $unmerged | Select-Object -First 15; return }
$bundle = 'F:\kipindi-archive\stale-local-branches-20261021.bundle'
if ($unmerged.Count -gt 0) {
  $refs = $unmerged | ForEach-Object { "refs/heads/$_" }
  git -C $repo bundle create $bundle @refs 2>&1 | Out-Null
  git -C $repo bundle verify $bundle *> $null; if ($LASTEXITCODE -ne 0) { throw "bundle verify failed" }
  $heads = @(git -C $repo bundle list-heads $bundle).Count
  if ($heads -ne $unmerged.Count) { throw "bundle heads $heads != $($unmerged.Count)" }
  "bundle ok: $bundle ($heads heads)"
}
function Get-AllLinks($root) {
  $links = @()
  $links += @(Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
  foreach ($d in @(Get-ChildItem -LiteralPath $root -Force -Directory -ErrorAction SilentlyContinue | Where-Object { -not $_.LinkType })) {
    if ($d.Name -eq 'node_modules') {
      $links += @(Get-ChildItem -LiteralPath $d.FullName -Force -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
      foreach ($s in @(Get-ChildItem -LiteralPath $d.FullName -Force -Directory -Filter '@*' -ErrorAction SilentlyContinue)) {
        $links += @(Get-ChildItem -LiteralPath $s.FullName -Force -ErrorAction SilentlyContinue | Where-Object { $_.LinkType }) }
    } else {
      $links += @(Get-ChildItem -LiteralPath $d.FullName -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
    }
  }
  return $links
}
foreach ($w in $staleTrees) {
  if (-not (Test-Path -LiteralPath $w)) { "absent: $w"; continue }
  foreach ($l in (Get-AllLinks $w | Sort-Object { $_.FullName.Length } -Descending)) {
    if ($l.PSIsContainer) { [System.IO.Directory]::Delete($l.FullName, $false) } else { [System.IO.File]::Delete($l.FullName) } }
  $left = @(Get-AllLinks $w); if ($left.Count) { "KEPT (links remain): $w"; continue }
  git -C $repo worktree remove --force $w 2>&1 | Out-Null
  if (Test-Path -LiteralPath $w) {
    $deep = @(Get-ChildItem -LiteralPath $w -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
    foreach ($l in ($deep | Sort-Object { $_.FullName.Length } -Descending)) { if ($l.PSIsContainer) { [System.IO.Directory]::Delete($l.FullName, $false) } else { [System.IO.File]::Delete($l.FullName) } }
    Remove-Item -LiteralPath $w -Recurse -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path -LiteralPath $w) { "STILL THERE: $w" } else { "removed: $w" }
}
git -C $repo worktree prune
$n = 0; foreach ($b in $cand) { git -C $repo branch -D $b 2>&1 | Out-Null; if ($?) { $n++ } else { "kept branch: $b" } }
"deleted local branches: $n; left: $(@(git -C $repo for-each-ref refs/heads/).Count)"
