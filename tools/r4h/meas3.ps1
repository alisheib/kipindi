. 'C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/edges/reader-e4-crops/m.ps1'
$b = Open-Tile 203
"203 eyebrow y233-241: " + (InkCols $b 233 241 100 345 346 60)
"203 caption y660-669: " + (InkCols $b 660 669 10 345 346 60)
"203 figure y685-697: " + (InkCols $b 685 697 10 200 346 60)
$b.Dispose()
$b = Open-Tile 233
"233 eyebrow y233-241: " + (InkCols $b 233 241 100 345 346 60)
"233 caption y660-669: " + (InkCols $b 660 669 10 345 346 60)
"233 figure y685-708: " + (InkCols $b 685 708 10 200 346 60)
"233 right strip row 400: " + (Px $b 300 400) + " | " + (Px $b 320 400) + " | " + (Px $b 335 400)
$b.Dispose()
