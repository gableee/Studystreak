<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';

$config = new App\Config\SupabaseConfig();
$client = new GuzzleHttp\Client(['base_uri' => $config->getUrl()]);

// Test database query with deleted_at filter and is_public filter
$query = [
    'deleted_at' => 'is.null',
    'is_public' => 'eq.true',
    'limit' => 5,
];

echo "Query: " . json_encode($query) . PHP_EOL;

$response = $client->request('GET', '/rest/v1/learning_materials', [
    'headers' => [
        'Authorization' => 'Bearer ' . $config->getAnonKey(),
        'apikey' => $config->getAnonKey(),
        'Accept' => 'application/json',
        'Prefer' => 'count=exact',
    ],
    'query' => $query,
]);

echo 'Status: ' . $response->getStatusCode() . PHP_EOL;
$body = json_decode((string)$response->getBody(), true);
echo 'Count: ' . count($body) . PHP_EOL;
if (count($body) > 0) {
    print_r($body[0]);
} else {
    echo "No matching materials found\n";
}
