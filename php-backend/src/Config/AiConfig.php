<?php
declare(strict_types=1);

namespace App\Config;

/**
 * Configuration for AI service integration.
 * Holds settings for HTTP client, model names, timeouts, and rate limits.
 */
final class AiConfig
{
    private ?string $aiServiceUrl;
    private ?string $apiKey;
    private int $timeoutSeconds;
    private string $embeddingModel;
    private int $vectorDimensions;
    // TODO: AI rate limiting - implement only when we have many users and free tier can't handle load
    // private int $monthlyGenerationLimit = 5;

    public function __construct()
    {
        $aiServiceUrl = (string)(getenv('AI_SERVICE_URL') ?? $_ENV['AI_SERVICE_URL'] ?? '');
        $this->aiServiceUrl = $aiServiceUrl !== '' ? rtrim($aiServiceUrl, '/') : null;

        $apiKey = getenv('AI_SERVICE_API_KEY') ?? $_ENV['AI_SERVICE_API_KEY'] ?? null;
        $apiKey = $apiKey !== false && $apiKey !== null ? trim((string)$apiKey) : null;
        $this->apiKey = $apiKey !== '' ? $apiKey : null;

        $this->timeoutSeconds = 120; // 2 minutes for AI generation
        $this->embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
        $this->vectorDimensions = 384; // all-MiniLM-L6-v2 produces 384-dim vectors
    }

    public function getServiceUrl(): ?string
    {
        return $this->aiServiceUrl;
    }

    public function getApiKey(): ?string
    {
        return $this->apiKey;
    }

    public function getTimeoutSeconds(): int
    {
        return $this->timeoutSeconds;
    }

    public function getEmbeddingModel(): string
    {
        return $this->embeddingModel;
    }

    public function getVectorDimensions(): int
    {
        return $this->vectorDimensions;
    }

    public function isConfigured(): bool
    {
        return $this->aiServiceUrl !== null;
    }
}
