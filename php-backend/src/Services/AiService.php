<?php
declare(strict_types=1);

namespace App\Services;

use App\Config\AiConfig;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * HTTP client for AI microservice.
 * Handles requests to generate summaries, key points, quizzes, flashcards, and embeddings.
 */
final class AiService
{
    private Client $client;
    private AiConfig $config;

    public function __construct(AiConfig $config)
    {
        $this->config = $config;
        
        if (!$config->isConfigured()) {
            throw new \RuntimeException('AI_SERVICE_URL is not configured');
        }

        $this->client = new Client([
            'base_uri' => $config->getServiceUrl(),
            'timeout' => $config->getTimeoutSeconds(),
            'http_errors' => false,
        ]);
    }

    /**
     * Generate a summary from extracted text.
     * @param string $text The source text to summarize
     * @param string|null $language Optional language code (e.g., 'en', 'fr')
     * @param int|null $minWords Minimum target words for summary
     * @param int|null $maxWords Maximum target words for summary
     * @return array{success: bool, data?: array<string,mixed>, error?: string}
     */
    public function generateSummary(string $text, ?string $language = null, ?int $minWords = null, ?int $maxWords = null): array
    {
        $payload = [
            'text' => $this->prepareText($text),
            'language' => $language,
        ];
        if ($minWords !== null) {
            $payload['min_words'] = $minWords;
        }
        if ($maxWords !== null) {
            $payload['max_words'] = $maxWords;
        }
        return $this->post('/generate/summary', $payload);
    }

    /**
     * Generate key points from extracted text.
     * @return array{success: bool, data?: array<string,mixed>, error?: string}
     */
    public function generateKeyPoints(string $text, ?string $language = null): array
    {
        return $this->post('/generate/keypoints', [
            'text' => $this->prepareText($text),
            'language' => $language,
        ]);
    }

    /**
     * Generate quiz questions from extracted text.
     * @param int $numQuestions Number of questions to generate
     * @return array{success: bool, data?: array<string,mixed>, error?: string}
     */
    public function generateQuiz(string $text, int $numQuestions = 5, ?string $language = null): array
    {
        return $this->post('/generate/quiz?num_questions=' . $numQuestions, [
            'text' => $this->prepareText($text),
            'language' => $language,
        ]);
    }

    /**
     * Generate flashcards from extracted text.
     * @param int $numCards Number of flashcards to generate
     * @return array{success: bool, data?: array<string,mixed>, error?: string}
     */
    public function generateFlashcards(string $text, int $numCards = 10, ?string $language = null): array
    {
        return $this->post('/generate/flashcards?num_cards=' . $numCards, [
            'text' => $this->prepareText($text),
            'language' => $language,
        ]);
    }

    /**
     * Generate embedding vector from text.
     * @return array{success: bool, data?: array{vector: array<float>, dimensions: int}, error?: string}
     */
    public function generateEmbedding(string $text): array
    {
        return $this->post('/embeddings/generate', [
            'text' => $text,
        ]);
    }

    /**
     * Extract text from a file (PDF, DOCX, PPT).
     * @param string $filePath Path to uploaded file
     * @return array{success: bool, data?: array{text: string, pages?: int}, error?: string}
     */
    public function extractText(string $filePath): array
    {
        // TODO: Implement file upload to AI service
        // This will use multipart/form-data to send the file
        return [
            'success' => false,
            'error' => 'Not implemented yet',
        ];
    }

    /**
     * Extract text by letting the AI service download a temporary signed URL.
     * @return array{success: bool, data?: array{text: string, pages?: int, word_count: int}, error?: string}
     */
    public function extractTextFromUrl(string $url, ?string $contentType = null): array
    {
        return $this->post('/extract/from-url', [
            'url' => $url,
            'content_type' => $contentType,
        ]);
    }

    /**
     * Make a POST request to AI service.
     * @param string $endpoint Endpoint path (e.g., '/generate-summary')
     * @param array<string,mixed> $payload JSON payload
     * @return array{success: bool, data?: mixed, error?: string}
     */
    private function post(string $endpoint, array $payload): array
    {
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if ($this->config->getApiKey() !== null) {
            $headers['X-API-Key'] = $this->config->getApiKey();
        }

        try {
            $response = $this->client->request('POST', $endpoint, [
                'headers' => $headers,
                'json' => $payload,
            ]);

            $status = $response->getStatusCode();
            $body = (string)$response->getBody();
            $decoded = json_decode($body, true);

            if ($status >= 200 && $status < 300) {
                return [
                    'success' => true,
                    'data' => is_array($decoded) ? $decoded : ['raw' => $body],
                ];
            }

            $errorMessage = is_array($decoded) && isset($decoded['error']) 
                ? (string)$decoded['error'] 
                : "AI service returned status $status";

            error_log('[AiService] Request failed: ' . json_encode([
                'endpoint' => $endpoint,
                'status' => $status,
                'response' => $decoded ?? $body,
            ]));

            return [
                'success' => false,
                'error' => $errorMessage,
            ];

        } catch (GuzzleException $e) {
            error_log('[AiService] HTTP error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to connect to AI service: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Normalize and truncate text to the AI service's 10,000 character limit.
     */
    private function prepareText(string $text, int $limit = 200000): string
    {
        // Collapse excessive whitespace/newlines to single spaces
        $normalized = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $normalized = trim($normalized);
        // Allow large inputs end-to-end; cap at 200k characters to protect service
        if ($limit <= 0) {
            return $normalized;
        }
        return function_exists('mb_substr') ? mb_substr($normalized, 0, $limit) : substr($normalized, 0, $limit);
    }
}
