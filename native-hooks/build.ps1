param(
    [ValidateSet("relwithdebinfo", "release", "debug")]
    [string]$Preset = "relwithdebinfo"
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $Root

$DevKitCandidates = @()
if ($env:PARCHMAP_DEVKIT) { $DevKitCandidates += $env:PARCHMAP_DEVKIT }
if ($env:SKSEDEVKIT) { $DevKitCandidates += $env:SKSEDEVKIT }
foreach ($cand in @(
  (Join-Path $repoRoot "..\..\SKSEDevKit"),
  (Join-Path $repoRoot "..\SKSEDevKit"),
  (Join-Path $repoRoot "SKSEDevKit"),
  (Join-Path $Root "tools")
)) {
  try { $DevKitCandidates += (Resolve-Path $cand -ErrorAction Stop).Path } catch {}
}

$DevKit = $DevKitCandidates | Where-Object { $_ -and (Test-Path (Join-Path $_ "tools\cmake\bin\cmake.exe")) } | Select-Object -First 1
if (-not $DevKit) {
  if (-not (Get-Command cmake -ErrorAction SilentlyContinue) -or -not (Get-Command ninja -ErrorAction SilentlyContinue)) {
    throw "No DevKit found. Set PARCHMAP_DEVKIT to a tools tree containing tools/cmake and tools/ninja, or put cmake+ninja on PATH."
  }
}
$CMake = if ($DevKit) { Join-Path $DevKit "tools\cmake\bin\cmake.exe" } else { "cmake" }
$Ninja = if ($DevKit) { Join-Path $DevKit "tools\ninja.exe" } else { "ninja" }

$VcVarsCandidates = @(
  "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
  "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
  "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
)
$VcVars = $VcVarsCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $VcVars) { throw "No vcvars64.bat found (need VS Build Tools)" }

$Cl = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC\14.29.30133\bin\Hostx64\x64\cl.exe"
if (-not (Test-Path $Cl)) {
  $found = Get-ChildItem "${env:ProgramFiles(x86)}\Microsoft Visual Studio" -Recurse -Filter "cl.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match "Hostx64\\x64\\cl.exe$" } | Select-Object -First 1
  if ($found) { $Cl = $found.FullName }
}
if (-not (Test-Path $Cl)) { throw "cl.exe not found" }

$binDir = Join-Path $Root "build\$Preset"
if (Test-Path $binDir) { Remove-Item -Recurse -Force $binDir }

Write-Host "DevKit: $DevKit"
Write-Host "CMake: $CMake"
Write-Host "cl: $Cl"

$cmd = "`"$VcVars`" && cd /d `"$Root`" && set `"CC=$Cl`" && set `"CXX=$Cl`" && `"$CMake`" --preset $Preset -DCMAKE_C_COMPILER=`"$Cl`" && `"$CMake`" --build --preset $Preset && `".\build\$Preset\pm_vm_probe_smoke.exe`""
cmd /v:on /c $cmd
exit $LASTEXITCODE