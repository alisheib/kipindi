param([string]$out, [string]$text, [float]$px = 15.5)
Add-Type -AssemblyName System.Drawing
$w = 900; $h = 260
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(10, 6, 80))
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$y = 4
$cases = @(
  @('SimSun', [System.Drawing.FontStyle]::Bold, [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit),
  @('SimSun', [System.Drawing.FontStyle]::Regular, [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit),
  @('Microsoft YaHei', [System.Drawing.FontStyle]::Bold, [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit),
  @('Microsoft YaHei', [System.Drawing.FontStyle]::Regular, [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit),
  @('Microsoft YaHei', [System.Drawing.FontStyle]::Bold, [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit)
)
foreach ($c in $cases) {
  $g.TextRenderingHint = $c[2]
  $f = New-Object System.Drawing.Font ($c[0], $px, $c[1], [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString($text, $f, $brush, 4, $y)
  $y += [int]($px * 1.9) + 8
  $f.Dispose()
}
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
