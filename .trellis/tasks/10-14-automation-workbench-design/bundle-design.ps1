param(
    [string]$SourceRoot = 'E:\AI\framegendev',
    [string]$Bundle = 'E:\AI\MediaGo Drama\漫剧自动化工作台-设计与开发资料',
    [switch]$RefreshMetadata
)
$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$assetRoot = Join-Path $SourceRoot 'docs/superpowers/specs/2026-10-14-automation-workbench'
$taskRoot = Join-Path $SourceRoot '.trellis/tasks/10-14-automation-workbench-design'
$copies = [System.Collections.Generic.List[object]]::new()
function Add-Copy([string]$Source, [string]$Destination) {
    $copies.Add([pscustomobject]@{ source = $Source; path = $Destination })
}
foreach ($reference in (Get-Content -LiteralPath (Join-Path $assetRoot 'reference-manifest.json') -Raw | ConvertFrom-Json)) {
    Add-Copy $reference.path ('02-references/user/{0:D2}-{1}' -f [int]$reference.index, [IO.Path]::GetFileName($reference.path))
}
foreach ($name in @('01-workspace.png','25-ws-edit-workbench.png','30-ws-assets-lib.png','36-project-list.png')) {
    Add-Copy (Join-Path 'E:\AI\mediago-gap-shots\exe-flow' $name) "02-references/official/$name"
}
Add-Copy 'C:\Users\Amireux\AppData\Local\Temp\codex-clipboard-c42b9be7-0627-4cc8-9452-c9c06649a1cf.png' '02-references/official/section-image-linkage.png'
foreach ($name in @('toonflow-live-nodes.png','toonflow-live-selected.png','toonflow-live-reference.png')) {
    Add-Copy (Join-Path $assetRoot $name) "02-references/toonflow/$name"
}
$materials = 'E:\Amireux\Documents\ChatGPT\漫剧'
Add-Copy (Join-Path $materials '霸总甜宠AI漫剧/01_角色资产/顾承洲/生成任务与提示词.md') '02-references/project-materials/顾承洲-生成任务与提示词.md'
Add-Copy (Join-Path $materials '霸总甜宠AI漫剧/05_资产登记/生成记录模板.md') '02-references/project-materials/生成记录模板.md'
Add-Copy (Join-Path $materials '霸总甜宠AI漫剧/05_资产登记/角色场景索引.json') '02-references/project-materials/角色场景索引.json'
Add-Copy (Join-Path $materials '多出来的盒饭/03_EP01/分镜/EP01_分镜表.csv') '02-references/project-materials/盒饭-EP01-分镜表.csv'
foreach ($stem in @('01-production-overview','02-batch-storyboard','03-infinite-canvas')) {
    Add-Copy (Join-Path $assetRoot "$stem-layout.png") "03-designs/v1/$stem-layout.png"
    Add-Copy (Join-Path $assetRoot "$stem-prompt.txt") "06-reproduction/$stem-prompt.txt"
}
foreach ($stem in @('04-character-linkage-v2','05-editable-storyboard-v2','06-media-canvas-v2')) {
    Add-Copy (Join-Path $assetRoot "$stem.png") "03-designs/v2/$stem.png"
    Add-Copy (Join-Path $assetRoot "$stem-prompt.txt") "06-reproduction/$stem-prompt.txt"
}
foreach ($name in @('render-layouts.py','render-layouts-v2.py','references.py','reference-manifest.json','toonflow-live-nodes.png')) {
    Add-Copy (Join-Path $assetRoot $name) "06-reproduction/$name"
}
foreach ($name in @('provider-diagnostic.json','v2-verification.json','current-projects.png','reference-contact-sheet.jpg')) {
    Add-Copy (Join-Path $assetRoot $name) "05-evidence/$name"
}
Add-Copy (Join-Path $SourceRoot 'docs/superpowers/specs/2026-10-14-automation-workbench-design.md') '04-snapshots/original-design.md'
foreach ($name in @('README.md','REQUIREMENTS.md','TASKS.md','DECISIONS.md','CURRENT-HANDOFF.md')) {
    Add-Copy (Join-Path $SourceRoot "docs/parity-0.1.17/$name") "04-snapshots/parity-$name"
}
Add-Copy (Join-Path $SourceRoot '.trellis/spec/guides/comic-production.md') '04-snapshots/comic-production.md'
foreach ($name in @('prd.md','design.md','implement.md','result.md','task.json')) {
    Add-Copy (Join-Path $taskRoot $name) "04-snapshots/task-170-$name"
}
foreach ($name in @('bundle-design.ps1','verify-bundle.py')) {
    Add-Copy (Join-Path $taskRoot $name) "06-reproduction/$name"
}
New-Item -ItemType Directory -Path $Bundle -Force | Out-Null
# Preflight every source and destination before the first asset copy.
foreach ($entry in $copies) {
    if (-not (Test-Path -LiteralPath $entry.source -PathType Leaf)) { throw "Missing source: $($entry.source)" }
    $target = Join-Path $Bundle $entry.path
    if ($RefreshMetadata) {
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing bundled file: $($entry.path)" }
    } elseif (Test-Path -LiteralPath $target) { throw "Refusing overwrite: $($entry.path)" }
}
$anchors = @(
    @('services/server/internal/service/shared/workspace_paths.go','func EnsureProjectLayout('),
    @('services/server/internal/service/document/local_file_sync.go','func (store *Service) SyncLocalMarkdownFiles('),
    @('apps/workspace/src/domains/documents/components/DocumentSectionGenerator.tsx','assetTitle={activeSection.headingText}'),
    @('apps/workspace/src/domains/generation/components/MediaGenerationWorkspace.tsx','const persistGeneratedAssetSelection ='),
    @('apps/workspace/src/domains/generation/api/prompt-presets.ts','PromptPreset'),
    @('services/server/internal/service/generation/generation_batch.go','func (workflow *GenerationService) CreateGenerationBatch('),
    @('services/server/internal/service/generation/generation_runtime_tasks.go','func (workflow *GenerationService) RetryGenerationTask('),
    @('apps/workspace/src/domains/episode/components/EpisodeCanvasView.tsx','onConnect={handleConnect}'),
    @('apps/workspace/src/domains/episode/stores/canvas-layout.ts','storage: createJSONStorage(() => localStorage)'),
    @('apps/workspace/src/domains/episode/lib/storyboard-shots.ts','const parseDurationSeconds ='),
    @('services/server/internal/service/document/episode_resolved.go','regexp.MustCompile'),
    @('services/server/internal/service/jianyingdraft/export.go','func (service *Service) shotsForClips('),
    @('services/server/internal/service/jianyingdraft/export.go','func exportableVideoClips('),
    @('packages/jianyingdraft/pkg/jianyingdraft/types.go','type Shot struct'),
    @('apps/workspace/src/domains/episode/components/EpisodePreviewPlayer.tsx','videoUrl'),
    @('services/server/internal/service/media/ffmpeg_preview.go','func (streamer *FFmpegPreviewStreamer) RenderMP4('),
    @('services/server/internal/service/skill/registry.go','func NewRegistryWithStore('),
    @('packages/instructions/pkg/pack/types.go','KindSkill'),
    @('packages/mcp/pkg/server/server.go','func NewGenerationServer('),
    @('packages/mcp/pkg/server/server.go','func NewExternalServer('),
    @('packages/mcp/pkg/server/store.go','type GenerationStore interface'),
    @('packages/mcp/pkg/mcp/tools.go','confirmationSelectionId'),
    @('packages/mcp/internal/tools/generation/register.go','CreateGenerationBatch'),
    @('packages/mcp/internal/tools/external/register.go','mediamcp.ExternalDocumentTools.LoadSkill'),
    @('services/server/internal/app/mcp/generation_confirmation.go','confirmationSelectionId')
)
$evidence = foreach ($pair in $anchors) {
    $source = Join-Path $SourceRoot $pair[0]
    $lines = [IO.File]::ReadAllLines($source)
    $match = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i].Contains($pair[1])) { $match = $i; break }
    }
    if ($match -lt 0) { throw "Missing code anchor: $($pair[0]) / $($pair[1])" }
    $last = [Math]::Min($lines.Length - 1, $match + 11)
    [pscustomobject]@{
        path = $pair[0]; anchor = $pair[1]; line = $match + 1
        sha256 = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
        excerpt = ($lines[$match..$last] -join "`n")
    }
}
if (-not $RefreshMetadata) {
    foreach ($entry in $copies) {
        $target = Join-Path $Bundle $entry.path
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $entry.source -Destination $target
    }
}
$evidencePath = Join-Path $Bundle '05-evidence/code-evidence.json'
New-Item -ItemType Directory -Path (Split-Path $evidencePath -Parent) -Force | Out-Null
[IO.File]::WriteAllText($evidencePath, (@{ captured_at = (Get-Date).ToString('o'); source_root = $SourceRoot; basis = 'source inspection, not runtime acceptance'; entries = @($evidence) } | ConvertTo-Json -Depth 8), $utf8)
$mapped = @{}
foreach ($entry in $copies) { $mapped[$entry.path] = $entry.source }
$files = foreach ($file in (Get-ChildItem -LiteralPath $Bundle -Recurse -File | Sort-Object FullName)) {
    $relative = [IO.Path]::GetRelativePath($Bundle, $file.FullName).Replace('\','/')
    if ($relative -in @('manifest.json','verification.json')) { continue }
    $origin = if ($mapped.ContainsKey($relative)) { $mapped[$relative] } else { $null }
    [pscustomobject]@{
        path = $relative; bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        origin = $origin; kind = $(if ($origin) { 'copied' } else { 'authored_or_generated' })
    }
}
$manifest = @{ format_version = 1; captured_at = (Get-Date).ToString('o'); source_root = $SourceRoot; excluded = @('manifest.json','verification.json'); files = @($files) }
[IO.File]::WriteAllText((Join-Path $Bundle 'manifest.json'), ($manifest | ConvertTo-Json -Depth 8), $utf8)
Write-Output "Bundled $($files.Count) files; $($evidence.Count) code anchors. No provider calls."
