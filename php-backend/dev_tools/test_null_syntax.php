<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';

$config = new App\Config\SupabaseConfig();
$client = new GuzzleHttp\Client(['base_uri' => $config->getUrl()]);

// Test different null filter syntaxes
$materialId = 'fd651af7-8ec2-4892-9e5e-6db31af5e86d';

$syntaxes = [
    'deleted_at.is.null',
    'deleted_at=is.null',
    'deleted_at=isnull',
];

foreach ($syntaxes as $syntax) {
    echo "Testing syntax: $syntax\n";
    try {
        $response = $client->request('GET', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $config->getAnonKey(),
                'apikey' => $config->getAnonKey(),
                'Accept' => 'application/json',
            ],
            'query' => [
                'material_id' => 'eq.' . $materialId,
                $syntax => '',
                'limit' => 1,
            ],
        ]);

        $body = json_decode((string)$response->getBody(), true);
        echo 'Status: ' . $response->getStatusCode() . ', Count: ' . count($body) . PHP_EOL;
    } catch (Exception $e) {
        echo 'Error: ' . $e->getMessage() . PHP_EOL;
    }
    echo "\n";
}
