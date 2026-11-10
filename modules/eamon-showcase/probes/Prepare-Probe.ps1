param(
    [Parameter(Mandatory=$true)][string]$Upstream,
    [Parameter(Mandatory=$true)][string]$Work
)
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
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
    & dotnet new blazorwasm --empty --framework net8.0 --no-restore --output browser-probe
    if ($LASTEXITCODE) { throw 'Probe project creation failed.' }
    $projects = @('System/SharpSerializer.Library','System/Eamon','System/EamonDD','System/EamonRT','System/EamonMH','Adventures/TheBeginnersCave','Adventures/TheVileGrimoireOfJaldial')
    foreach ($project in $projects) {
        $target = Join-Path $workRoot ('reference-source/' + $project)
        New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
        Copy-Item -LiteralPath (Join-Path $upstreamRoot $project) -Destination $target -Recurse
    }
    $projectFile = Join-Path $workRoot 'browser-probe/browser-probe.csproj'
    $xml = [xml](Get-Content -LiteralPath $projectFile -Raw)
    $properties = $xml.CreateElement('PropertyGroup')
    foreach ($pair in @(@('PublishTrimmed','false'),@('AllowUnsafeBlocks','true'))) {
        $node = $xml.CreateElement($pair[0]); $node.InnerText = $pair[1]; [void]$properties.AppendChild($node)
    }
    [void]$xml.Project.AppendChild($properties)
    $group = $xml.CreateElement('ItemGroup')
    foreach ($project in $projects | Where-Object { $_ -match 'EamonRT$|EamonMH$|Adventures/' }) {
        $reference = $xml.CreateElement('ProjectReference')
        $reference.SetAttribute('Include', '../reference-source/' + $project + '/' + (Split-Path $project -Leaf) + '.csproj')
        [void]$group.AppendChild($reference)
    }
    [void]$xml.Project.AppendChild($group); $xml.Save($projectFile)
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'EamonProbe.cs'),(Join-Path $PSScriptRoot 'InputProbe.cs') -Destination (Join-Path $workRoot 'browser-probe')
    & dotnet publish $projectFile -c Release --nologo -v minimal
    if ($LASTEXITCODE) { throw 'Probe publication failed.' }
    $env:PARCHLOCK_SOURCE_ROOT = $sourceRoot
    $env:PARCHLOCK_PROBE_WORK = $workRoot
    & node (Join-Path $PSScriptRoot 'run-input-probe.cjs')
    if ($LASTEXITCODE) { throw 'Input mechanism check failed; inspect the scratch receipt.' }
} finally { Pop-Location }
