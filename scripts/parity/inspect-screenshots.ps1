param(
    [Parameter(Mandatory)][string]$SourceDirectory,
    [Parameter(Mandatory)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = (Resolve-Path -LiteralPath $SourceDirectory).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
if ($output -eq $source -or $output.StartsWith($source + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Output must be outside the reference directory.'
}
$files = @(Get-ChildItem -LiteralPath $source -File -Filter '*.png' | Sort-Object { [int]($_.BaseName -replace '^([0-9]+).*', '$1') }, Name)
if ($files.Count -eq 0) { throw 'No PNG screenshots found.' }
[IO.Directory]::CreateDirectory($output) | Out-Null
$entries = @()
$font = [Drawing.Font]::new('Microsoft YaHei', 11)
$brush = [Drawing.SolidBrush]::new([Drawing.Color]::Black)
try {
    for ($offset = 0; $offset -lt $files.Count; $offset += 12) {
        $canvas = [Drawing.Bitmap]::new(1800, 1170)
        $graphics = [Drawing.Graphics]::FromImage($canvas)
        try {
            $graphics.Clear([Drawing.Color]::White)
            $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            for ($slot = 0; $slot -lt 12 -and ($offset + $slot) -lt $files.Count; $slot++) {
                $file = $files[$offset + $slot]
                $img = [Drawing.Image]::FromFile($file.FullName)
                try {
                    $entries += [pscustomobject][ordered]@{
                        file = $file.Name
                        width = $img.Width
                        height = $img.Height
                        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
                    }
                    $x = ($slot % 4) * 450
                    $y = [Math]::Floor($slot / 4) * 390
                    $scale = [Math]::Min(442.0 / $img.Width, 345.0 / $img.Height)
                    $graphics.DrawImage($img, [int]($x + 4), [int]$y, [int]($img.Width * $scale), [int]($img.Height * $scale))
                    $graphics.DrawString($file.BaseName, $font, $brush, [Drawing.RectangleF]::new($x + 4, $y + 348, 442, 40))
                } finally { $img.Dispose() }
            }
            $canvas.Save((Join-Path $output ('sheet-{0:00}.jpg' -f (1 + $offset / 12))), [Drawing.Imaging.ImageFormat]::Jpeg)
        } finally {
            $graphics.Dispose()
            $canvas.Dispose()
        }
    }
} finally {
    $font.Dispose()
    $brush.Dispose()
}
$manifest = [ordered]@{ source = $source; count = $entries.Count; screenshots = $entries }
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $output 'manifest.json') -Encoding utf8
if (@($entries | Group-Object file | Where-Object Count -gt 1).Count -gt 0) { throw 'Duplicate file names in inventory.' }
Write-Output ('Screenshots: {0}; sheets: {1}; exact duplicate groups: {2}' -f $entries.Count, [Math]::Ceiling($entries.Count / 12), @($entries | Group-Object sha256 | Where-Object Count -gt 1).Count)
