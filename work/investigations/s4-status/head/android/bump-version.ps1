param([Parameter(Mandatory=$true)][string]$GradleFile)
$c = Get-Content $GradleFile -Raw
$m = [regex]::Match($c, 'versionCode\s+(\d+)')
if (-not $m.Success) { Write-Error "versionCode not found in $GradleFile"; exit 1 }
$next = [int]$m.Groups[1].Value + 1
$c = [regex]::Replace($c, 'versionCode\s+\d+', "versionCode $next")
Set-Content -Path $GradleFile -Value $c -NoNewline
Write-Host "      versionCode -> $next"
