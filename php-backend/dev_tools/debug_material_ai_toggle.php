<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$supabaseUrl = $_ENV['SUPABASE_URL'] ?? '';
$supabaseAnonKey = $_ENV['SUPABASE_ANON_KEY'] ?? '';
$materialId = '26ade762-f36e-407f-8c65-4b1af89c0e25';

echo "=== Debugging AI Toggle for Material ===\n";
echo "Material ID: $materialId\n\n";

// Fetch the material directly from Supabase
$url = $supabaseUrl . '/rest/v1/learning_materials?material_id=eq.' . $materialId . '&select=material_id,title,ai_toggle_enabled&deleted_at=is.null';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseAnonKey,
    'Authorization: Bearer ' . $supabaseAnonKey,
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status: $httpCode\n";
echo "Response:\n";
$data = json_decode($response, true);
print_r($data);

if (!empty($data) && isset($data[0])) {
    $material = $data[0];
    echo "\n=== Analysis ===\n";
    echo "Material Title: " . ($material['title'] ?? 'N/A') . "\n";
    echo "ai_toggle_enabled field exists: " . (array_key_exists('ai_toggle_enabled', $material) ? 'YES' : 'NO') . "\n";
    echo "ai_toggle_enabled value: ";
    var_dump($material['ai_toggle_enabled'] ?? null);
    echo "ai_toggle_enabled (bool): " . (bool)($material['ai_toggle_enabled'] ?? false) ? 'true' : 'false';
    echo "\n";
    echo "Condition !(bool)(...) result: " . (!(bool)($material['ai_toggle_enabled'] ?? false) ? 'true (BLOCKED)' : 'false (ALLOWED)') . "\n";
}
