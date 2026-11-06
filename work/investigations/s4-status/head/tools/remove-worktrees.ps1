# Remove gate/probe worktrees safely. Their uncommitted work is archived in
# work/investigations/worktree-archive. Links (junctions/symlinks) are deleted as links
# FIRST, so their targets (the real games/node_modules) are never followed.
$ErrorActionPreference = 'Stop'
$main = 'C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main'
$inv = Get-Content -Raw (Join-Path $main 'work\investigations\worktree-inventory.json') | ConvertFrom-Json
$baseline = (Get-ChildItem (Join-Path $main 'games') -File).Count
"baseline games: $baseline"
$removed = 0; $failed = @()
foreach ($w in $inv) {
    $p = $w.path -replace '/', '\'
    if ($p -match 'worktree-pool') { continue }
    if (-not (Test-Path -LiteralPath $p)) { continue }
    try {
        # 1. Delete every reparse point (link) anywhere in the tree, as a link only.
        $links = Get-ChildItem -LiteralPath $p -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue
        foreach ($l in $links) { [System.IO.Directory]::Delete($l.FullName, $false) }
        # 2. Safety: the real games folder must be untouched.
        $now = (Get-ChildItem (Join-Path $main 'games') -File).Count
        if ($now -ne $baseline) { throw "ABORT: main games changed $baseline -> $now after unlinking $p" }
        # 3. Remove the folder (long-path safe).
        Remove-Item -LiteralPath ('\\?\' + $p) -Recurse -Force
        $removed++
    } catch {
        if ($_.Exception.Message -like 'ABORT*') { throw }
        $failed += "$p : $($_.Exception.Message)"
    }
}
$final = (Get-ChildItem (Join-Path $main 'games') -File).Count
"removed: $removed  failed: $($failed.Count)  games now: $final"
$failed | Select-Object -First 10
