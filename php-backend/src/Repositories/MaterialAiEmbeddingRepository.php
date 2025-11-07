<?php
declare(strict_types=1);

namespace App\Repositories;

use GuzzleHttp\Client;

/**
 * Repository for material_ai_embeddings table.
 * Handles vector storage and retrieval for semantic search.
 */
final class MaterialAiEmbeddingRepository
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
     * Insert a single embedding vector.
     * @param string $aiVersionId The AI version this embedding belongs to
     * @param array<float> $vector 384-dimensional embedding vector
     * @return string|null The embedding_id if successful
     */
    public function insert(string $aiVersionId, array $vector, string $userToken): ?string
    {
        // Use service role for embedding inserts (RLS bypass)
        $authToken = $this->serviceRoleKey ?? $userToken;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        // Format vector as pgvector string: [0.1,0.2,0.3,...]
        $vectorString = '[' . implode(',', array_map('strval', $vector)) . ']';

        $result = $this->send('POST', '/rest/v1/material_ai_embeddings', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'ai_version_id' => $aiVersionId,
                'vector' => $vectorString,
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            error_log('[MaterialAiEmbeddingRepository] Insert failed: ' . json_encode([
                'status' => $result['status'],
                'payload' => $result['payload'],
            ]));
            return null;
        }

        $record = $result['payload'][0] ?? null;
        return isset($record['embedding_id']) ? (string)$record['embedding_id'] : null;
    }

    /**
     * Bulk insert embeddings (for batch processing).
     * @param array<array{ai_version_id: string, vector: array<float>}> $embeddings
     * @return int Number of successfully inserted embeddings
     */
    public function bulkInsert(array $embeddings, string $userToken): int
    {
        if (empty($embeddings)) {
            return 0;
        }

        // Use service role for batch inserts
        $authToken = $this->serviceRoleKey ?? $userToken;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        // Format each embedding
        $rows = array_map(function (array $item): array {
            $vectorString = '[' . implode(',', array_map('strval', $item['vector'])) . ']';
            return [
                'ai_version_id' => $item['ai_version_id'],
                'vector' => $vectorString,
            ];
        }, $embeddings);

        $result = $this->send('POST', '/rest/v1/material_ai_embeddings', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => $rows,
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            error_log('[MaterialAiEmbeddingRepository] Bulk insert failed: ' . json_encode([
                'status' => $result['status'],
                'payload' => $result['payload'],
                'count' => count($rows),
            ]));
            return 0;
        }

        return count($result['payload']);
    }

    /**
     * Find embedding by ai_version_id.
     * @return array<string,mixed>|null
     */
    public function findByAiVersionId(string $aiVersionId, string $userToken): ?array
    {
        $result = $this->send('GET', '/rest/v1/material_ai_embeddings', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => 'embedding_id,ai_version_id,created_at',
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
     * Semantic search using vector similarity.
     * @param array<float> $queryVector 384-dimensional query vector
     * @param int $limit Number of results to return
     * @return array<int,array<string,mixed>> Array of matching AI versions with similarity scores
     */
    public function searchSimilar(array $queryVector, string $userToken, int $limit = 10): array
    {
        // TODO: Implement after ANN index is created
        // Will use pgvector's <=> operator for cosine distance
        // Example RPC call: rpc/search_embeddings?query_vector=[...]&match_count=10
        return [];
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
