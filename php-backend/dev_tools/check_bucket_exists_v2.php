<?php
require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$baseUrl = rtrim($_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?? '', '/');
$serviceKey = $_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?? '';
$bucket = $_ENV['SUPABASE_STORAGE_BUCKET'] ?? getenv('SUPABASE_STORAGE_BUCKET') ?? '';

if ($baseUrl === '' || $serviceKey === '') {
    fwrite(STDERR, "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env\n");
    exit(1);
}

$ch = curl_init($baseUrl . '/storage/v1/bucket');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $serviceKey,
        'apikey: ' . $serviceKey,
        'Accept: application/json',
    ],
]);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP $http\n";
$decoded = json_decode($resp, true);
if (!is_array($decoded)) {
    echo $resp . "\n";
    exit(0);
}

$names = array_map(fn($b) => $b['name'] ?? '', $decoded);
echo "Buckets: " . implode(', ', $names) . "\n";

if ($bucket !== '') {
    $exists = in_array($bucket, $names, true);
    echo ($exists ? '✅' : '❌') . " Bucket in .env: $bucket\n";
}
