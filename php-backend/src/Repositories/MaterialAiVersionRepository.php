<?php
declare(strict_types=1);

namespace App\Repositories;

use GuzzleHttp\Client;

/**
 * Repository for material_ai_versions table.
 * Handles all CRUD operations for AI-generated content versions with RLS safety.
 */
final class MaterialAiVersionRepository
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
     * Insert a new AI version record.
     * @param array<string,mixed> $data Must include: material_id, type, content, model_name, generated_by, created_by
     * @return string|null The ai_version_id if successful, null otherwise
     */
    public function insert(array $data, string $userToken): ?string
    {
        // Use service role for AI version inserts to bypass RLS restrictions
        $authToken = $this->serviceRoleKey ?? $userToken;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        error_log('[MaterialAiVersionRepo] Inserting AI version: ' . json_encode([
            'material_id' => $data['material_id'] ?? 'MISSING',
            'type' => $data['type'] ?? 'MISSING',
            'using_service_role' => $authToken === $this->serviceRoleKey,
            'has_content' => isset($data['content']),
            'content_length' => isset($data['content']) ? strlen($data['content']) : 0,
        ]));

        $result = $this->send('POST', '/rest/v1/material_ai_versions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => $data,
        ]);

        error_log('[MaterialAiVersionRepo] Insert result: ' . json_encode([
            'status' => $result['status'],
            'has_payload' => isset($result['payload']),
            'payload_type' => gettype($result['payload'] ?? null),
            'is_array' => is_array($result['payload'] ?? null),
            'payload_empty' => empty($result['payload'] ?? []),
        ]));

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            error_log('[MaterialAiVersionRepo] Insert failed: ' . json_encode([
                'status' => $result['status'],
                'payload' => $result['payload'],
            ]));
            return null;
        }

        $record = $result['payload'][0] ?? null;
        $aiVersionId = isset($record['ai_version_id']) ? (string)$record['ai_version_id'] : null;
        
        error_log('[MaterialAiVersionRepo] Insert successful: ai_version_id=' . ($aiVersionId ?? 'NULL'));
        
        return $aiVersionId;
    }

    /**
     * Get the latest AI version for a material by type.
     * @param string $materialId
     * @param string $type One of: summary, keypoints, quiz, flashcards
     * @return array<string,mixed>|null
     */
    public function getLatestByType(string $materialId, string $type, string $userToken): ?array
    {
        $result = $this->send('GET', '/rest/v1/material_ai_versions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'material_id' => 'eq.' . $materialId,
                'type' => 'eq.' . $type,
                'order' => 'created_at.desc',
                'limit' => 1,
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            return null;
        }

        return $result['payload'][0] ?? null;
    }

    /**
     * List all AI versions for a material (optionally filtered by type).
     * @return array<int,array<string,mixed>>
     */
    public function listVersions(string $materialId, string $userToken, ?string $type = null): array
    {
        $query = [
            'select' => 'ai_version_id,material_id,type,model_name,content_preview,confidence,language,created_at,created_by,generated_by',
            'material_id' => 'eq.' . $materialId,
            'order' => 'created_at.desc',
        ];

        if ($type !== null) {
            $query['type'] = 'eq.' . $type;
        }

        $result = $this->send('GET', '/rest/v1/material_ai_versions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => $query,
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            return [];
        }

        return $result['payload'];
    }

    /**
     * Get a specific AI version by ID.
     * @return array<string,mixed>|null
     */
    public function findById(string $aiVersionId, string $userToken): ?array
    {
        $result = $this->send('GET', '/rest/v1/material_ai_versions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'ai_version_id' => 'eq.' . $aiVersionId,
                'limit' => 1,
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            return null;
        }

        return $result['payload'][0] ?? null;
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
