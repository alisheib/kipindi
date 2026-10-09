. 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/e3-tools.ps1'
foreach ($s in 68,72,76,101,109) {
  $f = (Get-Tile $s)
  $b = [System.Drawing.Bitmap]::FromFile($f); $w = $b.Width; $b.Dispose()
  "--- $s ($w wide)"
}
"068 x glyph: " + (Ink 68 280 50 310 90 300 45 60)
"068 rows x40-250: " + (RowRuns 68 40 250 40 110 300 45 60)
"068 title line1 cols: " + (ColRuns 68 40 280 62 78 300 45 60 3)
"072 x glyph: " + (Ink 72 300 50 345 100 330 45 60)
"072 rows: " + (RowRuns 72 40 260 40 120 330 45 60)
