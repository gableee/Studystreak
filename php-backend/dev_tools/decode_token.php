<?php
if ($argc < 2) {
    fwrite(STDERR, "Usage: php decode_token.php <token>\n");
    exit(1);
}
$token = $argv[1];
$parts = explode('.', $token);
if (count($parts) < 2) {
    fwrite(STDERR, "Invalid token\n");
    exit(1);
}
$payload = $parts[1];
$decoded = base64_decode(strtr($payload, '-_', '+/'));
echo $decoded, "\n";
