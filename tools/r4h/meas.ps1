. 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/reader-e4-crops/m.ps1'
# E24 — the hero's shift: the avatar ring's left edge and the balance's first ink, 203 (before the CJK save) against 233.
foreach ($n in 203, 233) {
  $b = Open-Tile $n
  "E24 $n avatar band y262-272: " + (InkCols $b 262 272 10 140 330 60)
  $b.Dispose()
}
# E2 — the deposit door's glyph at sw 320 (488) and at sw 360 (491): ink columns in the door's middle band.
foreach ($n in 488, 491) {
  $b = Open-Tile $n
  "E2 $n door row y630-640: " + (ScanRow $b 635 22 160 24 80)
  $b.Dispose()
}
# E31 — the menu at 1280 (209): the Wasifu row and the Sindano row, glyph and label columns, the INAKUJA pill's right edge.
$b = Open-Tile 209
"E31 Wasifu y155-170: " + (InkCols $b 155 170 985 1255 984 60)
"E31 Pendekeza y285-312: " + (InkCols $b 285 312 985 1255 984 60)
"E31 Sindano y526-541: " + (InkCols $b 526 541 985 1255 984 60)
$b.Dispose()
# E34 — the toast over the header at 1280 (235): the toast's box against the header's 56px.
$b = Open-Tile 235
"E34 235 col x1100 y0-110: " + (ScanCol $b 1100 0 110 105 40)
$b.Dispose()
# E28 — the meta line's first line end (248 at sw 360): ink columns of the y150-162 band.
$b = Open-Tile 248
"E28 248 meta line 1 y150-163: " + (InkCols $b 150 163 10 350 352 60)
$b.Dispose()
