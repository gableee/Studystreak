<?php
/**
 * cleanup_missing_storage_paths.php
 *
 * CLI helper to find `learning_materials` rows that reference storage objects
 * that do not exist in the storage bucket, and optionally clear the
 * `storage_path` field using the service role key.
 *
 * Usage:
 *   php cleanup_missing_storage_paths.php        # dry-run, list orphans
 *   php cleanup_missing_storage_paths.php --apply  # clear orphaned storage_path values
 */

require __DIR__ . '/../../vendor/autoload.php';

use App\Config\SupabaseConfig;
use GuzzleHttp\Client;

$apply = in_array('--apply', $argv, true);

// Load environment via Dotenv if present
if (file_exists(__DIR__ . '/../../.env')) {
    (Dotenv\Dotenv::createImmutable(dirname(__DIR__)))->safeLoad();
}

$config = new SupabaseConfig();
$serviceKey = $config->getServiceRoleKey();
if ($serviceKey === null) {
    fwrite(STDERR, "SUPABASE_SERVICE_ROLE_KEY is not configured. This script requires the service role key to PATCH records.\n");
}

$client = new Client(['base_uri' => rtrim($config->getUrl(), '/')]);
$headers = [
    'Authorization' => 'Bearer ' . ($serviceKey ?? $config->getAnonKey()),
    'apikey' => $serviceKey ?? $config->getAnonKey(),
    'Accept' => 'application/json',
];

// Fetch rows with non-null storage_path
try {
    $resp = $client->request('GET', '/rest/v1/learning_materials', [
        'headers' => $headers,
        'query' => [
            'storage_path' => 'not.is.null',
            'select' => 'material_id,storage_path,file_name',
            'limit' => 1000,
        ],
        'http_errors' => false,
    ]);
} catch (Exception $e) {
    fwrite(STDERR, "Failed to query learning_materials: " . $e->getMessage() . "\n");
    exit(2);
}

$body = (string)$resp->getBody();
$data = json_decode($body, true);
if (!is_array($data)) {
    fwrite(STDERR, "Unexpected response when fetching learning_materials: " . substr($body, 0, 800) . "\n");
    exit(2);
}

$orphans = [];
foreach ($data as $row) {
    if (!isset($row['storage_path']) || $row['storage_path'] === null) continue;
    $path = (string)$row['storage_path'];

    // Try to sign the object; POST /storage/v1/object/sign/<bucket>/<path>
    $signPath = '/storage/v1/object/sign/' . rawurlencode($config->getStorageBucket()) . '/' . implode('/', array_map('rawurlencode', explode('/', $path)));
    try {
        $signResp = $client->request('POST', $signPath, [
            'headers' => $headers + ['Content-Type' => 'application/json'],
            'json' => ['expiresIn' => 60],
            'http_errors' => false,
            'timeout' => 10,
        ]);
    } catch (Exception $e) {
        fwrite(STDERR, "Failed signing request for path {$path}: " . $e->getMessage() . "\n");
        continue;
    }

    $status = $signResp->getStatusCode();
    if ($status === 200) {
        // exists
        continue;
    }

    $payload = (string)$signResp->getBody();
    $orphans[] = [
        'material_id' => $row['material_id'] ?? null,
        'storage_path' => $path,
        'file_name' => $row['file_name'] ?? null,
        'status' => $status,
        'payload' => $payload,
    ];
}

if ($orphans === []) {
    echo "No orphaned storage_path entries found.\n";
    exit(0);
}

echo "Found " . count($orphans) . " orphaned storage_path entries:\n";
foreach ($orphans as $o) {
    echo sprintf("- %s -> %s (HTTP %d)\n", $o['material_id'], $o['storage_path'], $o['status']);
}

if ($apply) {
    if ($serviceKey === null) {
        fwrite(STDERR, "Cannot apply changes because SUPABASE_SERVICE_ROLE_KEY is not set.\n");
        exit(2);
    }

    echo "Applying: clearing storage_path for orphans...\n";
    foreach ($orphans as $o) {
        $id = $o['material_id'];
        if (!$id) continue;
        try {
            $patchResp = $client->request('PATCH', '/rest/v1/learning_materials', [
                'headers' => $headers + ['Content-Type' => 'application/json', 'Prefer' => 'return=minimal'],
                'query' => ['material_id' => 'eq.' . $id],
                'json' => ['storage_path' => null],
                'http_errors' => false,
            ]);
            $ps = $patchResp->getStatusCode();
            if ($ps >= 200 && $ps < 300) {
                echo "Cleared storage_path for {$id}\n";
            } else {
                echo "Failed to clear {$id}: HTTP {$ps} - " . (string)$patchResp->getBody() . "\n";
            }
        } catch (Exception $e) {
            echo "Exception clearing {$id}: " . $e->getMessage() . "\n";
        }
    }
}

echo "Done.\n";
