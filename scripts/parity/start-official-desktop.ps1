param(
    [string]$AuditDirectory = '.cache/parity/official-review',
    [string]$DesktopName = 'MediaGoParityReview',
    [int]$DebugPort = 9226
)

$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$auditRoot = [IO.Path]::GetFullPath($AuditDirectory, $repository)
$cacheRoot = Join-Path $repository '.cache'
if (-not $auditRoot.StartsWith($cacheRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The audit directory must be inside the repository .cache directory.'
}
if ($DesktopName -notmatch '^[A-Za-z0-9_-]+$' -or $DebugPort -lt 1024 -or $DebugPort -gt 65535) {
    throw 'Invalid desktop name or debug port.'
}
if (Get-NetTCPConnection -State Listen -LocalPort $DebugPort -ErrorAction SilentlyContinue) {
    throw 'Debug port is already in use; choose another port.'
}
if (Test-Path -LiteralPath (Join-Path $auditRoot 'official-profile')) {
    throw 'Use a fresh audit directory to avoid reusing a previous desktop session.'
}
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class AuditDesktop {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct Startup {
        public int cb; public string reserved; public string desktop; public string title;
        public int x,y,width,height,charsX,charsY,fill,flags;
        public short show; public short reservedSize; public IntPtr reservedPtr,input,output,error;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct ProcessInfo { public IntPtr process,thread; public int pid,tid; }
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern IntPtr CreateDesktop(string name, IntPtr device, IntPtr mode, int flags, uint access, IntPtr attributes);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CreateProcess(string app, StringBuilder command, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr environment, string cwd, ref Startup startup, out ProcessInfo info);
    [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
    [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr handle);
}
'@
$envMap = [Environment]::GetEnvironmentVariables()
$envMap['MEDIAGO_WORKSPACE_DIR'] = Join-Path $auditRoot 'official-workspace'
$envMap['APPDATA'] = Join-Path $auditRoot 'official-roaming'
$envMap['LOCALAPPDATA'] = Join-Path $auditRoot 'official-local'
foreach ($name in @('MEDIAGO_WORKSPACE_DIR', 'APPDATA', 'LOCALAPPDATA')) { [IO.Directory]::CreateDirectory($envMap[$name]) | Out-Null }
$envMap.Remove('ELECTRON_RUN_AS_NODE')
$block = (($envMap.Keys | Sort-Object | ForEach-Object { $_ + '=' + $envMap[$_] }) -join "`0") + "`0`0"
$ptr = [Runtime.InteropServices.Marshal]::StringToHGlobalUni($block)
$desktop = [AuditDesktop]::CreateDesktop($DesktopName, [IntPtr]::Zero, [IntPtr]::Zero, 0, 0x01FF, [IntPtr]::Zero)
if ($desktop -eq [IntPtr]::Zero) { throw "CreateDesktop failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
$startup = [AuditDesktop+Startup]::new()
$startup.cb = [Runtime.InteropServices.Marshal]::SizeOf($startup)
$startup.desktop = 'WinSta0\' + $DesktopName
$info = [AuditDesktop+ProcessInfo]::new()
$command = [Text.StringBuilder]::new('"E:\AI\MediaGo Drama\MediaGo Drama.exe" --user-data-dir="' + $auditRoot + '\official-profile" --remote-debugging-port=' + $DebugPort + ' --remote-debugging-address=127.0.0.1 --no-first-run')
try {
    if (-not [AuditDesktop]::CreateProcess('E:\AI\MediaGo Drama\MediaGo Drama.exe', $command, [IntPtr]::Zero, [IntPtr]::Zero, $false, 0x400, $ptr, 'E:\AI\MediaGo Drama', [ref]$startup, [ref]$info)) {
        throw "CreateProcess failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
    [AuditDesktop]::CloseHandle($info.thread) | Out-Null
    [AuditDesktop]::CloseHandle($info.process) | Out-Null
    $record = [ordered]@{
        pid = $info.pid
        desktop = $startup.desktop
        workspace = $envMap['MEDIAGO_WORKSPACE_DIR']
        profile = Join-Path $auditRoot 'official-profile'
        cdp = "http://127.0.0.1:$DebugPort"
    }
    $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $auditRoot 'official-session.json') -Encoding utf8
    $record | ConvertTo-Json
} finally {
    [Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
    [AuditDesktop]::CloseDesktop($desktop) | Out-Null
}
