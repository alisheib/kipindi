# Order a red harness to stop the way its restore guard reads a console Ctrl-C (scripts/lib/red-restore-guard.mjs):
# end the harness's CURRENT suite child (its execSync shell, a direct child) with exit status 0xC000013A
# (STATUS_CONTROL_C_EXIT). The harness then sees isConsoleStop, puts the mutated file back in its `finally`, and
# halts before injecting the next defect; its exit pass re-checks every target and drops its lock.
param([int]$Harness)
Add-Type -Namespace KpStop -Name Native -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)] public static extern System.IntPtr OpenProcess(uint access, bool inherit, int pid);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool TerminateProcess(System.IntPtr h, uint code);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool CloseHandle(System.IntPtr h);
'@
$h = Get-CimInstance Win32_Process -Filter "ProcessId=$Harness"
if (-not $h -or $h.CommandLine -notmatch 'red-') { "harness $Harness is not a red harness: $($h.CommandLine)"; exit 2 }
$child = Get-CimInstance Win32_Process -Filter "ParentProcessId=$Harness" | Where-Object { $_.Name -eq 'cmd.exe' } | Select-Object -First 1
if (-not $child) { "no suite child under $Harness right now"; exit 3 }
$hp = [KpStop.Native]::OpenProcess(0x0001, $false, [int]$child.ProcessId)   # PROCESS_TERMINATE
if ($hp -eq [System.IntPtr]::Zero) { "could not open $($child.ProcessId)"; exit 4 }
$ok = [KpStop.Native]::TerminateProcess($hp, [uint32]3221225786)
[void][KpStop.Native]::CloseHandle($hp)
"{0}: ended suite child {1} ({2}) with 0xC000013A" -f $(if ($ok) { 'OK' } else { 'FAILED' }), $child.ProcessId, $child.CommandLine
