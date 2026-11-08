<#
.SYNOPSIS
  MANUAL publish of a signed ParchLock PUBLIC build to Hymlock/ParchLock (public repo).
  The private full build is published separately (Hymlock/ParchLock-Private, publish-release.ps1).

.USAGE
  1. In the dev repo, set the four signing variables, then run:  build-android-public.bat release
  2. powershell -ExecutionPolicy Bypass -File C:\Users\hymlo\Downloads\ParchLock-public-git\publish-public.ps1 -Version 1.0.0 [-Notes "..."] [-Prerelease] [-DryRun]

  The signed APK always ships WITH the program: it is kept in the repository files, inside the complete
  package zip, and attached to the GitHub Release (with the source zip).
#>
param(
  [Parameter(Mandatory=$true)][string]$Version,
  [Parameter(Mandatory=$true)][string]$ArtifactManifest,
  [string]$Notes = "",
  [switch]$Prerelease,
  [switch]$DryRun
)
$ErrorActionPreference = 'Continue'
$Repo    = 'Hymlock/ParchLock'
$Dist    = 'C:\Users\hymlo\Downloads\ParchLock-dist-public'
$DevRepo = 'C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main'
$Work    = $PSScriptRoot
$Gh      = 'C:\Program Files\GitHub CLI\gh.exe'
$Tag     = "v$Version"

# Publish only an externally audited immutable snapshot; never rebuild an archive here.
$releaseManifest = Get-Content -LiteralPath $ArtifactManifest -Raw -ErrorAction Stop | ConvertFrom-Json
if ($releaseManifest.version -ne $Version -or $releaseManifest.repo -ne $Repo -or $releaseManifest.dist -ne $Dist) { throw 'Artifact manifest does not match this release target.' }
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected a numeric release version.' }
$expectedApkName = if ($Repo -eq 'Hymlock/ParchLock') { 'ParchLock-public.apk' } else { 'ParchLock.apk' }
$expectedBundleName = if ($Repo -eq 'Hymlock/ParchLock') { "ParchLock-complete-$Version.zip" } else { "ParchLock-private-complete-$Version.zip" }
if ([IO.Path]::GetFileName($releaseManifest.bundle) -ne $expectedBundleName) { throw 'Wrong public/private complete bundle name.' }
foreach ($required in @($expectedApkName,'ParchLock-source.zip','ParchLock.exe')) {
    if (@($releaseManifest.files.PSObject.Properties.Name) -notcontains $required) { throw "Required complete-package member missing from manifest: $required" }
}

