param(
    [Parameter(Mandatory=$true)][string]$Upstream,
    [Parameter(Mandatory=$true)][string]$Work
)
# Builds the real engine host (all engine libraries and every adventure) in a private scratch
# directory outside the repository. Nothing from the reference source is copied into the repo.
$ErrorActionPreference = 'Stop'
$upstreamRoot = (Resolve-Path -LiteralPath $Upstream).Path
$workRoot = [IO.Path]::GetFullPath($Work)
$expected = '5db64a37afe0b5455ee477e067fca4e6d249e419'
$actual = & git -C $upstreamRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actual -ne $expected) { throw 'Reference source commit does not match the accepted baseline.' }
if ((& git -C $upstreamRoot status --porcelain)) { throw 'Reference source must be clean.' }
if (Test-Path -LiteralPath $workRoot) { throw 'Choose a new empty scratch path; existing work is preserved.' }
New-Item -ItemType Directory -Path $workRoot | Out-Null
'{"sdk":{"version":"8.0.404","rollForward":"latestPatch"}}' | Set-Content (Join-Path $workRoot 'global.json')
Push-Location $workRoot
try {
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    & dotnet new blazorwasm --empty --framework net8.0 --no-restore --output eamon-host
    if ($LASTEXITCODE) { throw 'Host project creation failed.' }
    $adventures = Get-ChildItem -LiteralPath (Join-Path $upstreamRoot 'Adventures') -Directory |
        Where-Object { Test-Path (Join-Path $_.FullName ($_.Name + '.csproj')) } | ForEach-Object { 'Adventures/' + $_.Name }
    $projects = @('System/SharpSerializer.Library','System/Eamon','System/EamonDD','System/EamonRT','System/EamonMH') + $adventures
    foreach ($project in $projects) {
        $target = Join-Path $workRoot ('reference-source/' + $project)
        New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
        Copy-Item -LiteralPath (Join-Path $upstreamRoot $project) -Destination $target -Recurse
    }
    $hostDir = Join-Path $workRoot 'eamon-host'
    $projectFile = Join-Path $hostDir 'eamon-host.csproj'
    $xml = [xml](Get-Content -LiteralPath $projectFile -Raw)
    $properties = $xml.CreateElement('PropertyGroup')
    foreach ($pair in @(@('PublishTrimmed','false'),@('AllowUnsafeBlocks','true'),@('Nullable','disable'))) {
        $node = $xml.CreateElement($pair[0]); $node.InnerText = $pair[1]; [void]$properties.AppendChild($node)
    }
    [void]$xml.Project.AppendChild($properties)
    $group = $xml.CreateElement('ItemGroup')
    foreach ($project in $projects | Where-Object { $_ -ne 'System/SharpSerializer.Library' }) {
        $reference = $xml.CreateElement('ProjectReference')
        $reference.SetAttribute('Include', '../reference-source/' + $project + '/' + (Split-Path $project -Leaf) + '.csproj')
        [void]$group.AppendChild($reference)
    }
    [void]$xml.Project.AppendChild($group); $xml.Save($projectFile)
    Copy-Item -Path (Join-Path $PSScriptRoot '*.cs') -Destination $hostDir
    # Upstream's own adapters, compiled unchanged against the App stand-in.
    $adapterDir = Join-Path $hostDir 'UpstreamPortability'
    New-Item -ItemType Directory -Path $adapterDir | Out-Null
    foreach ($name in 'TextWriter','Directory','File','Path','SharpSerializer','TransferProtocol') {
        Copy-Item -LiteralPath (Join-Path $upstreamRoot "System/EamonPM/Game/Portability/$name.cs") -Destination $adapterDir
    }
    # Every assembly a plugin can be launched from must be loaded, so keep a hard reference to each.
    $roots = ($projects | Where-Object { $_ -match 'EamonMH$|EamonRT$|Adventures/' } | ForEach-Object { '			typeof(' + (Split-Path $_ -Leaf) + '.Program)' }) -join ",`r`n"
    "namespace ParchLock.EamonHost`r`n{`r`n	public static class PluginRoots`r`n	{`r`n		public static readonly System.Type[] All =`r`n		{`r`n$roots`r`n		};`r`n	}`r`n}" | Set-Content (Join-Path $hostDir 'PluginRoots.g.cs')
    & dotnet publish $projectFile -c Release --nologo -v minimal
    if ($LASTEXITCODE) { throw 'Host publication failed.' }
    # Game data, laid out as the engine expects it under /Eamon-CS.
    $dataRoot = Join-Path $workRoot 'data'
    $files = @()
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $upstreamRoot 'System/Bin') -File | Where-Object { $_.Extension -in '.DAT','.TXT' }) {
        $files += 'System/Bin/' + $file.Name
    }
    foreach ($dir in Get-ChildItem -LiteralPath (Join-Path $upstreamRoot 'Adventures') -Directory) {
        foreach ($file in Get-ChildItem -LiteralPath $dir.FullName -File -Filter '*.DAT') { $files += 'Adventures/' + $dir.Name + '/' + $file.Name }
    }
    foreach ($file in $files) {
        $target = Join-Path $dataRoot $file
        New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
        Copy-Item -LiteralPath (Join-Path $upstreamRoot $file) -Destination $target
    }
    @{ files = $files; launch = @('-pfn','EamonMH.dll','-fsfn','ADVENTURES.DAT') } | ConvertTo-Json | Set-Content (Join-Path $dataRoot 'manifest.json')
    Write-Output ('Host built: ' + $files.Count + ' data files.')
} finally { Pop-Location }
