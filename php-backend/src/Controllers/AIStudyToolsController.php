<?php
/**
 * AI StudyTools Controller
 * 
 * Handles requests for AI-generated educational content.
 * Connects to Python AI service (Ollama-based) for generation.
 * 
 * Endpoints:
 * - POST /api/ai/generate/studytools - Generate complete study package
 * - POST /api/ai/generate/summary - Generate summary only
 * - POST /api/ai/generate/keypoints - Generate keypoints only
 * - POST /api/ai/generate/quiz - Generate quiz only
 * - POST /api/ai/generate/flashcards - Generate flashcards only
 */

namespace App\Controllers;

use App\Http\Request;
use App\Http\JsonResponder;
use Exception;

class AIStudyToolsController
{
    /**
     * Base URL for Python AI service
     */
    private string $aiServiceUrl;

    /**
     * Request timeout in seconds
     */
    private int $timeout = 300;

    public function __construct()
    {
        // Get AI service URL from environment or use default
        $this->aiServiceUrl = getenv('AI_SERVICE_URL') ?: 'http://localhost:8001';
        
        // Remove trailing slash
        $this->aiServiceUrl = rtrim($this->aiServiceUrl, '/');

        // Configure request timeout from env if provided
        $envTimeout = getenv('AI_SERVICE_TIMEOUT') ?: getenv('AI_REQUEST_TIMEOUT');
        if ($envTimeout !== false && $envTimeout !== null && trim((string)$envTimeout) !== '') {
            $parsed = (int)$envTimeout;
            if ($parsed > 0) {
                $this->timeout = $parsed;
            }
        }
    }

    /**
     * Generate complete StudyTools package (summary, keypoints, quiz, flashcards)
     * 
     * POST /api/ai/generate/studytools
     * 
     * Request body:
     * {
     *   "content": "Text content" (optional),
     *   "supabase_file_path": "path/to/file.pdf" (optional),
     *   "assignment": "Task description" (optional),
     *   "num_quiz_questions": 5,
     *   "num_flashcards": 10
     * }
     * 
    * @param Request $request
     */
    public function generateStudyTools(Request $request): void
    {
        try {
            // Validate input
            $data = $request->getBody();
            
            if (empty($data['content']) && empty($data['supabase_file_path'])) {
                JsonResponder::withStatus(400, [
                    'success' => false,
                    'error' => 'Either content or supabase_file_path is required'
                ]);
                return;
            }

            // Prepare request payload
            $payload = [
                'content' => $data['content'] ?? null,
                'supabase_file_path' => $data['supabase_file_path'] ?? null,
                'assignment' => $data['assignment'] ?? null,
                'num_quiz_questions' => (int)($data['num_quiz_questions'] ?? 5),
                'num_flashcards' => (int)($data['num_flashcards'] ?? 10)
            ];

            // Call AI service
            $result = $this->callAIService('/generate/studytools', $payload);

            if (!$result || !isset($result['success']) || !$result['success']) {
                throw new Exception('AI service returned unsuccessful response');
            }

            JsonResponder::withStatus(200, [
                'success' => true,
                'studytools' => $result['studytools'] ?? []
            ]);
            return;

        } catch (Exception $e) {
            error_log("StudyTools generation error: " . $e->getMessage());
            
            JsonResponder::withStatus(500, [
                'success' => false,
                'error' => 'Failed to generate study tools',
                'detail' => $e->getMessage()
            ]);
            return;
        }
    }

    /**
     * Generate summary only
     * 
     * POST /api/ai/generate/summary
     * 
    * @param Request $request
     */
    public function generateSummary(Request $request): void
    {
        try {
            $data = $request->getBody();
            
            if (empty($data['content']) && empty($data['supabase_file_path'])) {
                JsonResponder::withStatus(400, [
                    'success' => false,
                    'error' => 'Either content or supabase_file_path is required'
                ]);
                return;
            }

            $payload = [
                'content' => $data['content'] ?? null,
                'supabase_file_path' => $data['supabase_file_path'] ?? null,
                'assignment' => $data['assignment'] ?? null
            ];

            $result = $this->callAIService('/generate/summary', $payload);

            JsonResponder::withStatus(200, [
                'success' => true,
                'summary' => $result['summary'] ?? []
            ]);
            return;

        } catch (Exception $e) {
            error_log("Summary generation error: " . $e->getMessage());
            
            JsonResponder::withStatus(500, [
                'success' => false,
                'error' => 'Failed to generate summary',
                'detail' => $e->getMessage()
            ]);
            return;
        }
    }

