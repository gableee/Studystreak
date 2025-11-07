<?php
declare(strict_types=1);

namespace App\Repositories;

use GuzzleHttp\Client;

/**
 * Repository for learning_materials table.
 * Centralizes all database access for learning materials using RLS-safe service role key.
 */
final class LearningMaterialRepository
{
    private Client $client;
    private string $anonKey;
    private ?string $serviceRoleKey;

    public function __construct(Client $client, string $anonKey, ?string $serviceRoleKey)
    {
        $this->client = $client;
        $this->anonKey = $anonKey;
        $this->serviceRoleKey = $serviceRoleKey;
    }

    /**
     * Find a material by ID.
     * @return array<string,mixed>|null
     */
    public function findById(string $materialId, string $userToken): ?array
    {
        $result = $this->send('GET', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => 'material_id,title,description,content_type,file_url,file_name,mime,size,is_public,user_id,storage_path,tags_jsonb,likes_count,download_count,ai_toggle_enabled,created_at,updated_at,deleted_at,extracted_content',
                'material_id' => 'eq.' . $materialId,
                'deleted_at' => 'is.null',
                'limit' => 1,
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            return null;
        }

        return $result['payload'][0] ?? null;
    }

    /**
     * List materials with filters and pagination.
     * @param array<string,mixed> $query PostgREST query parameters
     * @param string $userToken
     * @return array{status: int, payload: mixed, headers: array<string,array<int,string>>}
     */
    public function list(array $query, string $userToken): array
    {
        return $this->send('GET', '/rest/v1/learning_materials', [
            'headers' => [
                'apikey' => $this->anonKey,
                'Authorization' => 'Bearer ' . $userToken,
                'Accept' => 'application/json',
                'Prefer' => 'count=exact',
            ],
            'query' => $query,
        ]);
    }

    /**
     * Create a new learning material.
     * @param array<string,mixed> $data
     * @return array{status: int, payload: mixed, headers: array<string,array<int,string>>}
     */
    public function create(array $data, string $userToken): array
    {
        return $this->send('POST', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => $data,
        ]);
    }

    /**
     * Update a learning material by ID.
     * @param array<string,mixed> $data
     * @return array{status: int, payload: mixed, headers: array<string,array<int,string>>}
     */
    public function update(string $materialId, array $data, string $userToken): array
    {
        return $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $materialId],
            'json' => $data,
        ]);
    }

    /**
     * Soft-delete a material (set deleted_at, clear storage_path).
     */
    public function softDelete(string $materialId, string $userToken): array
    {
        return $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=minimal',
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $materialId],
            'json' => [
                'deleted_at' => gmdate('c'),
                'storage_path' => null,
            ],
        ]);
    }

    /**
     * Increment download count (uses service role for anonymous/public downloads).
     */
    public function incrementDownloadCount(string $materialId, int $currentCount): void
    {
        $authToken = $this->serviceRoleKey ?? $this->anonKey;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Prefer' => 'return=minimal',
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $materialId],
            'json' => ['download_count' => $currentCount + 1],
        ]);
    }

    /**
     * Update storage_path (privileged operation using service role).
     */
    public function updateStoragePath(string $materialId, ?string $storagePath): void
    {
        if ($this->serviceRoleKey === null) {
            return;
        }

        $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                'apikey' => $this->serviceRoleKey,
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $materialId],
            'json' => ['storage_path' => $storagePath],
        ]);
    }

    /**
     * @param array<string,mixed> $options
     * @return array{status: int, payload: mixed, headers: array<string,array<int,string>>}
     */
    private function send(string $method, string $path, array $options): array
    {
        $options['http_errors'] = false;
        $options['timeout'] = $options['timeout'] ?? 15;

        try {
            $response = $this->client->request($method, $path, $options);
            $status = $response->getStatusCode();
            $body = (string)$response->getBody();
            $decoded = json_decode($body, true);
            $payload = is_array($decoded) ? $decoded : ($body === '' ? null : $body);
            return [
                'status' => $status,
                'payload' => $payload,
                'headers' => $response->getHeaders(),
            ];
        } catch (\GuzzleHttp\Exception\GuzzleException $e) {
            return [
                'status' => 500,
                'payload' => ['error' => $e->getMessage()],
                'headers' => [],
            ];
        }
    }
}
