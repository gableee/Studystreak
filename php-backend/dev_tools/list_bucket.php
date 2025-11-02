<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';

$config = new App\Config\SupabaseConfig();
$client = new GuzzleHttp\Client(['base_uri' => $config->getUrl()]);
$bucket = $config->getStorageBucket();

$prefix = $argv[1] ?? '';

$response = $client->request('POST', '/storage/v1/object/list/' . rawurlencode($bucket), [
    'headers' => [
        'Authorization' => 'Bearer ' . ($config->getServiceRoleKey() ?? $config->getAnonKey()),
        'apikey' => $config->getServiceRoleKey() ?? $config->getAnonKey(),
        'Content-Type' => 'application/json',
    ],
    'json' => [
        'prefix' => $prefix,
        'limit' => 20,
        'offset' => 0,
        'sortBy' => [
            'column' => 'created_at',
            'order' => 'desc'
        ],
    ],
]);

$body = (string) $response->getBody();

echo $body, "\n";
