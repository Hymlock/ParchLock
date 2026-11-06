<?php
header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function log_fail($status, $message) {
    http_response_code($status);
    exit($message);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    log_fail(405, 'POST required');
}
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 32 * 1024) log_fail(413, 'Entry too large');
if (!isset($_POST['text']) || !is_string($_POST['text'])) log_fail(400, 'Invalid log entry');
if (strlen($_POST['text']) > 8192) log_fail(413, 'Entry too large');
$line = json_encode(array('text' => $_POST['text']));
if ($line === false) log_fail(400, 'Invalid UTF-8');
$line .= "\n";
$path = __DIR__ . DIRECTORY_SEPARATOR . 'events.log';
if (is_link($path)) log_fail(500, 'Log unavailable');
$handle = @fopen($path, 'c+b');
if ($handle === false) log_fail(500, 'Log unavailable');
if (!flock($handle, LOCK_EX)) { fclose($handle); log_fail(500, 'Log unavailable'); }
$stat = fstat($handle);
if (!$stat || $stat['size'] + strlen($line) > 10 * 1024 * 1024) {
    flock($handle, LOCK_UN); fclose($handle); log_fail(507, 'Log capacity reached');
}
$ok = fseek($handle, 0, SEEK_END) === 0;
$written = 0;
while ($ok && $written < strlen($line)) {
    $n = @fwrite($handle, substr($line, $written));
    if ($n === false || $n === 0) { $ok = false; break; }
    $written += $n;
}
$ok = $ok && @fflush($handle);
if (!$ok) { @ftruncate($handle, $stat['size']); @fflush($handle); }
flock($handle, LOCK_UN);
fclose($handle);
if (!$ok) log_fail(500, 'Unable to store log entry');
http_response_code(204);