    /**
     * Generate keypoints only
     * 
     * POST /api/ai/generate/keypoints
     * 
    * @param Request $request
     */
    public function generateKeypoints(Request $request): void
    {
        try {
            $data = $request->getBody();
            
            if (empty($data['content']) && empty($data['supabase_file_path'])) {
                JsonResponder::withStatus(400, [
                    'success' => false,
                    'error' => 'Either content or supabase_file_path is required'
                ]);
                return;
            }

            $payload = [
                'content' => $data['content'] ?? null,
                'supabase_file_path' => $data['supabase_file_path'] ?? null,
                'assignment' => $data['assignment'] ?? null
            ];

            $result = $this->callAIService('/generate/keypoints', $payload);

            JsonResponder::withStatus(200, [
                'success' => true,
                'keypoints' => $result['keypoints'] ?? []
            ]);
            return;

        } catch (Exception $e) {
            error_log("Keypoints generation error: " . $e->getMessage());
            
            JsonResponder::withStatus(500, [
                'success' => false,
                'error' => 'Failed to generate keypoints',
                'detail' => $e->getMessage()
            ]);
            return;
        }
    }

    /**
     * Generate quiz only
     * 
     * POST /api/ai/generate/quiz
     * 
    * @param Request $request
     */
    public function generateQuiz(Request $request): void
    {
        try {
            $data = $request->getBody();
            
            if (empty($data['content']) && empty($data['supabase_file_path'])) {
                JsonResponder::withStatus(400, [
                    'success' => false,
                    'error' => 'Either content or supabase_file_path is required'
                ]);
                return;
            }

            $payload = [
                'content' => $data['content'] ?? null,
                'supabase_file_path' => $data['supabase_file_path'] ?? null,
                'assignment' => $data['assignment'] ?? null,
                'num_questions' => (int)($data['num_questions'] ?? 5)
            ];

            $result = $this->callAIService('/generate/quiz', $payload);

            JsonResponder::withStatus(200, [
                'success' => true,
                'quiz' => $result['quiz'] ?? [],
                'metadata' => $result['metadata'] ?? []
            ]);
            return;

        } catch (Exception $e) {
            error_log("Quiz generation error: " . $e->getMessage());
            
            JsonResponder::withStatus(500, [
                'success' => false,
                'error' => 'Failed to generate quiz',
                'detail' => $e->getMessage()
            ]);
            return;
        }
    }

    /**
     * Generate flashcards only
     * 
     * POST /api/ai/generate/flashcards
     * 
    * @param Request $request
     */
    public function generateFlashcards(Request $request): void
    {
        try {
            $data = $request->getBody();
            
            if (empty($data['content']) && empty($data['supabase_file_path'])) {
                JsonResponder::withStatus(400, [
                    'success' => false,
                    'error' => 'Either content or supabase_file_path is required'
                ]);
                return;
            }

            $payload = [
                'content' => $data['content'] ?? null,
                'supabase_file_path' => $data['supabase_file_path'] ?? null,
                'assignment' => $data['assignment'] ?? null,
                'num_cards' => (int)($data['num_cards'] ?? 10)
            ];

            $result = $this->callAIService('/generate/flashcards', $payload);

            JsonResponder::withStatus(200, [
                'success' => true,
                'flashcards' => $result['flashcards'] ?? [],
                'metadata' => $result['metadata'] ?? []
            ]);
            return;

        } catch (Exception $e) {
            error_log("Flashcards generation error: " . $e->getMessage());
            
            JsonResponder::withStatus(500, [
                'success' => false,
                'error' => 'Failed to generate flashcards',
                'detail' => $e->getMessage()
            ]);
            return;
        }
    }

