<?php
/**
 * Simple test to upload a file to the learning-materials bucket
 */
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();

use App\Config\SupabaseConfig;
use GuzzleHttp\Client;

$config = new SupabaseConfig();
$client = new Client(['base_uri' => $config->getUrl()]);
$bucket = $config->getStorageBucket();

echo "Testing upload to bucket: {$bucket}\n";
echo "Using URL: {$config->getUrl()}\n\n";

// Create a simple test file
$testContent = "Test upload at " . date('Y-m-d H:i:s');
$testPath = 'test-upload-' . time() . '.txt';

echo "Uploading to path: {$testPath}\n";

// Try with service role key first
$serviceKey = $config->getServiceRoleKey();
if ($serviceKey) {
    echo "Attempting upload with service role key...\n";
    
    try {
        $response = $client->request('POST', '/storage/v1/object/' . rawurlencode($bucket) . '/' . rawurlencode($testPath), [
            'headers' => [
                'Authorization' => 'Bearer ' . $serviceKey,
                'apikey' => $serviceKey,
                'Content-Type' => 'text/plain',
            ],
            'body' => $testContent,
            'http_errors' => false,
        ]);
        
        $status = $response->getStatusCode();
        $body = (string)$response->getBody();
        
        echo "Status: {$status}\n";
        echo "Response: {$body}\n";
        
        if ($status >= 200 && $status < 300) {
            echo "✓ Upload successful!\n";
        } else {
            echo "✗ Upload failed!\n";
            
            // Try to get more info about the bucket
            echo "\nTrying to get bucket info...\n";
            $bucketResponse = $client->request('GET', '/storage/v1/bucket/' . rawurlencode($bucket), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $serviceKey,
                    'apikey' => $serviceKey,
                ],
                'http_errors' => false,
            ]);
            
            echo "Bucket info status: " . $bucketResponse->getStatusCode() . "\n";
            echo "Bucket info: " . (string)$bucketResponse->getBody() . "\n";
        }
    } catch (Exception $e) {
        echo "Exception: " . $e->getMessage() . "\n";
    }
} else {
    echo "No service role key available\n";
}
