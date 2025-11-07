<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

use App\Repositories\LearningMaterialRepository;
use GuzzleHttp\Client;

$supabaseUrl = $_ENV['SUPABASE_URL'] ?? '';
$supabaseAnonKey = $_ENV['SUPABASE_ANON_KEY'] ?? '';
$supabaseServiceRoleKey = $_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? null;
$materialId = '26ade762-f36e-407f-8c65-4b1af89c0e25';

echo "=== Testing LearningMaterialRepository::findById() ===\n";
echo "Material ID: $materialId\n\n";

// Create repository
$client = new Client(['base_uri' => $supabaseUrl]);
$repo = new LearningMaterialRepository($client, $supabaseAnonKey, $supabaseServiceRoleKey);

// Test fetch with anon key (simulating user token)
echo "Fetching material with anon key...\n";
$material = $repo->findById($materialId, $supabaseAnonKey);

echo "\n=== Result ===\n";
if ($material === null) {
    echo "Material is NULL\n";
} else {
    echo "Material found!\n";
    echo "Keys in array: " . implode(', ', array_keys($material)) . "\n\n";
    echo "Full material data:\n";
    print_r($material);
    
    echo "\n=== AI Toggle Analysis ===\n";
    echo "ai_toggle_enabled exists: " . (array_key_exists('ai_toggle_enabled', $material) ? 'YES' : 'NO') . "\n";
    echo "ai_toggle_enabled value: ";
    var_dump($material['ai_toggle_enabled'] ?? null);
    echo "Casting to bool: " . ((bool)($material['ai_toggle_enabled'] ?? false) ? 'true' : 'false') . "\n";
    echo "Negated condition !(bool)(...): " . (!(bool)($material['ai_toggle_enabled'] ?? false) ? 'true (WILL BLOCK)' : 'false (WILL ALLOW)') . "\n";
}
