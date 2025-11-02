<?php
/**
 * Test upload with a real user token to see what happens
 */
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();

use App\Config\SupabaseConfig;
use GuzzleHttp\Client;

$config = new SupabaseConfig();
$client = new Client(['base_uri' => $config->getUrl()]);
$bucket = $config->getStorageBucket();

echo "Testing upload scenarios...\n\n";

$testContent = "Test at " . date('Y-m-d H:i:s');
$testPath = 'test-user-upload-' . time() . '.txt';

// Scenario 1: User token (anon key) with anon apikey
echo "1. Testing with anon key as both Authorization and apikey...\n";
try {
    $response = $client->request('POST', '/storage/v1/object/' . rawurlencode($bucket) . '/' . rawurlencode($testPath), [
        'headers' => [
            'Authorization' => 'Bearer ' . $config->getAnonKey(),
            'apikey' => $config->getAnonKey(),
            'Content-Type' => 'text/plain',
        ],
        'body' => $testContent,
        'http_errors' => false,
    ]);
    
    echo "   Status: " . $response->getStatusCode() . "\n";
    echo "   Response: " . (string)$response->getBody() . "\n\n";
} catch (Exception $e) {
    echo "   Exception: " . $e->getMessage() . "\n\n";
}

// Scenario 2: Check if bucket name encoding matters
echo "2. Testing different bucket name encodings...\n";
$encodings = [
    'rawurlencode' => rawurlencode($bucket),
    'urlencode' => urlencode($bucket),
    'plain' => $bucket,
];

foreach ($encodings as $method => $encoded) {
    echo "   Method: {$method} -> {$encoded}\n";
    $url = '/storage/v1/object/' . $encoded . '/' . rawurlencode($testPath);
    echo "   URL: {$url}\n";
    
    try {
        $response = $client->request('POST', $url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $config->getServiceRoleKey(),
                'apikey' => $config->getServiceRoleKey(),
                'Content-Type' => 'text/plain',
            ],
            'body' => $testContent,
            'http_errors' => false,
        ]);
        
        echo "   Status: " . $response->getStatusCode() . "\n";
        $body = (string)$response->getBody();
        if ($response->getStatusCode() < 300) {
            echo "   ✓ Success\n";
        } else {
            echo "   Response: {$body}\n";
        }
    } catch (Exception $e) {
        echo "   Exception: " . $e->getMessage() . "\n";
    }
    echo "\n";
}

// Scenario 3: Check what happens with wrong bucket name
echo "3. Testing with non-existent bucket...\n";
try {
    $response = $client->request('POST', '/storage/v1/object/' . rawurlencode('non-existent-bucket') . '/' . rawurlencode($testPath), [
        'headers' => [
            'Authorization' => 'Bearer ' . $config->getServiceRoleKey(),
            'apikey' => $config->getServiceRoleKey(),
            'Content-Type' => 'text/plain',
        ],
        'body' => $testContent,
        'http_errors' => false,
    ]);
    
    echo "   Status: " . $response->getStatusCode() . "\n";
    echo "   Response: " . (string)$response->getBody() . "\n\n";
} catch (Exception $e) {
    echo "   Exception: " . $e->getMessage() . "\n\n";
}
