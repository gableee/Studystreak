<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

use App\Http\Request;
use App\Controllers\StudyToolsController;
use App\Config\SupabaseConfig;
use App\Config\AiConfig;

$supabaseUrl = $_ENV['SUPABASE_URL'] ?? '';
$supabaseAnonKey = $_ENV['SUPABASE_ANON_KEY'] ?? '';
$materialId = '26ade762-f36e-407f-8c65-4b1af89c0e25';

echo "=== Testing StudyToolsController::getSummary() ===\n\n";

// You need a valid user token to test this
// This is just to show what we'd need to test
// For now, let's just trace through the logic manually

echo "The API call flow:\n";
echo "1. Frontend calls: GET /api/materials/$materialId/study-tools/summary\n";
echo "2. index.php routes to: StudyToolsController->getSummary(\$request, \$materialId)\n";
echo "3. getSummary() calls: getOrGenerateContent(\$request, \$materialId, 'summary')\n";
echo "4. getOrGenerateContent() at line 280:\n";
echo "   - Fetches material using: \$this->materialRepo->findById(\$materialId, \$token)\n";
echo "   - Checks ownership\n";
echo "   - Line 305: Checks if (!(bool)(\$material['ai_toggle_enabled'] ?? false))\n";
echo "   - If false (meaning ai_toggle_enabled is truthy), proceeds\n";
echo "   - If true (meaning ai_toggle_enabled is falsy), returns 400 error\n\n";

echo "Based on our tests:\n";
echo "- Database has: ai_toggle_enabled = true (or 1)\n";
echo "- Repository returns: ['ai_toggle_enabled' => 1]\n";
echo "- Condition: !(bool)(1) = !(true) = false\n";
echo "- Result: Should ALLOW and proceed\n\n";

echo "So the check should pass. Let me check if there's a different issue...\n\n";

// Check if there might be an RLS policy issue
echo "Possible issues:\n";
echo "1. Token mismatch - frontend sending different token\n";
echo "2. RLS policy blocking the material fetch\n";
echo "3. Material not found due to deleted_at filter\n";
echo "4. Caching issue on frontend/backend\n";
echo "5. Different material being requested\n\n";

// Let's verify the material exists and is accessible
$url = $supabaseUrl . '/rest/v1/learning_materials?material_id=eq.' . $materialId . '&select=material_id,title,ai_toggle_enabled,user_id,deleted_at';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseAnonKey,
    'Authorization: Bearer ' . $supabaseAnonKey,
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

echo "Material check using anon key:\n";
if (empty($data)) {
    echo "⚠️  Material NOT FOUND with anon key! This might be an RLS issue.\n";
} else {
    $material = $data[0];
    echo "✓ Material found\n";
    echo "  Title: " . $material['title'] . "\n";
    echo "  User ID: " . $material['user_id'] . "\n";
    echo "  ai_toggle_enabled: " . ($material['ai_toggle_enabled'] ? 'true' : 'false') . "\n";
    echo "  deleted_at: " . ($material['deleted_at'] ?? 'null') . "\n";
    
    if ($material['ai_toggle_enabled']) {
        echo "\n✓ AI is enabled on this material\n";
    } else {
        echo "\n✗ AI is NOT enabled on this material\n";
    }
}
