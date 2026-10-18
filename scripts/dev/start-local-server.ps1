param(
    [Parameter(Mandatory = $true)][string]$ServerPath,
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [Parameter(Mandatory = $true)][string]$DreaminaPackage,
    [Parameter(Mandatory = $true)][string]$LibTVPackage
)
$ErrorActionPreference = 'Stop'
# Install executable files into a normal per-user application directory. A source
# checkout/cache may have inherited Low integrity from a sandbox session; running
# its executables there prevents CLI credential writes even under the same user.
$runtimeDir = Join-Path $env:LOCALAPPDATA 'MediaGoDramaDev/runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$serverSource = (Resolve-Path -LiteralPath $ServerPath).Path
$configSource = (Resolve-Path -LiteralPath $ConfigPath).Path
$serverTarget = Join-Path $runtimeDir 'mediago-server.exe'
Copy-Item -LiteralPath $serverSource -Destination $serverTarget -Force
if ((Get-FileHash -LiteralPath $serverSource).Hash -ne (Get-FileHash -LiteralPath $serverTarget).Hash) {
    throw 'Server copy hash mismatch'
}
foreach ($entry in @(@('dreamina', $DreaminaPackage), @('libtv', $LibTVPackage))) {
    $sourceDir = (Resolve-Path -LiteralPath $entry[1]).Path
    $manifest = Get-Content -LiteralPath (Join-Path $sourceDir 'tool.json') -Raw | ConvertFrom-Json
    if ($manifest.id -ne $entry[0]) { throw 'CLI package id mismatch' }
    $binarySource = [IO.Path]::GetFullPath((Join-Path $sourceDir $manifest.bin))
    if (-not $binarySource.StartsWith($sourceDir.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'CLI executable must be inside its package'
    }
    $targetDir = Join-Path $runtimeDir "tools/$($entry[0])"
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Get-ChildItem -LiteralPath $sourceDir | Copy-Item -Destination $targetDir -Recurse -Force
    if ((Get-FileHash -LiteralPath (Join-Path $sourceDir $manifest.bin)).Hash -ne
        (Get-FileHash -LiteralPath (Join-Path $targetDir $manifest.bin)).Hash) {
        throw 'CLI package copy hash mismatch'
    }
}
$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = $serverTarget
$start.ArgumentList.Add('--config')
$start.ArgumentList.Add($configSource)
$start.WorkingDirectory = Split-Path -Parent $serverSource
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.Environment['MEDIAGO_JIMENG_BIN_DIR'] = Join-Path $runtimeDir 'tools'
$start.Environment['MEDIAGO_LIBTV_BIN_DIR'] = Join-Path $runtimeDir 'tools'
# Explicit paths take precedence over package directories.
$start.Environment.Remove('MEDIAGO_JIMENG_PATH') | Out-Null
$start.Environment.Remove('MEDIAGO_LIBTV_PATH') | Out-Null
$process = [System.Diagnostics.Process]::Start($start)
Write-Output "Server PID: $($process.Id); runtime: $runtimeDir; config: $configSource"
