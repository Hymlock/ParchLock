param(
    [Parameter(Mandatory=$true)][string]$Distribution,
    [Parameter(Mandatory=$true)][string]$Apk
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$folder = (Resolve-Path -LiteralPath $Distribution).Path
$apkPath = (Resolve-Path -LiteralPath $Apk).Path
if ([IO.Path]::GetDirectoryName($apkPath) -ne $folder) { throw 'APK must be inside the distribution folder.' }
foreach ($name in @('ParchLock.exe','ParchLock-source.zip','play.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $folder $name) -PathType Leaf)) { throw "Missing distribution file: $name" }
}
$destination = $folder.TrimEnd('\') + '.zip'
$temporary = $destination + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
try {
    # Match the working 2.0.1 web archive: streamed file entries, explicit
    # directories and portable Unix file metadata. Keep this usable in PowerShell 5.
    if (-not ('ParchLockZipSink' -as [type])) {
        Add-Type @'
using System;
using System.IO;
public sealed class ParchLockZipSink : Stream {
    readonly Stream output;
    public ParchLockZipSink(Stream output) { this.output = output; }
    public override bool CanRead { get { return false; } }
    public override bool CanSeek { get { return false; } }
    public override bool CanWrite { get { return true; } }
    public override long Length { get { return output.Length; } }
    public override long Position { get { return output.Position; } set { throw new NotSupportedException(); } }
    public override void Flush() { output.Flush(); }
    public override void Write(byte[] b, int o, int c) { output.Write(b,o,c); }
    public override int Read(byte[] b,int o,int c) { throw new NotSupportedException(); }
    public override long Seek(long o,SeekOrigin s) { throw new NotSupportedException(); }
    public override void SetLength(long l) { throw new NotSupportedException(); }
}
'@
    }
    $output = [IO.File]::Create($temporary)
    try {
        $sink = New-Object ParchLockZipSink($output)
        $writer = New-Object IO.Compression.ZipArchive($sink, [IO.Compression.ZipArchiveMode]::Create, $true)
        try {
            foreach ($file in Get-ChildItem -LiteralPath $folder -Recurse -File | Sort-Object FullName) {
                $name = $file.FullName.Substring($folder.Length + 1).Replace('\','/')
                $entry = $writer.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
                $source = [IO.File]::OpenRead($file.FullName); $target = $entry.Open()
                try { $source.CopyTo($target) } finally { $target.Dispose(); $source.Dispose() }
            }
            foreach ($dir in Get-ChildItem -LiteralPath $folder -Recurse -Directory | Sort-Object FullName) {
                $name = $dir.FullName.Substring($folder.Length + 1).Replace('\','/') + '/'
                $null = $writer.CreateEntry($name)
            }
        } finally { $writer.Dispose() }
    } finally { $output.Dispose() }
    # ZipArchive does not expose the central directory's creator-system field.
    # Set standard Unix creator/mode fields without touching compressed payloads.
    $stream = [IO.File]::Open($temporary, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite)
    try {
        $reader = New-Object IO.BinaryReader($stream)
        $tailSize = [int][Math]::Min(65557, $stream.Length)
        $stream.Position = $stream.Length - $tailSize; $tail = $reader.ReadBytes($tailSize)
        $end = -1
        for ($i=$tail.Length-22; $i -ge 0; $i--) { if ([BitConverter]::ToUInt32($tail,$i) -eq 0x06054b50) { $end=$i; break } }
        if ($end -lt 0) { throw 'ZIP central directory not found.' }
        $count = [BitConverter]::ToUInt16($tail,$end+10)
        $stream.Position = [BitConverter]::ToUInt32($tail,$end+16)
        for ($i=0; $i -lt $count; $i++) {
            $position=$stream.Position; $header=$reader.ReadBytes(46)
            if ([BitConverter]::ToUInt32($header,0) -ne 0x02014b50) { throw 'Invalid ZIP central directory.' }
            $nameSize=[BitConverter]::ToUInt16($header,28); $extraSize=[BitConverter]::ToUInt16($header,30); $commentSize=[BitConverter]::ToUInt16($header,32)
            $name=[Text.Encoding]::UTF8.GetString($reader.ReadBytes($nameSize))
            $header[5]=3
            $mode = if ($name.EndsWith('/')) { [uint32]0x41ff0000 } elseif ($name.EndsWith('.exe')) { [uint32]([long]2180972544) } else { [uint32]([long]2176188416) }
            [BitConverter]::GetBytes($mode).CopyTo($header,38)
            $stream.Position=$position; $stream.Write($header,0,46)
            $stream.Position=$position+46+$nameSize+$extraSize+$commentSize
        }
    } finally { $stream.Dispose() }
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
