# One line: how many postgres.exe are alive, and which children (--forkchild) are orphaned (parent gone).
$live = @{}; Get-Process | ForEach-Object { $live[[int]$_.Id] = 1 }
$all = @(Get-CimInstance Win32_Process -Filter "Name='postgres.exe'")
$orph = @($all | Where-Object { ([string]$_.CommandLine).Contains('--forkchild') -and -not $live.ContainsKey([int]$_.ParentProcessId) })
$desc = ($orph | ForEach-Object { $c = [string]$_.CommandLine; "$($_.ProcessId)<-$($_.ParentProcessId) " + $c.Substring(0, [Math]::Min(80, $c.Length)) }) -join ' | '
"{0} postgres alive, {1} orphaned{2}" -f $all.Count, $orph.Count, $(if ($desc) { ": $desc" } else { "" })
