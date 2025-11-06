<?php
// Test different ways ai_toggle_enabled might be returned from database

echo "=== Testing PHP Type Casting for ai_toggle_enabled ===\n\n";

$testCases = [
    'Integer 1' => 1,
    'Integer 0' => 0,
    'Boolean true' => true,
    'Boolean false' => false,
    'String "1"' => "1",
    'String "0"' => "0",
    'String "true"' => "true",
    'String "false"' => "false",
    'String "t"' => "t",
    'String "f"' => "f",
    'NULL' => null,
];

foreach ($testCases as $label => $value) {
    echo "Testing: $label\n";
    echo "  Value: ";
    var_dump($value);
    echo "  (bool)\$value: " . ((bool)$value ? 'true' : 'false') . "\n";
    echo "  !(bool)\$value: " . (!(bool)$value ? 'true (BLOCKED)' : 'false (ALLOWED)') . "\n";
    echo "  Condition passes AI check: " . (!(bool)$value ? 'NO' : 'YES') . "\n";
    echo "\n";
}

// Test with array like from repository
echo "=== Testing with Array (like from repository) ===\n";
$material1 = ['ai_toggle_enabled' => 1];
$material2 = ['ai_toggle_enabled' => true];
$material3 = ['ai_toggle_enabled' => '1'];
$material4 = ['ai_toggle_enabled' => 't'];
$material5 = ['ai_toggle_enabled' => 0];
$material6 = [];

$materials = [
    'Array with int 1' => $material1,
    'Array with bool true' => $material2,
    'Array with string "1"' => $material3,
    'Array with string "t"' => $material4,
    'Array with int 0' => $material5,
    'Array without key' => $material6,
];

foreach ($materials as $label => $material) {
    echo "Testing: $label\n";
    echo "  Value: ";
    var_dump($material['ai_toggle_enabled'] ?? null);
    $result = !(bool)($material['ai_toggle_enabled'] ?? false);
    echo "  !(bool)(...): " . ($result ? 'true (BLOCKED)' : 'false (ALLOWED)') . "\n";
    echo "\n";
}
