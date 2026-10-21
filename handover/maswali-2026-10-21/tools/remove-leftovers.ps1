# remove-leftovers.ps1 — deletes the partial folders the worktree removal left (2026-10-21). A folder qualifies only if
# it is NOT a registered git worktree and NOT on the keep list. Every junction/symlink inside is unlinked (the link only,
# never its target) before the folder is deleted; a folder that still holds a link after that is kept and reported.
param([switch]$DryRun)
$keep = @('maswali-coord-20261019','maswali-s7-integrate-20261019','kipindi-mln-base','kipindi-mln-r1','kipindi-mln-red',
  'kipindi-mln-not','kipindi-mln-int','kipindi-mln-rep','kipindi-mln-fsrv','kipindi-mln-fply','kipindi-mln-fplt',
  'kipindi-mln-ddoor','kipindi-mln-mot')
$registered = @(git -C F:\kipindi-main worktree list --porcelain | Select-String '^worktree ' | ForEach-Object { ($_.Line.Substring(9)) -replace '/', '\' })
$cands = Get-ChildItem C:\50pick-ssd -Directory | Where-Object {
  $_.Name -match '^(maswali-|codex-vis|kipindi-mln-|kipindi-s7-codex$|kipindi-maswali$|kipindi-d1$|kipindi-a6zip$)' -and
  ($keep -notcontains $_.Name) -and ($registered -notcontains $_.FullName) }
foreach ($c in $cands) {
  $links = @(Get-ChildItem -LiteralPath $c.FullName -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
  # deepest first, so a link inside a linked folder is never reached through its parent
  foreach ($l in ($links | Sort-Object { $_.FullName.Length } -Descending)) {
    if ($DryRun) { "would unlink: $($l.FullName)"; continue }
    if ($l.PSIsContainer) { [System.IO.Directory]::Delete($l.FullName, $false) } else { [System.IO.File]::Delete($l.FullName) }
  }
  if ($DryRun) { "would delete: $($c.FullName) ($($links.Count) links)"; continue }
  $left = @(Get-ChildItem -LiteralPath $c.FullName -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LinkType })
  if ($left.Count -gt 0) { "KEPT (links remain): $($c.Name)"; continue }
  Remove-Item -LiteralPath $c.FullName -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $c.FullName) { "STILL THERE: $($c.Name)" } else { "deleted: $($c.Name)" }
}
