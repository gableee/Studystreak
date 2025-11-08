#!/usr/bin/env php
<?php
/**
 * AI Job Worker - Process queued AI generation jobs
 * 
 * Usage: php scripts/ai_job_worker.php
 * Run continuously: while true; do php scripts/ai_job_worker.php; sleep 5; done
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\SupabaseConfig;
use App\Config\AiConfig;
use App\Repositories\AiJobsRepository;
use App\Repositories\LearningMaterialRepository;
use App\Services\AiService;
use GuzzleHttp\Client;

// Load environment
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        putenv($line);
    }
}

// Initialize configs
$supabaseConfig = new SupabaseConfig();
$aiConfig = new AiConfig();

// Initialize repositories
$client = new Client(['base_uri' => $supabaseConfig->getUrl()]);
$aiJobsRepo = new AiJobsRepository(
    $client,
    $supabaseConfig->getAnonKey(),
    $supabaseConfig->getServiceRoleKey()
);
$materialRepo = new LearningMaterialRepository(
    $client,
    $supabaseConfig->getAnonKey(),
    $supabaseConfig->getServiceRoleKey()
);
$aiService = new AiService($aiConfig);

echo "[Worker] Starting AI job worker...\n";

// Fetch pending jobs
$jobs = $aiJobsRepo->getPendingJobs(5);

if (empty($jobs)) {
    echo "[Worker] No pending jobs. Exiting.\n";
    exit(0);
}

echo "[Worker] Found " . count($jobs) . " pending job(s)\n";

foreach ($jobs as $job) {
    $jobId = (string)$job['job_id'];
    $materialId = (string)$job['material_id'];
    $jobType = (string)$job['job_type'];
    
    echo "[Worker] Processing job $jobId (type: $jobType, material: $materialId)\n";
    
    // Mark as processing
    $aiJobsRepo->update($jobId, [
        'status' => 'processing',
        'started_at' => date('c'),
        'attempts' => ((int)($job['attempts'] ?? 0)) + 1,
    ]);
    
    try {
        // Fetch material with service role key
        $serviceRoleKey = $supabaseConfig->getServiceRoleKey();
        if ($serviceRoleKey === null) {
            throw new \RuntimeException('Service role key not configured');
        }
        
        $material = $materialRepo->findById($materialId, $serviceRoleKey);
        if ($material === null) {
            throw new \RuntimeException('Material not found');
        }
        
        // Get storage path or file URL
        $storagePath = $material['storage_path'] ?? null;
        $fileUrl = $material['file_url'] ?? null;
        
        if ($storagePath === null && $fileUrl === null) {
            throw new \RuntimeException('Material has no storage_path or file_url');
        }
        
        // Build signed URL for the material
        $bucket = $supabaseConfig->getStorageBucket();
        $materialUrl = null;
        
        if ($storagePath !== null) {
            // Generate signed URL from Supabase storage (valid for 1 hour)
            $signedUrlResponse = $client->post(
                "/storage/v1/object/sign/$bucket/" . ltrim($storagePath, '/'),
                [
                    'headers' => [
                        'apikey' => $supabaseConfig->getAnonKey(),
                        'Authorization' => "Bearer $serviceRoleKey",
                        'Content-Type' => 'application/json',
                    ],
                    'json' => ['expiresIn' => 3600],
                ]
            );
            
            if ($signedUrlResponse->getStatusCode() === 200) {
                $signedData = json_decode((string)$signedUrlResponse->getBody(), true);
                if (isset($signedData['signedURL'])) {
                    $materialUrl = $supabaseConfig->getUrl() . $signedData['signedURL'];
                }
            }
        }
        
        // Fallback to file_url if signed URL generation failed
        if ($materialUrl === null && $fileUrl !== null) {
            $materialUrl = $fileUrl;
        }
        
        if ($materialUrl === null) {
            throw new \RuntimeException('Could not generate material URL');
        }
        
        echo "[Worker] Material URL: $materialUrl\n";
        
        // Call AI service based on job type
        $result = null;
        switch ($jobType) {
            case 'reviewer':
                $aiResponse = $aiService->generateReviewer($materialUrl);
                if ($aiResponse['success']) {
                    $result = $aiResponse['data'];
                } else {
                    throw new \RuntimeException($aiResponse['error'] ?? 'AI service error');
                }
                break;
            
            default:
                throw new \RuntimeException("Unsupported job type: $jobType");
        }
        
        // Mark as completed
        $aiJobsRepo->update($jobId, [
            'status' => 'completed',
            'result' => $result,
            'completed_at' => date('c'),
        ]);
        
        echo "[Worker] Job $jobId completed successfully\n";
        
    } catch (\Exception $e) {
        $errorMessage = $e->getMessage();
        echo "[Worker] Job $jobId failed: $errorMessage\n";
        
        $attempts = (int)($job['attempts'] ?? 0) + 1;
        $maxAttempts = (int)($job['max_attempts'] ?? 3);
        
        if ($attempts >= $maxAttempts) {
            // Mark as failed after max attempts
            $aiJobsRepo->update($jobId, [
                'status' => 'failed',
                'error_message' => $errorMessage,
                'completed_at' => date('c'),
            ]);
            echo "[Worker] Job $jobId marked as failed after $attempts attempts\n";
        } else {
            // Reset to pending for retry
            $aiJobsRepo->update($jobId, [
                'status' => 'pending',
                'error_message' => $errorMessage,
            ]);
            echo "[Worker] Job $jobId will be retried (attempt $attempts/$maxAttempts)\n";
        }
    }
}

echo "[Worker] Finished processing batch\n";
exit(0);
