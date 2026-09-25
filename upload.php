<?php
// Preserve MainMenu's form POST and plain filename response contract.
header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function upload_fail($status, $message) {
    http_response_code($status);
    exit($message);
}
function upload_u16($data, $offset) { return unpack('n', substr($data, $offset, 2))[1]; }
function upload_u32($data, $offset) { return unpack('N', substr($data, $offset, 4))[1]; }
function upload_valid_zcode($data, $version = null) {
    $length = strlen($data);
    if ($length < 64) return false;
    $v = ord($data[0]);
    if (!in_array($v, array(3, 4, 5, 6, 7, 8), true) || ($version !== null && $v !== $version)) return false;
    $static = upload_u16($data, 14);
    $high = upload_u16($data, 4);
    $objects = upload_u16($data, 10);
    $globals = upload_u16($data, 12);
    $dictionary = upload_u16($data, 8);
    $declared = upload_u16($data, 26) * ($v <= 3 ? 2 : ($v <= 5 ? 4 : 8));
    if ($static < 64 || $static > $length || $high < $static || $high >= $length) return false;
    if ($objects < 64 || $objects + ($v <= 3 ? 62 : 126) > $static) return false;
    if ($globals < 64 || $globals + 480 > $static) return false;
    if ($dictionary !== 0 && ($dictionary < 64 || $dictionary >= $length)) return false;
    if ($declared && ($declared > $length || $declared < $high)) return false;
    $pc = upload_u16($data, 6);
    if ($v !== 6 && ($pc < $high || $pc >= $length)) return false;
    return true;
}
function upload_valid_blorb($data) {
    $length = strlen($data);
    if ($length < 12 || substr($data, 0, 4) !== 'FORM' || substr($data, 8, 4) !== 'IFRS' || upload_u32($data, 4) !== $length - 8) return false;
    $chunks = array();
    $index = null;
    for ($offset = 12; $offset < $length;) {
        if ($offset + 8 > $length) return false;
        $size = upload_u32($data, $offset + 4);
        $end = $offset + 8 + $size;
        if ($end + ($size % 2) > $length) return false;
        $type = substr($data, $offset, 4);
        $chunks[$offset] = array($type, $offset + 8, $size);
        if ($type === 'RIdx') {
            if ($index !== null) return false;
            $index = substr($data, $offset + 8, $size);
        }
        $offset = $end + ($size % 2);
    }
    if ($index === null || strlen($index) < 4) return false;
    $count = upload_u32($index, 0);
    if ($count > intdiv(strlen($index) - 4, 12) || strlen($index) !== 4 + $count * 12) return false;
    $executable = null;
    for ($i = 0; $i < $count; $i++) {
        $p = 4 + $i * 12;
        $target = upload_u32($index, $p + 8);
        if (!isset($chunks[$target])) return false;
        if (substr($index, $p, 4) === 'Exec' && upload_u32($index, $p + 4) === 0) {
            if ($executable !== null) return false;
            $executable = $chunks[$target];
        }
    }
    return $executable !== null && $executable[0] === 'ZCOD' && upload_valid_zcode(substr($data, $executable[1], $executable[2]));
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    upload_fail(405, 'POST required');
}
// Form encoding can expand each base64 character to three bytes.
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 96 * 1024 * 1024) upload_fail(413, 'Upload too large');
foreach (array('filename', 'extension', 'data') as $field) {
    if (!isset($_POST[$field]) || !is_string($_POST[$field])) upload_fail(400, 'Invalid upload fields');
}
$extension = $_POST['extension'];
if (!in_array($extension, array('z3', 'z5', 'z8', 'zblorb'), true)) upload_fail(400, 'Unsupported story extension');
if (strlen($_POST['filename']) > 255 || strlen($_POST['data']) > 23 * 1024 * 1024) upload_fail(413, 'Upload too large');
if (!preg_match("/\AprocessBase64Zcode\('([A-Za-z0-9+\/=]*)'\)\z/D", $_POST['data'], $match)) upload_fail(400, 'Invalid story wrapper');
$bytes = base64_decode($match[1], true);
if ($bytes === false || base64_encode($bytes) !== $match[1]) upload_fail(400, 'Invalid base64');
if (strlen($bytes) > 16 * 1024 * 1024) upload_fail(413, 'Story too large');
$valid = $extension === 'zblorb' ? upload_valid_blorb($bytes) : upload_valid_zcode($bytes, (int)substr($extension, 1));
if (!$valid) upload_fail(400, 'Invalid story data');
$directory = __DIR__ . DIRECTORY_SEPARATOR . 'user';
if (!is_dir($directory) || is_link($directory)) upload_fail(500, 'Upload directory unavailable');
try { $filename = bin2hex(random_bytes(16)) . '.' . $extension . '.js'; }
catch (Throwable $error) { upload_fail(500, 'Unable to allocate upload'); }
$path = $directory . DIRECTORY_SEPARATOR . $filename;
$handle = @fopen($path, 'xb');
if ($handle === false) upload_fail(500, 'Unable to create upload');
$wrapper = "processBase64Zcode('" . base64_encode($bytes) . "')";
$written = 0;
while ($written < strlen($wrapper)) {
    $n = @fwrite($handle, substr($wrapper, $written));
    if ($n === false || $n === 0) break;
    $written += $n;
}
$flushed = @fflush($handle);
$closed = fclose($handle);
if ($written !== strlen($wrapper) || !$flushed || !$closed) {
    @unlink($path);
    upload_fail(500, 'Unable to store upload');
}
echo $filename;
