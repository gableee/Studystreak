<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$supabaseUrl = $_ENV['SUPABASE_URL'] ?? '';
$supabaseAnonKey = $_ENV['SUPABASE_ANON_KEY'] ?? '';
$materialId = '26ade762-f36e-407f-8c65-4b1af89c0e25';

echo "=== Raw HTTP Response from Supabase ===\n\n";

$url = $supabaseUrl . '/rest/v1/learning_materials?material_id=eq.' . $materialId . '&select=material_id,title,ai_toggle_enabled&deleted_at=is.null';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseAnonKey,
    'Authorization: Bearer ' . $supabaseAnonKey,
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

echo "Raw body:\n";
echo $body;
echo "\n\n";

$decoded = json_decode($body, true);
echo "Decoded JSON:\n";
print_r($decoded);

if (!empty($decoded)) {
    $material = $decoded[0];
    echo "\n=== Type Analysis ===\n";
    echo "ai_toggle_enabled raw value: ";
    var_dump($material['ai_toggle_enabled']);
    echo "Type: " . gettype($material['ai_toggle_enabled']) . "\n";
    
    if (is_int($material['ai_toggle_enabled'])) {
        echo "It's an integer: " . $material['ai_toggle_enabled'] . "\n";
    } elseif (is_bool($material['ai_toggle_enabled'])) {
        echo "It's a boolean: " . ($material['ai_toggle_enabled'] ? 'true' : 'false') . "\n";
    } elseif (is_string($material['ai_toggle_enabled'])) {
        echo "It's a string: '" . $material['ai_toggle_enabled'] . "'\n";
        echo "String length: " . strlen($material['ai_toggle_enabled']) . "\n";
    }
    
    echo "\nBoolean conversion test:\n";
    echo "(bool)\$value = " . ((bool)$material['ai_toggle_enabled'] ? 'true' : 'false') . "\n";
    echo "!(bool)\$value = " . (!(bool)$material['ai_toggle_enabled'] ? 'true (BLOCK)' : 'false (ALLOW)') . "\n";
}
