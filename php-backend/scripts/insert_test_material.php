<?php
require __DIR__ . '/../vendor/autoload.php';

use App\Config\SupabaseConfig;
use Dotenv\Dotenv;
use GuzzleHttp\Client;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$config = new SupabaseConfig();
$serviceKey = $config->getServiceRoleKey();
if ($serviceKey === null) { fwrite(STDERR, "No service role key configured\n"); exit(1); }
$client = new Client(['base_uri' => rtrim($config->getUrl(), '/')]);
$headers = [ 'apikey' => $config->getAnonKey(), 'Authorization' => 'Bearer ' . $serviceKey, 'Content-Type' => 'application/json' ];
$payload = [
    'title' => 'Test insert ' . time(),
    'description' => 'Inserted by diagnostic script',
    'content_type' => 'pdf',
    'is_public' => false,
    'user_id' => '20c43da0-a3a8-446f-9f19-4027fae844f5',
    'created_by' => '20c43da0-a3a8-446f-9f19-4027fae844f5',
    'tags_jsonb' => json_decode('["diag"]'),
];
try {
    $resp = $client->request('POST', '/rest/v1/learning_materials', [ 'headers' => $headers, 'json' => $payload ]);
    echo "Status: " . $resp->getStatusCode() . "\n";
    echo (string)$resp->getBody() . "\n";
} catch (\GuzzleHttp\Exception\ClientException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo (string)$e->getResponse()->getBody() . "\n";
}
