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

if (-not (Test-Path "$Dist\play.html")) { throw "No public build output in $Dist. Run build-android-public.bat release first." }
$Apk = Join-Path $Dist 'ParchLock-public.apk'
$Zip = Join-Path $Dist 'ParchLock-source.zip'
if (-not (Test-Path $Apk)) { throw "No signed ParchLock-public.apk in $Dist (a dev build makes ParchLock-public-dev.apk; publish only release builds)." }
if (-not (Test-Path $Zip)) { throw "No ParchLock-source.zip in $Dist" }
$DevCommit = (git -C $DevRepo rev-parse --short HEAD).Trim()
$null = & $Gh release view $Tag --repo $Repo 2>&1
if ($LASTEXITCODE -eq 0) { throw "Release $Tag already exists. Pick another -Version." }

# Complete package: desktop program + signed APK + source zip (standard forward-slash zip paths via tar).
$Bundle = Join-Path (Split-Path $Dist -Parent) "ParchLock-complete-$Version.zip"
if (-not $DryRun) {
  Remove-Item $Bundle -ErrorAction SilentlyContinue
  Push-Location $Dist
  $names = Get-ChildItem -Name | Where-Object { $_ -notlike "*-dev.apk" }
  & (Join-Path $env:SystemRoot 'System32\tar.exe') -a -c -f $Bundle @names
  Pop-Location
  if (-not (Test-Path $Bundle)) { throw "Complete package was not created" }
}

Write-Host "Syncing $Dist -> $Work"
robocopy $Dist $Work /MIR /XD .git /XF *-dev.apk *.aab .gitignore publish-public.ps1 /NFL /NDL /NJH /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Sync failed" }

# Keep the public-build note at the top of GAMES_INCLUDED.md (the dev repo's copy lists all cleared titles).
$gi = Join-Path $Work 'GAMES_INCLUDED.md'
if (Test-Path $gi) {
  $text = Get-Content $gi -Raw
  if ($text -notmatch 'Public build:') {
    $note = "> **Public build:** this distribution bundles only the Z-machine stories in release\public-games.txt. Glulx titles listed here are not bundled; Glulx stories you add yourself play with story text and input only (no map, underlines or Equipment).`r`n`r`n"
    $text = $text -replace '^(# [^\r\n]*\r?\n)', ('$1' + "`r`n" + $note)
    Set-Content -Path $gi -Value $text -NoNewline -Encoding utf8
  }
}

git -C $Work add -A
$changes = git -C $Work status --porcelain
if ($DryRun) { git -C $Work status --short; Write-Host "DryRun: stopping before commit/push/release."; exit 0 }
if ($changes) { git -C $Work commit -q -m "ParchLock $Version public build (dev commit $DevCommit)"; if ($LASTEXITCODE -ne 0) { throw "Commit failed" } }
git -C $Work tag -a $Tag -m "ParchLock $Version (dev commit $DevCommit)"
git -C $Work push origin main --follow-tags
if ($LASTEXITCODE -ne 0) { throw "Push failed" }

$body = @"
ParchLock $Version - free, non-commercial. Built with build-android-public.bat from dev commit $DevCommit.
Based on Parchmap by Roy Lazarovich; ParchLock modifications under GPL-3.0.
ParchLock-source.zip is the corresponding source for this build.
Android: download ParchLock-public.apk. Everything together: ParchLock-complete-$Version.zip (desktop program, APK and source). If an update looks unchanged, uninstall the old version first.
$Notes
"@
$a = @('release','create',$Tag,$Bundle,$Apk,$Zip,'--repo',$Repo,'--title',"ParchLock $Version",'--notes',$body,'--verify-tag')
if ($Prerelease) { $a += '--prerelease' }
& $Gh @a
if ($LASTEXITCODE -ne 0) { throw "Release creation failed" }
& $Gh release view $Tag --repo $Repo --json url --jq .url
