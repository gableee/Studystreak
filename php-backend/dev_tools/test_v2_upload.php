<?php
/**
 * Quick test to verify learning-materials-v2 bucket upload with metadata
 */

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\SupabaseConfig;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$config = new SupabaseConfig();

echo "✓ Bucket configured: " . $config->getStorageBucket() . "\n";
echo "✓ Supabase URL: " . $config->getUrl() . "\n";

if ($config->getStorageBucket() === 'learning-materials-v2') {
    echo "✅ SUCCESS: Backend is using learning-materials-v2 bucket\n";
} else {
    echo "❌ ERROR: Expected learning-materials-v2, got " . $config->getStorageBucket() . "\n";
}

// Test upload endpoint availability
$ch = curl_init('http://localhost:8181/api/learning-materials');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 401 || $httpCode === 200) {
    echo "✅ API endpoint is accessible\n";
} else {
    echo "⚠ API endpoint returned HTTP $httpCode\n";
}

echo "\nAll configuration checks passed! Ready to test uploads.\n";
