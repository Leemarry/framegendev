param(
    [ValidateSet('check', 'test', 'race', 'build')]
    [string]$Gate = 'check',
    [string]$CompilerPath = '',
    [string]$GoProxy = '',
    [string]$GoSumDB = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
if (-not $CompilerPath) {
    $CompilerPath = Join-Path $repoRoot '.cache/parity/gap-003/toolchain/mingw64/bin/gcc.exe'
}
$CompilerPath = [IO.Path]::GetFullPath($CompilerPath)
if (-not (Test-Path -LiteralPath $CompilerPath -PathType Leaf)) {
    throw "Windows C compiler missing: $CompilerPath. See services/server/README.md."
}

$previous = @{}
foreach ($name in @('CC', 'CGO_ENABLED', 'PATH', 'GOFLAGS', 'GOPROXY', 'GOSUMDB')) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
Push-Location (Join-Path $repoRoot 'services/server')
try {
    $env:CC = $CompilerPath
    $env:CGO_ENABLED = '1'
    $env:PATH = (Split-Path -Parent $CompilerPath) + [IO.Path]::PathSeparator + $env:PATH
    $env:GOFLAGS = ($env:GOFLAGS + ' -p=1').Trim()
    if ($GoProxy) { $env:GOPROXY = $GoProxy }
    if ($GoSumDB) { $env:GOSUMDB = $GoSumDB }

    & go env GOOS GOARCH CGO_ENABLED CC
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read Go toolchain settings' }
    switch ($Gate) {
        'check' { & task check }
        'test' { & task test }
        'race' { & go test -race ./... }
        'build' { & go build ./... }
    }
    $gateExit = $LASTEXITCODE
}
finally {
    Pop-Location
    foreach ($name in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
    }
}
exit $gateExit
