. 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/reader-e4-crops/m.ps1'
foreach ($n in 203, 233) {
  $b = Open-Tile $n
  # The eyebrow "MTABIRI" row and the card's right edge band, and the SALIO caption's row.
  $rows = InkRows $b 100 200 200 760 330 60
  "E24 $n ink rows x100-200: $rows"
  $b.Dispose()
}
