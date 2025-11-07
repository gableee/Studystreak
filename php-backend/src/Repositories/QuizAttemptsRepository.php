<?php
declare(strict_types=1);

namespace App\Repositories;

use GuzzleHttp\Client;

/**
 * Repository for quiz_attempts and quiz_attempt_responses tables.
 * Handles all CRUD operations for quiz attempt tracking with RLS safety.
 */
final class QuizAttemptsRepository
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
     * Create a new quiz attempt record.
     * @param array<string,mixed> $attemptData Must include: quiz_id, user_id, score, total_questions, correct_answers, time_spent
     * @return string|null The attempt_id if successful, null otherwise
     */
    public function create(array $attemptData, string $userToken): ?string
    {
        // Use service role for inserts to bypass RLS restrictions if available
        $authToken = $this->serviceRoleKey ?? $userToken;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        error_log('[QuizAttemptsRepo] Creating quiz attempt: ' . json_encode([
            'quiz_id' => $attemptData['quiz_id'] ?? 'MISSING',
            'user_id' => $attemptData['user_id'] ?? 'MISSING',
            'score' => $attemptData['score'] ?? 'MISSING',
            'total_questions' => $attemptData['total_questions'] ?? 'MISSING',
            'using_service_role' => $authToken === $this->serviceRoleKey,
        ]));

        $result = $this->send('POST', '/rest/v1/quiz_attempts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => $attemptData,
        ]);

        error_log('[QuizAttemptsRepo] Create result: ' . json_encode([
            'status' => $result['status'],
            'has_payload' => isset($result['payload']),
            'payload_type' => gettype($result['payload'] ?? null),
        ]));

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            error_log('[QuizAttemptsRepo] Create failed: ' . json_encode([
                'status' => $result['status'],
                'payload' => $result['payload'],
            ]));
            return null;
        }

        $record = $result['payload'][0] ?? null;
        $attemptId = isset($record['attempt_id']) ? (string)$record['attempt_id'] : null;
        
        error_log('[QuizAttemptsRepo] Create successful: attempt_id=' . ($attemptId ?? 'NULL'));
        
        return $attemptId;
    }

    /**
     * Get a single quiz attempt by ID with all responses.
     * @param string $attemptId
     * @param string $userToken
     * @return array<string,mixed>|null
     */
    public function findById(string $attemptId, string $userToken): ?array
    {
        // Get the attempt record
        $attemptResult = $this->send('GET', '/rest/v1/quiz_attempts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'attempt_id' => 'eq.' . $attemptId,
                'limit' => 1,
            ],
        ]);

        if ($attemptResult['status'] >= 400 || !is_array($attemptResult['payload']) || empty($attemptResult['payload'])) {
            return null;
        }

        $attempt = $attemptResult['payload'][0] ?? null;
        if ($attempt === null) {
            return null;
        }

        // Get all responses for this attempt
        $responsesResult = $this->send('GET', '/rest/v1/quiz_attempt_responses', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'attempt_id' => 'eq.' . $attemptId,
                'order' => 'created_at.asc',
            ],
        ]);

        $responses = [];
        if ($responsesResult['status'] < 400 && is_array($responsesResult['payload'])) {
            $responses = $responsesResult['payload'];
        }

        $attempt['responses'] = $responses;
        return $attempt;
    }

    /**
     * Get all quiz attempts for a specific quiz by a user.
     * @param string $quizId
     * @param string $userId
     * @param string $userToken
     * @return array<int,array<string,mixed>>
     */
    public function findByQuizId(string $quizId, string $userId, string $userToken): array
    {
        $result = $this->send('GET', '/rest/v1/quiz_attempts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'quiz_id' => 'eq.' . $quizId,
                'user_id' => 'eq.' . $userId,
                'order' => 'completed_at.desc',
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            return [];
        }

        return $result['payload'];
    }

    /**
     * Get all quiz attempts for all quizzes belonging to a material by a user.
     * This requires joining quiz_attempts with quizzes table.
     * @param string $materialId
     * @param string $userId
     * @param string $userToken
     * @return array<int,array<string,mixed>>
     */
    public function findByMaterialId(string $materialId, string $userId, string $userToken): array
    {
        // First, get all quizzes for this material
        $quizzesResult = $this->send('GET', '/rest/v1/quizzes', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => 'quiz_id',
                'material_id' => 'eq.' . $materialId,
            ],
        ]);

        if ($quizzesResult['status'] >= 400 || !is_array($quizzesResult['payload']) || empty($quizzesResult['payload'])) {
            return [];
        }

        $quizIds = array_map(fn($q) => (string)($q['quiz_id'] ?? ''), $quizzesResult['payload']);
        $quizIds = array_filter($quizIds);

        if (empty($quizIds)) {
            return [];
        }

        // Get all attempts for these quizzes by this user
        // PostgREST uses 'in' operator for array matching
        $quizIdsParam = '(' . implode(',', $quizIds) . ')';
        
        $result = $this->send('GET', '/rest/v1/quiz_attempts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'quiz_id' => 'in.' . $quizIdsParam,
                'user_id' => 'eq.' . $userId,
                'order' => 'completed_at.desc',
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            return [];
        }

        return $result['payload'];
    }

    /**
     * Create a quiz attempt response (question answer).
     * @param array<string,mixed> $responseData Must include: attempt_id, question_id, answer, is_correct, response_time_ms
     * @return string|null The response id if successful, null otherwise
     */
    public function createResponse(array $responseData, string $userToken): ?string
    {
        // Use service role for inserts to bypass RLS restrictions if available
        $authToken = $this->serviceRoleKey ?? $userToken;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        error_log('[QuizAttemptsRepo] Creating response: ' . json_encode([
            'attempt_id' => $responseData['attempt_id'] ?? 'MISSING',
            'question_id' => $responseData['question_id'] ?? 'MISSING',
            'is_correct' => $responseData['is_correct'] ?? 'MISSING',
            'using_service_role' => $authToken === $this->serviceRoleKey,
        ]));

        $result = $this->send('POST', '/rest/v1/quiz_attempt_responses', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => $responseData,
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload']) || empty($result['payload'])) {
            error_log('[QuizAttemptsRepo] Create response failed: ' . json_encode([
                'status' => $result['status'],
                'payload' => $result['payload'],
            ]));
            return null;
        }

        $record = $result['payload'][0] ?? null;
        $responseId = isset($record['id']) ? (string)$record['id'] : null;
        
        error_log('[QuizAttemptsRepo] Response created successfully: id=' . ($responseId ?? 'NULL'));
        
        return $responseId;
    }

    /**
     * Get all responses for a quiz attempt.
     * @param string $attemptId
     * @param string $userToken
     * @return array<int,array<string,mixed>>
     */
    public function getResponsesByAttemptId(string $attemptId, string $userToken): array
    {
        $result = $this->send('GET', '/rest/v1/quiz_attempt_responses', [
            'headers' => [
                'Authorization' => 'Bearer ' . $userToken,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'attempt_id' => 'eq.' . $attemptId,
                'order' => 'created_at.asc',
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            return [];
        }

        return $result['payload'];
    }

    /**
     * Send HTTP request to Supabase REST API.
     * @param string $method
     * @param string $path
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
