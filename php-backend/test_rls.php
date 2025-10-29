<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';

$config = new App\Config\SupabaseConfig();
$client = new GuzzleHttp\Client(['base_uri' => $config->getUrl()]);

// Check RLS status
$response = $client->request('GET', '/rest/v1/learning_materials', [
    'headers' => [
        'Authorization' => 'Bearer ' . $config->getAnonKey(),
        'apikey' => $config->getAnonKey(),
        'Accept' => 'application/json',
    ],
    'query' => [
        'select' => 'material_id,is_public,user_id',
        'deleted_at' => 'is.null',
        'limit' => 10,
    ],
]);

$body = json_decode((string)$response->getBody(), true);
echo 'Returned materials: ' . count($body) . PHP_EOL;
foreach ($body as $material) {
    echo "ID: {$material['material_id']}, is_public: " . var_export($material['is_public'], true) . ", user_id: {$material['user_id']}\n";
}
?>