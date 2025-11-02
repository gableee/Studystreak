<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';

$config = new App\Config\SupabaseConfig();
$client = new GuzzleHttp\Client(['base_uri' => $config->getUrl()]);
$bucket = $config->getStorageBucket();
$path = $argv[1] ?? '';
if ($path === '') {
    fwrite(STDERR, "Usage: php sign_test.php <path>\n");
    exit(1);
}

$response = $client->request('POST', '/storage/v1/object/sign/' . rawurlencode($bucket) . '/' . implode('/', array_map('rawurlencode', explode('/', $path))), [
    'headers' => [
        'Authorization' => 'Bearer ' . ($config->getServiceRoleKey() ?? $config->getAnonKey()),
        'apikey' => $config->getAnonKey(),
        'Content-Type' => 'application/json',
    ],
    'json' => ['expiresIn' => 3600],
]);

$body = json_decode((string)$response->getBody(), true);
print_r($body);

if (isset($body['signedURL'])) {
    $url = rtrim($config->getUrl(), '/') . '/storage/v1' . $body['signedURL'];
    echo "\nFull URL: $url\n";
    $download = $client->request('GET', '/storage/v1' . $body['signedURL'], [
        'headers' => ['apikey' => $config->getAnonKey()],
    ]);
    echo "Download status: " . $download->getStatusCode() . "\n";
    echo "Content-Type: " . $download->getHeaderLine('Content-Type') . "\n";
}
