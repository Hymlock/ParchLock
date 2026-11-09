param(
    [Parameter(Mandatory=$true)][string]$Distribution,
    [Parameter(Mandatory=$true)][string]$Apk
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$folder = (Resolve-Path -LiteralPath $Distribution).Path
$apkPath = (Resolve-Path -LiteralPath $Apk).Path
if ([IO.Path]::GetDirectoryName($apkPath) -ne $folder) { throw 'APK must be inside the distribution folder.' }
foreach ($name in @('ParchLock.exe','ParchLock-source.zip','play.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $folder $name) -PathType Leaf)) { throw "Missing distribution file: $name" }
}
$destination = $folder.TrimEnd('\') + '.zip'
$temporary = $destination + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
try {
    [IO.Compression.ZipFile]::CreateFromDirectory($folder, $temporary, [IO.Compression.CompressionLevel]::Optimal, $false)
    $zip = [IO.Compression.ZipFile]::OpenRead($temporary)
    try {
        foreach ($name in @('ParchLock.exe','ParchLock-source.zip','play.html',[IO.Path]::GetFileName($apkPath))) {
            $entry = $zip.GetEntry($name)
            if ($null -eq $entry) { throw "Missing complete ZIP entry: $name" }
            $stream = $entry.Open()
            $sha = [Security.Cryptography.SHA256]::Create()
            try { $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') }
            finally { $stream.Dispose(); $sha.Dispose() }
            $inputStream = [IO.File]::OpenRead((Join-Path $folder $name))
            $inputSha = [Security.Cryptography.SHA256]::Create()
            try { $expected = [BitConverter]::ToString($inputSha.ComputeHash($inputStream)).Replace('-','') }
            finally { $inputStream.Dispose(); $inputSha.Dispose() }
            if ($actual -ne $expected) { throw "Complete ZIP hash mismatch: $name" }
        }
    } finally { $zip.Dispose() }
    Move-Item -LiteralPath $temporary -Destination $destination -Force
    Write-Host "Complete distribution: $destination"
} finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
