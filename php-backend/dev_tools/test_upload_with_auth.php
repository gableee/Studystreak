<?php
/**
 * Test script to simulate frontend upload with authenticated user token
 */

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$supabaseUrl = $_ENV['SUPABASE_URL'];
$anonKey = $_ENV['SUPABASE_ANON_KEY'];

// This is a sample JWT token from the user's request headers
// Replace with actual token from browser if needed
$userToken = $_ENV['SUPABASE_SERVICE_ROLE_KEY'];

echo "=== TESTING UPLOAD WITH USER TOKEN ===\n\n";

// Create a test file
$testContent = "Test upload content - " . date('Y-m-d H:i:s');
$tmpFile = tempnam(sys_get_temp_dir(), 'test_upload_');
file_put_contents($tmpFile, $testContent);

echo "1. Created test file: $tmpFile\n";
echo "   Size: " . filesize($tmpFile) . " bytes\n\n";

// Prepare multipart form data
$boundary = '----WebKitFormBoundary' . bin2hex(random_bytes(16));
$formData = '';

// Add title
$formData .= "--$boundary\r\n";
$formData .= "Content-Disposition: form-data; name=\"title\"\r\n\r\n";
$formData .= "Test Upload Material\r\n";

// Add description
$formData .= "--$boundary\r\n";
$formData .= "Content-Disposition: form-data; name=\"description\"\r\n\r\n";
$formData .= "Testing upload functionality\r\n";

// Add is_public
$formData .= "--$boundary\r\n";
$formData .= "Content-Disposition: form-data; name=\"is_public\"\r\n\r\n";
$formData .= "false\r\n";

// Add ai_toggle_enabled
$formData .= "--$boundary\r\n";
$formData .= "Content-Disposition: form-data; name=\"ai_toggle_enabled\"\r\n\r\n";
$formData .= "false\r\n";

// Add file
$formData .= "--$boundary\r\n";
$formData .= "Content-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\n";
$formData .= "Content-Type: text/plain\r\n\r\n";
$formData .= file_get_contents($tmpFile) . "\r\n";
$formData .= "--$boundary--\r\n";

echo "2. Prepared multipart form data\n\n";

// Send request to local API
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:8181/api/learning-materials');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $formData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $userToken",
    "Content-Type: multipart/form-data; boundary=$boundary",
]);

echo "3. Sending POST request to http://localhost:8181/api/learning-materials\n";
echo "   With Authorization header (user token)\n\n";

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "4. Response:\n";
echo "   HTTP Status: $httpCode\n";
echo "   Body: " . print_r(json_decode($response, true), true) . "\n\n";

// Cleanup
unlink($tmpFile);

echo "5. Check PHP error log above for [UPLOAD DEBUG] messages\n";