    /**
     * Health check for AI service
     * 
     * GET /api/ai/health
     * 
    * @return void
     */
    public function healthCheck(): void
    {
        try {
            $ch = curl_init($this->aiServiceUrl . '/health');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $data = [];
            if ($response) {
                $decoded = json_decode($response, true);
                if (is_array($decoded)) { $data = $decoded; }
            }

            if ($httpCode === 200) {
                JsonResponder::withStatus(200, [
                    'success' => true,
                    'ai_service' => $data + ['status' => $data['status'] ?? 'healthy']
                ]);
                return;
            }

            // Degraded instead of failing hard so probes/UI can show partial info
            JsonResponder::withStatus(200, [
                'success' => true,
                'ai_service' => [
                    'status' => 'degraded',
                    'http_code' => $httpCode,
                    'detail' => $data ?: 'unavailable'
                ]
            ]);
            return;

        } catch (Exception $e) {
            JsonResponder::withStatus(200, [
                'success' => true,
                'ai_service' => [
                    'status' => 'degraded',
                    'error' => 'AI service health check failed',
                    'detail' => $e->getMessage()
                ]
            ]);
            return;
        }
    }

    /**
     * Call AI service endpoint
     * 
     * @param string $endpoint Endpoint path (e.g., '/generate/studytools')
     * @param array $payload Request payload
     * @return array Response data
     * @throws Exception
     */
    private function callAIService(string $endpoint, array $payload): array
    {
        $candidates = [];
        $primary = rtrim($this->aiServiceUrl, '/');
        $candidates[] = $primary;
        // Helpful fallbacks for common dev setups
        foreach ([
            getenv('AI_SERVICE_FALLBACK_1') ?: 'http://ai-service:8001',
            getenv('AI_SERVICE_FALLBACK_2') ?: 'http://host.docker.internal:8001',
            getenv('AI_SERVICE_FALLBACK_3') ?: 'http://localhost:8001'
        ] as $cand) {
            $cand = rtrim($cand, '/');
            if (!in_array($cand, $candidates, true)) {
                $candidates[] = $cand;
            }
        }

        // Optional API key header if AI service is secured
        $apiKey = getenv('AI_SERVICE_API_KEY') ?: null;
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            // Disable Expect: 100-continue to avoid delays with some servers/proxies
            'Expect:'
        ];
        if ($apiKey && trim((string)$apiKey) !== '') {
            $headers[] = 'Authorization: Bearer ' . trim((string)$apiKey);
        }

        $lastError = null;
        foreach ($candidates as $base) {
            $url = $base . $endpoint;
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => $headers,
                // Overall request timeout
                CURLOPT_TIMEOUT => $this->timeout,
                // Reasonable connect timeout so we fail over quickly to next candidate
                CURLOPT_CONNECTTIMEOUT => 10,
                // Ensure HTTP/1.1 for better compatibility
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                $lastError = "AI service request failed at $base: $error";
                error_log($lastError);
                continue; // try next candidate
            }

            if ($httpCode !== 200) {
                $errorMsg = "AI service returned HTTP $httpCode at $base";
                if ($response) {
                    $errorData = json_decode($response, true);
                    if (isset($errorData['detail'])) {
                        $errorMsg .= ": " . $errorData['detail'];
                    }
                }
                $lastError = $errorMsg;
                error_log($errorMsg);
                continue; // try next candidate
            }

            $data = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $lastError = "Failed to parse AI service response at $base: " . json_last_error_msg();
                error_log($lastError);
                continue; // try next candidate
            }

            return $data;
        }

        throw new Exception($lastError ?: 'AI service unavailable');
    }

    /**
     * Public proxy to call AI service from other controllers with a prepared payload.
     *
     * @param string $endpoint
     * @param array $payload
     * @return array
     * @throws Exception
     */
    public function proxyGenerate(string $endpoint, array $payload): array
    {
        return $this->callAIService($endpoint, $payload);
    }
}
