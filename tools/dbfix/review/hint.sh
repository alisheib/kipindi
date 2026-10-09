powershell -Command "Get-CimInstance Win32_Process -Filter \"Name='postgres.exe'\" |
Select-Object ProcessId, ParentProcessId, CommandLine | Format-List"
