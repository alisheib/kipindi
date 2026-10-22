# sheets.ps1 -Src <tiles dir> -Out <sheets dir> [-Filter <regex on the file name>]
# Lane DOORS (from the register lane's sheets.ps1): contact sheets at FULL resolution (never scaled) of the phone and
# tablet tiles - a group's 320 tiles four to a sheet, 360 three, 768 two, in order (scroll steps "-sN" in their order) -
# each under a strip naming its file. A group is the file name without its scroll step, or, for one-tile names, the name
# without its host and width, so a page's journey and board tiles at one width sit side by side.
# 1024 / 1280 / 1920 tiles are not sheeted (read one by one). Prints one line per sheet.
param([Parameter(Mandatory = $true)][string]$Src, [Parameter(Mandatory = $true)][string]$Out, [string]$Filter = ".")
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Out | Out-Null
$per = @{ "320" = 4; "360" = 3; "768" = 2 }
$gap = 10; $strip = 22
$files = Get-ChildItem -Path $Src -Filter *.png -File | Where-Object { $_.Name -match $Filter }
$groups = @{}
foreach ($f in $files) {
  if ($f.BaseName -notmatch '^(?<pre>.+)-(?<w>320|360|768)(?:-s(?<n>\d+))?$') { continue }
  $pre = $Matches['pre']; $w = $Matches['w']; $n = if ($Matches['n']) { [int]$Matches['n'] } else { 0 }
  $key = if ($n -gt 0) { "$pre-$w" } else { ($pre -replace '-(journey|board)-', '-') + "-$w" }
  if (-not $groups.ContainsKey($key)) { $groups[$key] = @() }
  $groups[$key] += [pscustomobject]@{ n = $n; file = $f.FullName; name = $f.Name; w = $w }
}
$font = New-Object System.Drawing.Font("Consolas", 11)
$ink = [System.Drawing.Brushes]::White
foreach ($key in ($groups.Keys | Sort-Object)) {
  $tiles = @($groups[$key] | Sort-Object n, name)
  $k = $per[$tiles[0].w]
  for ($i = 0; $i -lt $tiles.Count; $i += $k) {
    $chunk = @($tiles[$i..([Math]::Min($i + $k, $tiles.Count) - 1)])
    $imgs = @($chunk | ForEach-Object { [System.Drawing.Image]::FromFile($_.file) })
    [int]$W = 0; [int]$H = 0
    foreach ($im in $imgs) { $W += [int]$im.Width; if ([int]$im.Height -gt $H) { $H = [int]$im.Height } }
    $W += $gap * ($imgs.Count - 1); $H += $strip
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList ([int]$W), ([int]$H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 60, 60, 60))
    $x = 0
    for ($j = 0; $j -lt $imgs.Count; $j++) {
      $g.DrawString($chunk[$j].name, $font, $ink, $x + 2, 3)
      $g.DrawImage($imgs[$j], $x, $strip, $imgs[$j].Width, $imgs[$j].Height)
      $x += $imgs[$j].Width + $gap
    }
    $name = "$key" + "__" + ($i / $k + 1) + ".png"
    $bmp.Save((Join-Path $Out $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $imgs | ForEach-Object { $_.Dispose() }
    "$name <- " + (($chunk | ForEach-Object { $_.name }) -join ", ")
  }
}
