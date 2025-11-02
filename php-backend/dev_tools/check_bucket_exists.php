<?php
/**
 * Diagnostic script to check bucket configuration and policies
 */
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();

use App\Config\SupabaseConfig;
use GuzzleHttp\Client;

$config = new SupabaseConfig();
$client = new Client(['base_uri' => $config->getUrl()]);
$bucket = $config->getStorageBucket();

echo "=== STORAGE BUCKET DIAGNOSTICS ===\n\n";
echo "Bucket name: {$bucket}\n";
echo "Supabase URL: {$config->getUrl()}\n\n";

$serviceKey = $config->getServiceRoleKey();
$anonKey = $config->getAnonKey();

// 1. Check if bucket exists and get its configuration
echo "1. Checking bucket configuration...\n";
try {
    $response = $client->request('GET', '/storage/v1/bucket/' . rawurlencode($bucket), [
        'headers' => [
            'Authorization' => 'Bearer ' . $serviceKey,
            'apikey' => $serviceKey,
        ],
        'http_errors' => false,
    ]);
    
    $status = $response->getStatusCode();
    $body = (string)$response->getBody();
    
    echo "   Status: {$status}\n";
    if ($status === 200) {
        $bucketInfo = json_decode($body, true);
        echo "   Bucket info:\n";
        echo "   - ID: " . ($bucketInfo['id'] ?? 'N/A') . "\n";
        echo "   - Name: " . ($bucketInfo['name'] ?? 'N/A') . "\n";
        echo "   - Public: " . (isset($bucketInfo['public']) ? ($bucketInfo['public'] ? 'YES' : 'NO') : 'N/A') . "\n";
        echo "   - File size limit: " . ($bucketInfo['file_size_limit'] ?? 'N/A') . "\n";
        echo "   - Allowed MIME types: " . (isset($bucketInfo['allowed_mime_types']) ? json_encode($bucketInfo['allowed_mime_types']) : 'N/A') . "\n";
        echo "   Full response: " . json_encode($bucketInfo, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "   ERROR: {$body}\n";
    }
} catch (Exception $e) {
    echo "   Exception: " . $e->getMessage() . "\n";
}

echo "\n";

// 2. List all buckets
echo "2. Listing all available buckets...\n";
try {
    $response = $client->request('GET', '/storage/v1/bucket', [
        'headers' => [
            'Authorization' => 'Bearer ' . $serviceKey,
            'apikey' => $serviceKey,
        ],
        'http_errors' => false,
    ]);
    
    $status = $response->getStatusCode();
    $body = (string)$response->getBody();
    
    echo "   Status: {$status}\n";
    if ($status === 200) {
        $buckets = json_decode($body, true);
        if (is_array($buckets)) {
            echo "   Found " . count($buckets) . " bucket(s):\n";
            foreach ($buckets as $b) {
                echo "   - " . ($b['name'] ?? 'unnamed') . " (public: " . ($b['public'] ? 'yes' : 'no') . ")\n";
            }
        }
    } else {
        echo "   ERROR: {$body}\n";
    }
} catch (Exception $e) {
    echo "   Exception: " . $e->getMessage() . "\n";
}

echo "\n";

// 3. Test upload with service role key
echo "3. Testing upload with service role key...\n";
$testPath = 'diagnostic-test-' . time() . '.txt';
$testContent = "Diagnostic test at " . date('Y-m-d H:i:s');

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
    
    echo "   Status: {$status}\n";
    echo "   Response: {$body}\n";
    
    if ($status >= 200 && $status < 300) {
        echo "   ✓ Upload successful with service role key\n";
        
        // Try to delete it
        $delResponse = $client->request('DELETE', '/storage/v1/object/' . rawurlencode($bucket) . '/' . rawurlencode($testPath), [
            'headers' => [
                'Authorization' => 'Bearer ' . $serviceKey,
                'apikey' => $serviceKey,
            ],
            'http_errors' => false,
        ]);
        echo "   Cleanup: " . $delResponse->getStatusCode() . "\n";
    } else {
        echo "   ✗ Upload failed with service role key\n";
    }
} catch (Exception $e) {
    echo "   Exception: " . $e->getMessage() . "\n";
}

echo "\n";

// 4. Test upload with anon key
echo "4. Testing upload with anon key...\n";
$testPath2 = 'diagnostic-test-anon-' . time() . '.txt';

try {
    $response = $client->request('POST', '/storage/v1/object/' . rawurlencode($bucket) . '/' . rawurlencode($testPath2), [
        'headers' => [
            'Authorization' => 'Bearer ' . $anonKey,
            'apikey' => $anonKey,
            'Content-Type' => 'text/plain',
        ],
        'body' => $testContent,
        'http_errors' => false,
    ]);
    
    $status = $response->getStatusCode();
    $body = (string)$response->getBody();
    
    echo "   Status: {$status}\n";
    echo "   Response: {$body}\n";
    
    if ($status >= 200 && $status < 300) {
        echo "   ✓ Upload successful with anon key\n";
    } else {
        echo "   ✗ Upload failed with anon key (this is expected if RLS is enabled)\n";
    }
} catch (Exception $e) {
    echo "   Exception: " . $e->getMessage() . "\n";
}

echo "\n=== END DIAGNOSTICS ===\n";
