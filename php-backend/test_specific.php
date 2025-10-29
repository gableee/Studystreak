<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';

$config = new App\Config\SupabaseConfig();
$client = new GuzzleHttp\Client(['base_uri' => $config->getUrl()]);

// Test specific material query
$materialId = 'fd651af7-8ec2-4892-9e5e-6db31af5e86d';
$response = $client->request('GET', '/rest/v1/learning_materials', [
    'headers' => [
        'Authorization' => 'Bearer ' . $config->getAnonKey(),
        'apikey' => $config->getAnonKey(),
        'Accept' => 'application/json',
    ],
    'query' => [
        'select' => 'material_id,title,description,content_type,file_url,file_name,mime,size,is_public,user_id,created_by,uploader_name,uploader_email,storage_path,tags,tags_jsonb,like_count,likes_count,download_count,downloads_count,created_at,updated_at,deleted_at',
        'material_id' => 'eq.' . $materialId,
        'deleted_at' => 'is.null',
        'limit' => 1,
    ],
]);

echo 'Status: ' . $response->getStatusCode() . PHP_EOL;
$body = json_decode((string)$response->getBody(), true);
echo 'Count: ' . count($body) . PHP_EOL;
if (count($body) > 0) {
    print_r($body[0]);
} else {
    echo "No material found with deleted_at filter\n";
}

// Try without deleted_at filter
$response2 = $client->request('GET', '/rest/v1/learning_materials', [
    'headers' => [
        'Authorization' => 'Bearer ' . $config->getAnonKey(),
        'apikey' => $config->getAnonKey(),
        'Accept' => 'application/json',
    ],
    'query' => [
        'select' => 'material_id,title,description,content_type,file_url,file_name,mime,size,is_public,user_id,created_by,uploader_name,uploader_email,storage_path,tags,tags_jsonb,like_count,likes_count,download_count,downloads_count,created_at,updated_at,deleted_at',
        'material_id' => 'eq.' . $materialId,
        'limit' => 1,
    ],
]);

echo "\nWithout deleted_at filter:\n";
echo 'Status: ' . $response2->getStatusCode() . PHP_EOL;
$body2 = json_decode((string)$response2->getBody(), true);
echo 'Count: ' . count($body2) . PHP_EOL;
if (count($body2) > 0) {
    print_r($body2[0]);
}