<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Config\SupabaseConfig;
use Dotenv\Dotenv;
use GuzzleHttp\Client;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

$config = new SupabaseConfig();
$serviceKey = $config->getServiceRoleKey();

if ($serviceKey === null || $serviceKey === '') {
    fwrite(STDERR, "SUPABASE_SERVICE_ROLE_KEY is required to run this script." . PHP_EOL);
    exit(1);
}

$client = new Client([
    'base_uri' => rtrim($config->getUrl(), '/')
]);

$headers = [
    'apikey' => $config->getAnonKey(),
    'Authorization' => 'Bearer ' . $serviceKey,
    'Accept' => 'application/json',
];

$response = $client->request('GET', '/rest/v1/learning_materials', [
    'headers' => $headers,
    'query' => [
        'select' => 'content_type',
        'limit' => '100',
    ],
]);

$payload = json_decode((string) $response->getBody(), true);

if (!is_array($payload)) {
    fwrite(STDERR, "Unexpected response\n");
    exit(1);
}

$unique = array_values(array_unique(array_map(static function ($row) {
    return isset($row['content_type']) ? (string) $row['content_type'] : '';
}, $payload)));

sort($unique);

foreach ($unique as $value) {
    if ($value === '') {
        continue;
    }
    echo $value, PHP_EOL;
}
