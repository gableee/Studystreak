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

$response = $client->request('GET', '/rest/v1/information_schema.check_constraints', [
    'headers' => $headers,
    'query' => [
        'constraint_name' => 'eq.learning_materials_content_type_check',
        'select' => 'constraint_name,check_clause',
    ],
]);

$payload = json_decode((string) $response->getBody(), true);

if (!is_array($payload) || $payload === []) {
    fwrite(STDERR, "Constraint not found or inaccessible." . PHP_EOL);
    exit(1);
}

echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
