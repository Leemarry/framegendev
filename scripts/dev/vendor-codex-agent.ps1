#!/usr/bin/env pwsh
<#
.SYNOPSIS
Vendors the pinned Codex ACP adapter into bin/agents/codex.

.DESCRIPTION
The replica drives Codex through ACP (codex-acp <-> codex), while official 0.1.17
replaced that adapter with a direct `codex app-server` integration. Upstream no
longer ships the adapter, so a fresh checkout has no Codex backend at all and the
agent runtime + the Codex settings panel both answer 503.

This script installs the versions pinned by ADR-0005 (codex-acp 1.1.2 + codex
0.144.0) under bin/agents/codex (gitignored) and writes the agent manifest and the
launcher shim the Go server expects.

.PARAMETER AgentDir
Target directory that holds <id>/agent.json. Defaults to bin/agents/codex.

.PARAMETER AdapterVersion
codex-acp version to install. Keep it equal to the pinned adapter contract.

.PARAMETER CodexVersion
Codex CLI version to install. Must stay compatible with the adapter above.

.EXAMPLE
pwsh scripts/dev/vendor-codex-agent.ps1
#>
[CmdletBinding()]
param(
    [string]$AgentDir = "",
    [string]$AdapterVersion = "1.1.2",
    [string]$CodexVersion = "0.144.0"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$agentDir = if ($AgentDir) { $AgentDir } else { Join-Path $repoRoot "bin\agents\codex" }
$adapterDir = Join-Path $agentDir "adapter"

New-Item -ItemType Directory -Force $adapterDir | Out-Null
$packageJson = Join-Path $adapterDir "package.json"
if (-not (Test-Path $packageJson)) {
    Set-Content -Path $packageJson -Encoding utf8 -Value '{"name":"mediago-codex-agent","private":true,"version":"0.0.0"}'
}

Push-Location $adapterDir
try {
    & npm install --no-audit --no-fund "@agentclientprotocol/codex-acp@$AdapterVersion" "@openai/codex@$CodexVersion"
    if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

$codexExe = Get-ChildItem (Join-Path $adapterDir "node_modules\@openai") -Directory -Filter "codex-*" -ErrorAction SilentlyContinue |
    ForEach-Object { Get-ChildItem $_.FullName -Recurse -Filter "codex.exe" -File -ErrorAction SilentlyContinue } |
    Select-Object -First 1
if (-not $codexExe) { throw "codex.exe was not found under $adapterDir\node_modules\@openai" }

$codexBin = $codexExe.FullName.Substring($agentDir.Length + 1)
$adapterEntry = "adapter\node_modules\@agentclientprotocol\codex-acp\dist\index.js"

$manifest = [ordered]@{
    id           = "codex"
    bin          = "codex-acp.cmd"
    args         = @()
    version      = $AdapterVersion
    codexBin     = $codexBin
    codexVersion = $CodexVersion
}
$manifest | ConvertTo-Json -Depth 4 |
    Set-Content -Path (Join-Path $agentDir "agent.json") -Encoding utf8

$shim = "@echo off`r`nnode `"%~dp0$adapterEntry`" %*"
Set-Content -Path (Join-Path $agentDir "codex-acp.cmd") -Encoding ascii -Value $shim

Write-Host "Vendored Codex agent into $agentDir"
Write-Host "  adapter : codex-acp $AdapterVersion"
Write-Host "  codex   : $CodexVersion ($codexBin)"
Write-Host ""
Write-Host "Point the server at it and give Codex its own home:"
Write-Host "  MEDIAGO_AGENT_BIN_DIR=$(Join-Path (Split-Path -Parent (Split-Path -Parent $agentDir)) '')"
Write-Host "  CODEX_HOME=<workspace-local codex home>"
Write-Host "scripts/parity/dev-isolated.sh already exports both; then log in from 设置 → Codex 接入."