if ([IO.Path]::GetFullPath($Work) -ne $releaseManifest.clone) { throw 'Wrong distribution clone.' }
$origin = (git -C $Work remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -ne "https://github.com/$Repo.git") { throw 'Wrong repository origin.' }
function Confirm-ReleaseFiles([string]$tree) {
    foreach ($entry in $releaseManifest.files.PSObject.Properties) {
        if ($entry.Name -match '(^[\\/]|\.\.|:)') { throw 'Unsafe manifest member.' }
        $file = Join-Path $tree $entry.Name
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing release file: $($entry.Name)" }
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256 -ErrorAction Stop).Hash -ne $entry.Value) { throw "Release bytes changed: $($entry.Name)" }
    }
}
Confirm-ReleaseFiles $Dist
$Bundle = $releaseManifest.bundle
if ((Get-FileHash -LiteralPath $Bundle -Algorithm SHA256 -ErrorAction Stop).Hash -ne $releaseManifest.bundleSha256) { throw 'Immutable complete bundle changed.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($Bundle)
try {
    $members = @{}
    foreach ($entry in $archive.Entries) {
        $name = $entry.FullName
        if ($name.EndsWith('/')) { continue }
        if ($name.Contains('\') -or $name -match '(^/|\.\.|:)' -or $members.ContainsKey($name)) { throw 'Unsafe/duplicate complete archive member.' }
        $members[$name] = $entry
    }
    if ($members.Count -ne @($releaseManifest.files.PSObject.Properties).Count) { throw 'Unexpected complete archive contents.' }
    foreach ($entry in $releaseManifest.files.PSObject.Properties) {
        if (!$members.ContainsKey($entry.Name)) { throw "Complete archive missing $($entry.Name)" }
        $stream = $members[$entry.Name].Open(); $hasher = [Security.Cryptography.SHA256]::Create()
        try { $actual = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','') }
        finally { $stream.Dispose(); $hasher.Dispose() }
        if ($actual -ne $entry.Value) { throw "Complete archive bytes differ: $($entry.Name)" }
    }
    $expectedStoryCount = if ($Repo -eq 'Hymlock/ParchLock') { 75 } else { 309 }
    if (@($members.Keys | Where-Object { $_ -like 'games/*.js' }).Count -ne $expectedStoryCount) { throw 'Incorrect public/private story boundary.' }
    if (@($members.Keys | Where-Object { $_ -like '*-dev.apk' }).Count) { throw 'Development APK in signed release.' }
} finally { $archive.Dispose() }
$rootItem = Get-Item -LiteralPath $Work -Force
if ($rootItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unexpected clone link.' }
if (@(Get-ChildItem -LiteralPath $Work -Recurse -Force -Attributes ReparsePoint -ErrorAction Stop).Count) { throw 'Unexpected link inside distribution clone.' }


if (-not (Test-Path "$Dist\play.html")) { throw "No public build output in $Dist. Run build-android-public.bat release first." }
$Apk = Join-Path $Dist 'ParchLock-public.apk'
$Zip = Join-Path $Dist 'ParchLock-source.zip'
if (-not (Test-Path $Apk)) { throw "No signed ParchLock-public.apk in $Dist (a dev build makes ParchLock-public-dev.apk; publish only release builds)." }
if (-not (Test-Path $Zip)) { throw "No ParchLock-source.zip in $Dist" }
$DevCommit = $releaseManifest.applicationCommit
$null = & $Gh release view $Tag --repo $Repo 2>&1
if ($LASTEXITCODE -eq 0) { throw "Release $Tag already exists. Pick another -Version." }

# The public complete archive is already verified and immutable.

Write-Host "Syncing $Dist -> $Work"
robocopy $Dist $Work /MIR /XD .git /XF *-dev.apk *.aab .gitignore publish-public.ps1 /NFL /NDL /NJH /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Sync failed" }

Confirm-ReleaseFiles $Work

git -C $Work add -A
if ($LASTEXITCODE -ne 0) { throw "git add failed" }
$changes = git -C $Work status --porcelain
if ($DryRun) { git -C $Work status --short; Write-Host "DryRun: stopping before commit/push/release."; exit 0 }
if ($changes) { git -C $Work commit -q -m "ParchLock $Version public build (dev commit $DevCommit)"; if ($LASTEXITCODE -ne 0) { throw "Commit failed" } }
git -C $Work tag -a $Tag -m "ParchLock $Version (dev commit $DevCommit)"
if ($LASTEXITCODE -ne 0) { throw "git tag failed" }
git -C $Work push origin main --follow-tags
if ($LASTEXITCODE -ne 0) { throw "Push failed" }

$body = @"
ParchLock $Version - free, non-commercial. Built with build-android-public.bat from dev commit $DevCommit.
Based on Parchmap by Roy Lazarovich; ParchLock modifications under GPL-3.0.
ParchLock-source.zip is the corresponding source for this build.
Android: download ParchLock-public.apk. Everything together: ParchLock-complete-$Version.zip (desktop program, APK and source). The complete ZIP includes the signed APK and matching source inside it.
$Notes
"@
$a = @('release','create',$Tag,$Bundle,$Apk,$Zip,'--repo',$Repo,'--title',"ParchLock $Version",'--notes',$body,'--verify-tag')
if ($Prerelease) { $a += '--prerelease' }
& $Gh @a
if ($LASTEXITCODE -ne 0) { throw "Release creation failed" }
& $Gh release view $Tag --repo $Repo --json url --jq .url
