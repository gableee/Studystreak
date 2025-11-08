<?php
declare(strict_types=1);

namespace App\Repositories;

use GuzzleHttp\Client;

/**
 * Repository for ai_jobs table - manages async AI generation jobs
 */
final class AiJobsRepository
{
    private Client $client;
    private string $anonKey;
    private ?string $serviceRoleKey;

    public function __construct(Client $client, string $anonKey, ?string $serviceRoleKey = null)
    {
        $this->client = $client;
        $this->anonKey = $anonKey;
        $this->serviceRoleKey = $serviceRoleKey;
    }

    /**
     * Create a new job
     * @param array{material_id: string, user_id: string, job_type: string, priority?: int, metadata?: array} $data
     * @return string|null Job ID on success
     */
    public function create(array $data, string $token): ?string
    {
        $payload = [
            'material_id' => $data['material_id'],
            'user_id' => $data['user_id'],
            'job_type' => $data['job_type'],
            'status' => 'pending',
            'priority' => $data['priority'] ?? 0,
            'attempts' => 0,
            'max_attempts' => 3,
        ];

        if (isset($data['metadata'])) {
            $payload['metadata'] = json_encode($data['metadata']);
        }

        try {
            $response = $this->client->post('/rest/v1/ai_jobs', [
                'headers' => [
                    'apikey' => $this->anonKey,
                    'Authorization' => "Bearer $token",
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=representation',
                ],
                'json' => $payload,
            ]);

            if ($response->getStatusCode() === 201) {
                $result = json_decode((string)$response->getBody(), true);
                return is_array($result) && isset($result[0]['job_id']) ? (string)$result[0]['job_id'] : null;
            }
        } catch (\Exception $e) {
            error_log('[AiJobsRepository] Create failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Get job by ID
     * @return array<string, mixed>|null
     */
    public function findById(string $jobId, string $token): ?array
    {
        try {
            $response = $this->client->get("/rest/v1/ai_jobs?job_id=eq.$jobId&select=*", [
                'headers' => [
                    'apikey' => $this->anonKey,
                    'Authorization' => "Bearer $token",
                ],
            ]);

            if ($response->getStatusCode() === 200) {
                $result = json_decode((string)$response->getBody(), true);
                return is_array($result) && !empty($result) ? $result[0] : null;
            }
        } catch (\Exception $e) {
            error_log('[AiJobsRepository] FindById failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Get pending jobs (for worker processing)
     * @return array<array<string, mixed>>
     */
    public function getPendingJobs(int $limit = 10): array
    {
        if ($this->serviceRoleKey === null) {
            return [];
        }

        try {
            $response = $this->client->get(
                "/rest/v1/ai_jobs?status=eq.pending&order=priority.desc,created_at.asc&limit=$limit",
                [
                    'headers' => [
                        'apikey' => $this->anonKey,
                        'Authorization' => "Bearer {$this->serviceRoleKey}",
                    ],
                ]
            );

            if ($response->getStatusCode() === 200) {
                $result = json_decode((string)$response->getBody(), true);
                return is_array($result) ? $result : [];
            }
        } catch (\Exception $e) {
            error_log('[AiJobsRepository] GetPendingJobs failed: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * Update job status
     * @param array{status?: string, attempts?: int, error_message?: string, result?: array, started_at?: string, completed_at?: string} $updates
     */
    public function update(string $jobId, array $updates): bool
    {
        if ($this->serviceRoleKey === null) {
            return false;
        }

        $payload = [];
        
        if (isset($updates['status'])) {
            $payload['status'] = $updates['status'];
        }
        if (isset($updates['attempts'])) {
            $payload['attempts'] = $updates['attempts'];
        }
        if (isset($updates['error_message'])) {
            $payload['error_message'] = $updates['error_message'];
        }
        if (isset($updates['result'])) {
            $payload['result'] = json_encode($updates['result']);
        }
        if (isset($updates['started_at'])) {
            $payload['started_at'] = $updates['started_at'];
        }
        if (isset($updates['completed_at'])) {
            $payload['completed_at'] = $updates['completed_at'];
        }

        try {
            $response = $this->client->patch("/rest/v1/ai_jobs?job_id=eq.$jobId", [
                'headers' => [
                    'apikey' => $this->anonKey,
                    'Authorization' => "Bearer {$this->serviceRoleKey}",
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
            ]);

            return $response->getStatusCode() === 204 || $response->getStatusCode() === 200;
        } catch (\Exception $e) {
            error_log('[AiJobsRepository] Update failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get latest job for a material by type
     * @return array<string, mixed>|null
     */
    public function getLatestByMaterialAndType(string $materialId, string $jobType, string $token): ?array
    {
        try {
            $response = $this->client->get(
                "/rest/v1/ai_jobs?material_id=eq.$materialId&job_type=eq.$jobType&order=created_at.desc&limit=1",
                [
                    'headers' => [
                        'apikey' => $this->anonKey,
                        'Authorization' => "Bearer $token",
                    ],
                ]
            );

            if ($response->getStatusCode() === 200) {
                $result = json_decode((string)$response->getBody(), true);
                return is_array($result) && !empty($result) ? $result[0] : null;
            }
        } catch (\Exception $e) {
            error_log('[AiJobsRepository] GetLatestByMaterialAndType failed: ' . $e->getMessage());
        }

        return null;
    }
}
