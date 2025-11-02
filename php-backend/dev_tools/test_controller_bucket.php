<?php
/**
 * Debug script to trace the exact upload flow
 */
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();

use App\Config\SupabaseConfig;
use App\Auth\SupabaseAuth;
use App\Controllers\LearningMaterialsController;

$config = new SupabaseConfig();

echo "=== Configuration Check ===\n";
echo "SUPABASE_URL: " . $config->getUrl() . "\n";
echo "SUPABASE_STORAGE_BUCKET: " . $config->getStorageBucket() . "\n";
echo "Has service role key: " . ($config->getServiceRoleKey() ? 'YES' : 'NO') . "\n";
echo "\n";

echo "=== Creating Controller ===\n";
$supabaseAuth = new SupabaseAuth($config->getUrl(), $config->getAnonKey());
$controller = new LearningMaterialsController($config, $supabaseAuth);

// Use reflection to check the bucket value
$reflection = new ReflectionClass($controller);
$bucketProperty = $reflection->getProperty('bucket');
$bucketProperty->setAccessible(true);
$bucketValue = $bucketProperty->getValue($controller);

echo "Controller bucket value: '{$bucketValue}'\n";
echo "Bucket value length: " . strlen($bucketValue) . "\n";
echo "Bucket value (hex): " . bin2hex($bucketValue) . "\n";
echo "\n";

if ($bucketValue !== 'learning-materials') {
    echo "❌ ERROR: Bucket value doesn't match expected 'learning-materials'\n";
    echo "Expected (hex): " . bin2hex('learning-materials') . "\n";
    echo "Actual (hex):   " . bin2hex($bucketValue) . "\n";
} else {
    echo "✓ Bucket value is correct\n";
}
