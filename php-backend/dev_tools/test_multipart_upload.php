<?php
/**
 * Test multipart file upload like the frontend would send
 */
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();

use App\Config\SupabaseConfig;
use GuzzleHttp\Client;

$config = new SupabaseConfig();
$apiUrl = 'http://localhost:8181'; // Your PHP backend

// Create a temporary test file
$tmpFile = tempnam(sys_get_temp_dir(), 'upload_test_');
file_put_contents($tmpFile, "Test file content for upload at " . date('Y-m-d H:i:s'));

echo "Testing multipart upload to PHP backend\n";
echo "API URL: {$apiUrl}\n";
echo "Temp file: {$tmpFile}\n\n";

// Get a test token (you'll need to replace this with a real user token)
// For now, let's use the service role key as the Bearer token
$token = $config->getServiceRoleKey();

try {
    $client = new Client(['base_uri' => $apiUrl]);
    
    $response = $client->request('POST', '/api/learning-materials', [
        'headers' => [
            'Authorization' => 'Bearer ' . $token,
        ],
        'multipart' => [
            [
                'name' => 'title',
                'contents' => 'Test Upload Material'
            ],
            [
                'name' => 'description',
                'contents' => 'Testing file upload through backend'
            ],
            [
                'name' => 'is_public',
                'contents' => 'true'
            ],
            [
                'name' => 'file',
                'contents' => fopen($tmpFile, 'r'),
                'filename' => 'test-document.txt'
            ]
        ],
        'http_errors' => false,
    ]);
    
    $status = $response->getStatusCode();
    $body = (string)$response->getBody();
    
    echo "Status: {$status}\n";
    echo "Response:\n";
    echo json_encode(json_decode($body, true), JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
} finally {
    unlink($tmpFile);
}
