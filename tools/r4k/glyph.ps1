param([string]$family = 'Microsoft YaHei', [int[]]$codes = @(0x3002, 0xFF1F, 0xFF01, 0xFF0C, 0x9009, 0x6211), [float]$px = 400, [int]$style = 0)
# Ink box of each glyph relative to its advance, as fractions of the em (GDI+ GenericTypographic, no padding).
Add-Type -AssemblyName System.Drawing
$fmt = [System.Drawing.StringFormat]::GenericTypographic
$fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
$font = New-Object System.Drawing.Font ($family, $px, [System.Drawing.FontStyle]$style, [System.Drawing.GraphicsUnit]::Pixel)
foreach ($cp in $codes) {
  $ch = [string][char]$cp
  $w = [int]($px * 2); $h = [int]($px * 2)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Black)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $ox = [int]($px / 2)
  $g.DrawString($ch, $font, [System.Drawing.Brushes]::White, $ox, $ox, $fmt)
  $adv = $g.MeasureString($ch, $font, 10000, $fmt).Width
  $g.Dispose()
  $minx = 99999; $maxx = -1
  for ($x = 0; $x -lt $w; $x += 1) { for ($y = 0; $y -lt $h; $y += 2) { if ($bmp.GetPixel($x, $y).R -gt 100) { if ($x -lt $minx) { $minx = $x }; if ($x -gt $maxx) { $maxx = $x }; break } } }
  $bmp.Dispose()
  $l = ($minx - $ox) / $px; $r = ($maxx + 1 - $ox) / $px; $a = $adv / $px
  "{0} U+{1:X4} advance={2:N3}em ink={3:N3}..{4:N3}em  left-bearing={5:N3} right-empty={6:N3}em" -f $family, $cp, $a, $l, $r, $l, ($a - $r)
}
$font.Dispose()
