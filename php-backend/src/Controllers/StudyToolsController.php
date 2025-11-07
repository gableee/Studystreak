<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth\AuthenticatedUser;
use App\Config\AiConfig;
use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use App\Repositories\LearningMaterialRepository;
use App\Repositories\MaterialAiVersionRepository;
use App\Repositories\MaterialAiEmbeddingRepository;
use App\Repositories\QuizAttemptsRepository;
use App\Services\AiService;
use App\Services\PdfService;
use App\Utils\AiResponseParser;
use GuzzleHttp\Client;

/**
 * Controller for AI-powered study tools.
 * Handles generation of summaries, key points, quizzes, and flashcards.
 */
final class StudyToolsController
{
    private LearningMaterialRepository $materialRepo;
    private MaterialAiVersionRepository $aiVersionRepo;
    private MaterialAiEmbeddingRepository $embeddingRepo;
    private QuizAttemptsRepository $quizAttemptsRepo;
    private AiService $aiService;
    private PdfService $pdfService;
    private Client $supabaseClient;
    private string $anonKey;
    private ?string $serviceRoleKey;
    private string $bucket;

    public function __construct(
        SupabaseConfig $supabaseConfig,
        AiConfig $aiConfig
    ) {
        $client = new Client(['base_uri' => $supabaseConfig->getUrl()]);
        $this->supabaseClient = $client;
        $this->anonKey = $supabaseConfig->getAnonKey();
        $this->serviceRoleKey = $supabaseConfig->getServiceRoleKey();
        $this->bucket = $supabaseConfig->getStorageBucket();
        
        $this->materialRepo = new LearningMaterialRepository(
            $client,
            $supabaseConfig->getAnonKey(),
            $supabaseConfig->getServiceRoleKey()
        );
        
        $this->aiVersionRepo = new MaterialAiVersionRepository(
            $client,
            $supabaseConfig->getAnonKey(),
            $supabaseConfig->getServiceRoleKey()
        );
        $this->embeddingRepo = new MaterialAiEmbeddingRepository(
            $client,
            $supabaseConfig->getAnonKey(),
            $supabaseConfig->getServiceRoleKey()
        );
        
        $this->quizAttemptsRepo = new QuizAttemptsRepository(
            $client,
            $supabaseConfig->getAnonKey(),
            $supabaseConfig->getServiceRoleKey()
        );

        $this->aiService = new AiService($aiConfig);
        $this->aiService = new AiService($aiConfig);
        $this->pdfService = new PdfService();
    }

    /**
     * Generate AI content for a learning material.
     * POST /api/learning-materials/{id}/generate
     * Body: { "type": "summary|keypoints|quiz|flashcards", "regenerate": false }
     */
    public function generate(Request $request, string $materialId): void
    {
        // Require authentication
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        // Get request body
        $input = $request->getBody() ?? [];
        $type = strtolower(trim((string)($input['type'] ?? '')));
        $regenerate = (bool)($input['regenerate'] ?? false);

        // Validate type
        $allowedTypes = ['summary', 'keypoints', 'quiz', 'flashcards'];
        if (!in_array($type, $allowedTypes, true)) {
            JsonResponder::badRequest('Invalid type. Must be one of: ' . implode(', ', $allowedTypes));
            return;
        }

        // Fetch material
        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        // Check ownership
        $ownerId = (string)($material['user_id'] ?? '');
        if ($ownerId !== $user->getId()) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }

        // Check if AI is enabled for this material
        if (!(bool)($material['ai_toggle_enabled'] ?? false)) {
            JsonResponder::badRequest('AI is not enabled for this material. Enable it in material settings.');
            return;
        }

        // Check if already exists (unless regenerate=true)
        if (!$regenerate) {
            $existing = $this->aiVersionRepo->getLatestByType($materialId, $type, $token);
            if ($existing !== null) {
                JsonResponder::ok([
                    'message' => 'AI content already exists. Set regenerate=true to create new version.',
                    'existing' => $this->transformAiVersion($existing),
                ]);
                return;
            }
        }

        // TODO: Extract text from file if storage_path is set
        // For now, use description as fallback
        $sourceText = trim((string)($material['description'] ?? ''));
        if ($sourceText === '') {
            $sourceText = trim((string)($material['extracted_content'] ?? ''));
        }
        if ($sourceText === '') {
            JsonResponder::badRequest('Material has no text content to process. Add a description or upload a file.');
            return;
        }

        // Call AI service
        $aiResponse = $this->callAiService($type, $sourceText);
        if (!$aiResponse['success']) {
            JsonResponder::withStatus(500, [
                'error' => 'Failed to generate AI content',
                'details' => $aiResponse['error'] ?? 'Unknown error',
            ]);
            return;
        }

        // Parse AI response
        $parsedContent = $this->parseAiResponse($type, $aiResponse['data'] ?? []);
        
        // Insert AI version record
        $aiVersionData = [
            'material_id' => $materialId,
            'type' => $type,
            'content' => json_encode($parsedContent),
            'model_name' => $this->getModelName($type),
            'model_params' => json_encode(['version' => '1.0']),
            'generated_by' => 'ai-service',
            'created_by' => $user->getId(),
            'run_id' => $this->generateRunId(),
            'content_preview' => AiResponseParser::generatePreview($parsedContent),
            'language' => $this->detectLanguage($sourceText),
            'confidence' => $parsedContent['confidence'] ?? null,
            'content_hash' => hash('sha256', json_encode($parsedContent)),
        ];

        $aiVersionId = $this->aiVersionRepo->insert($aiVersionData, $token);
        if ($aiVersionId === null) {
            JsonResponder::withStatus(500, ['error' => 'Failed to save AI version']);
            return;
        }

        // Generate and store embedding (async in production, sync for MVP)
        $this->generateAndStoreEmbedding($aiVersionId, $sourceText, $token);

        // Return success
        JsonResponder::created([
            'message' => 'AI content generated successfully',
            'ai_version_id' => $aiVersionId,
            'type' => $type,
            'content' => $parsedContent,
        ]);
    }

    /**
     * Get latest AI-generated content for a material by type.
     * GET /api/learning-materials/{id}/ai/{type}
     */
    public function getLatest(Request $request, string $materialId, string $type): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token)) {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        // Validate type
        $type = strtolower(trim($type));
        $allowedTypes = ['summary', 'keypoints', 'quiz', 'flashcards'];
        if (!in_array($type, $allowedTypes, true)) {
            JsonResponder::badRequest('Invalid type');
            return;
        }

        // Fetch material to check ownership
        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Material not found']);
            return;
        }

        // Get latest AI version
        $aiVersion = $this->aiVersionRepo->getLatestByType($materialId, $type, $token);
        if ($aiVersion === null) {
            JsonResponder::withStatus(404, ['error' => 'No AI content found for this type']);
            return;
        }

        JsonResponder::ok($this->transformAiVersion($aiVersion));
    }

    /**
     * List all AI versions for a material.
     * GET /api/learning-materials/{id}/ai/versions
     */
    public function listVersions(Request $request, string $materialId): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token)) {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Material not found']);
            return;
        }

        $versions = $this->aiVersionRepo->listVersions($materialId, $token, null);
        
        $transformed = array_map([$this, 'transformAiVersion'], $versions);
        
        JsonResponder::ok([
            'data' => $transformed,
            'count' => count($transformed),
        ]);
    }

    /**
     * Get or generate summary for a material.
     * POST /api/materials/{id}/study-tools/summary
     */
    public function getSummary(Request $request, string $materialId): void
    {
        $this->getOrGenerateContent($request, $materialId, 'summary');
    }

    /**
     * Get or generate key points for a material.
     * GET /api/materials/{id}/study-tools/keypoints
     */
    public function getKeyPoints(Request $request, string $materialId): void
    {
        $this->getOrGenerateContent($request, $materialId, 'keypoints');
    }

    /**
     * Get structured key points (v2) with pagination. Pass-through (no DB persistence for MVP).
     * GET /api/materials/{id}/study-tools/keypoints-v2?page=&page_size=
     */
    public function getKeyPointsV2(Request $request, string $materialId): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        // Fetch material and check ownership + AI toggle
        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }
        if ((string)($material['user_id'] ?? '') !== $user->getId()) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }
        if (!(bool)($material['ai_toggle_enabled'] ?? false)) {
            JsonResponder::badRequest('AI is not enabled for this material. Enable it in material settings.');
            return;
        }

        // Prepare text
        $sourceText = trim((string)($material['description'] ?? ''));
        if ($sourceText === '') {
            $sourceText = trim((string)($material['extracted_content'] ?? ''));
        }
        if ($sourceText === '') {
            JsonResponder::badRequest('Material has no text content to process. Add a description or upload a file.');
            return;
        }

        // Query params
        $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
        $pageSize = isset($_GET['page_size']) && is_numeric($_GET['page_size']) ? (int)$_GET['page_size'] : 24;

        $aiResponse = $this->aiService->generateKeyPointsV2($sourceText, $page, $pageSize);
        if (!($aiResponse['success'] ?? false)) {
            JsonResponder::withStatus(500, ['error' => 'AI service failed', 'details' => $aiResponse['error'] ?? 'Unknown error']);
            return;
        }

        // Pass through AI response, add metadata for FE convenience
        $data = $aiResponse['data'] ?? [];
        $data['materialId'] = $materialId;
        $data['generatedAt'] = date('c');
        JsonResponder::ok($data);
    }

    /**
     * Generate quiz for a material.
     * POST /api/materials/{id}/study-tools/quiz
     */
    public function generateQuiz(Request $request, string $materialId): void
    {
        $this->getOrGenerateContent($request, $materialId, 'quiz');
    }

    /**
     * Get or generate flashcards for a material.
     * GET /api/materials/{id}/study-tools/flashcards
     */
    public function getFlashcards(Request $request, string $materialId): void
    {
        $this->getOrGenerateContent($request, $materialId, 'flashcards');
    }

    /**
     * Generate combined study note (summary + key concepts). Pass-through (no DB persistence for MVP).
     * POST /api/materials/{id}/study-tools/study-note
     */
    public function getStudyNote(Request $request, string $materialId): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }
        if ((string)($material['user_id'] ?? '') !== $user->getId()) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }
        if (!(bool)($material['ai_toggle_enabled'] ?? false)) {
            JsonResponder::badRequest('AI is not enabled for this material. Enable it in material settings.');
            return;
        }

        $sourceText = trim((string)($material['description'] ?? ''));
        if ($sourceText === '') {
            $sourceText = trim((string)($material['extracted_content'] ?? ''));
        }
        if ($sourceText === '') {
            JsonResponder::badRequest('Material has no text content to process. Add a description or upload a file.');
            return;
        }

        $input = $request->getBody() ?? [];
        $minWords = isset($input['min_words']) && is_numeric($input['min_words']) ? (int)$input['min_words'] : null;
        $maxWords = isset($input['max_words']) && is_numeric($input['max_words']) ? (int)$input['max_words'] : null;

        $aiResponse = $this->aiService->generateStudyNote($sourceText, $minWords, $maxWords);
        if (!($aiResponse['success'] ?? false)) {
            JsonResponder::withStatus(500, ['error' => 'AI service failed', 'details' => $aiResponse['error'] ?? 'Unknown error']);
            return;
        }

        $data = $aiResponse['data'] ?? [];
        $data['materialId'] = $materialId;
        $data['generatedAt'] = date('c');
        JsonResponder::ok($data);
    }

    /**
     * Download latest AI content as PDF.
     * GET /api/materials/{id}/study-tools/{type}.pdf
     */
    public function downloadPdf(Request $request, string $materialId, string $type): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token)) {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        $type = strtolower(trim($type));
        $allowed = ['summary', 'keypoints', 'quiz'];
        if (!in_array($type, $allowed, true)) {
            JsonResponder::badRequest('Invalid type');
            return;
        }

        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Material not found']);
            return;
        }

        $aiVersion = $this->aiVersionRepo->getLatestByType($materialId, $type, $token);
        if ($aiVersion === null) {
            JsonResponder::withStatus(404, ['error' => 'No AI content found for this type']);
            return;
        }

        $title = (string)($material['title'] ?? 'StudyStreak');
        $html = $this->buildHtmlForType($title, $aiVersion);
        $fileBase = $this->safeFileBase($title);
        $result = $this->pdfService->render($html, $fileBase . '-' . $type . '.pdf');

        // Set headers and output PDF
        header('Content-Type: ' . $result['content_type']);
        header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
        header('Content-Length: ' . strlen($result['body']));
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // Output the PDF and exit to prevent JsonResponder interference
        echo $result['body'];
        exit;
    }

    /**
     * Unified method to get or generate AI content.
     * Checks for existing content first, generates if not exists or if regenerate=true.
     */
    private function getOrGenerateContent(Request $request, string $materialId, string $type): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        // Fetch material
        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        // Check ownership
        $ownerId = (string)($material['user_id'] ?? '');
        if ($ownerId !== $user->getId()) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }

        // Check if AI is enabled for this material
        error_log(sprintf('[DEBUG] Material %s ai_toggle_enabled value: %s (type: %s)', 
            $materialId, 
            var_export($material['ai_toggle_enabled'] ?? 'NOT_SET', true),
            gettype($material['ai_toggle_enabled'] ?? null)
        ));
        
        if (!(bool)($material['ai_toggle_enabled'] ?? false)) {
            JsonResponder::badRequest('AI is not enabled for this material. Enable it in material settings.');
            return;
        }

        // Check for existing content
        $input = $request->getBody() ?? [];
        $regenerate = (bool)($input['regenerate'] ?? false);
        $quizCount = (int)($input['question_count'] ?? ($input['count'] ?? 5));
        $quizDifficulty = is_string($input['difficulty'] ?? null) ? strtolower(trim((string)$input['difficulty'])) : null;
        $quizType = is_string($input['question_type'] ?? null) ? strtolower(trim((string)$input['question_type'])) : 'multiple-choice';
        if ($type === 'quiz' && ($quizCount !== 5 || $quizDifficulty !== null || $quizType !== 'multiple-choice')) {
            // Custom settings requested: force regeneration to honor new params
            $regenerate = true;
        }

        if (!$regenerate) {
            $existing = $this->aiVersionRepo->getLatestByType($materialId, $type, $token);
            if ($existing !== null) {
                // Transform to frontend-expected format
                $transformed = $this->transformForFrontend($existing, $materialId);
                JsonResponder::ok($transformed);
                return;
            }
        }

        // Generate new content
        $sourceText = trim((string)($material['description'] ?? ''));
        if ($sourceText === '') {
            $sourceText = trim((string)($material['extracted_content'] ?? ''));
        }
        // If still empty but we have a file, try to extract text via AI service from a signed URL
        if ($sourceText === '') {
            $storagePath = trim((string)($material['storage_path'] ?? ''));
            if ($storagePath !== '') {
                $signedUrl = $this->signStorageObject($storagePath, $token, 600);
                if ($signedUrl !== null) {
                    $extract = $this->aiService->extractTextFromUrl($signedUrl);
                    if (($extract['success'] ?? false) && isset($extract['data']['text'])) {
                        $text = trim((string)$extract['data']['text']);
                        if ($text !== '') {
                            $sourceText = $text;
                            // Persist for future calls
                            try {
                                $this->materialRepo->update($materialId, ['extracted_content' => $text], $token);
                            } catch (\Throwable $e) {
                                error_log('[StudyToolsController] Failed to save extracted_content: ' . $e->getMessage());
                            }
                        }
                    } else {
                        error_log('[StudyToolsController] AI extractTextFromUrl failed: ' . json_encode($extract));
                    }
                } else {
                    error_log('[StudyToolsController] Failed to sign storage object for extraction: ' . $storagePath);
                }
            }
        }
        
        error_log(sprintf('[DEBUG] Source text length: %d, empty: %s', strlen($sourceText), $sourceText === '' ? 'YES' : 'NO'));
        
        if ($sourceText === '') {
            JsonResponder::badRequest('Material has no text content to process. Add a description or upload a file.');
            return;
        }

        // Call AI service
        error_log(sprintf('[StudyTools] Calling AI service for type=%s, text_length=%d', $type, strlen($sourceText)));
        if ($type === 'summary') {
            // Extract optional length controls from request body
            $minWords = isset($input['min_words']) && is_numeric($input['min_words']) ? (int)$input['min_words'] : null;
            $maxWords = isset($input['max_words']) && is_numeric($input['max_words']) ? (int)$input['max_words'] : null;
            $aiResponse = $this->aiService->generateSummary($sourceText, null, $minWords, $maxWords);
        } elseif ($type === 'quiz') {
            $aiResponse = $this->aiService->generateQuiz($sourceText, max(1, min(50, $quizCount)));
        } else {
            $aiResponse = $this->callAiService($type, $sourceText);
        }
        error_log('[StudyTools] AI service response: ' . json_encode(['success' => $aiResponse['success'] ?? false, 'has_data' => isset($aiResponse['data'])]));
        
        if (!$aiResponse['success']) {
            error_log('[StudyTools] AI generation failed: ' . json_encode($aiResponse));
            JsonResponder::withStatus(500, [
                'error' => 'Failed to generate AI content',
                'details' => $aiResponse['error'] ?? 'Unknown error',
            ]);
            return;
        }

        // Parse AI response
        $parsedContent = $this->parseAiResponse($type, $aiResponse['data'] ?? []);
        error_log('[StudyTools] Parsed content: ' . json_encode(['type' => $type, 'has_content' => !empty($parsedContent), 'keys' => array_keys($parsedContent)]));
        
        // Insert AI version record
        $aiVersionData = [
            'material_id' => $materialId,
            'type' => $type,
            'content' => json_encode($parsedContent),
            'model_name' => $this->getModelName($type),
            'model_params' => json_encode(array_filter([
                'version' => '1.0',
                'question_count' => $type === 'quiz' ? max(1, min(50, $quizCount)) : null,
                'difficulty' => $type === 'quiz' ? $quizDifficulty : null,
                'question_type' => $type === 'quiz' ? $quizType : null,
                'min_words' => $type === 'summary' && isset($minWords) ? $minWords : null,
                'max_words' => $type === 'summary' && isset($maxWords) ? $maxWords : null,
            ])),
            'generated_by' => 'ai-service',
            'created_by' => $user->getId(),
            'run_id' => $this->generateRunId(),
            'content_preview' => AiResponseParser::generatePreview($parsedContent),
            'language' => $this->detectLanguage($sourceText),
            'confidence' => $parsedContent['confidence'] ?? null,
            'content_hash' => hash('sha256', json_encode($parsedContent)),
        ];
        
        error_log('[StudyTools] Attempting to insert AI version: ' . json_encode([
            'material_id' => $materialId,
            'type' => $type,
            'user_id' => $user->getId(),
            'content_length' => strlen($aiVersionData['content']),
            'preview_length' => strlen($aiVersionData['content_preview'] ?? ''),
        ]));

        $aiVersionId = $this->aiVersionRepo->insert($aiVersionData, $token);
        
        if ($aiVersionId === null) {
            error_log('[StudyTools] Database insert FAILED - aiVersionRepo returned null');
            JsonResponder::withStatus(500, ['error' => 'Failed to save AI version']);
            return;
        }
        
        error_log('[StudyTools] Successfully inserted AI version with ID: ' . $aiVersionId);

        // Generate and store embedding
        $this->generateAndStoreEmbedding($aiVersionId, $sourceText, $token);

        // Get the newly created version and return in frontend format
        $newVersion = $this->aiVersionRepo->getLatestByType($materialId, $type, $token);
        if ($newVersion !== null) {
            $transformed = $this->transformForFrontend($newVersion, $materialId);
            JsonResponder::ok($transformed);
        } else {
            JsonResponder::withStatus(500, ['error' => 'Failed to retrieve generated content']);
        }
    }

    /**
     * Create a signed URL for a storage object path.
     */
    private function signStorageObject(string $storagePath, string $token, int $expiresIn = 600): ?string
    {
        // Prefer service role when available; else use the user's token
        $authToken = $this->serviceRoleKey ?? $token;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        try {
            $response = $this->supabaseClient->request('POST', '/storage/v1/object/sign/' . rawurlencode($this->bucket) . '/' . $this->encodePath($storagePath), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $authToken,
                    'apikey' => $apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => ['expiresIn' => $expiresIn],
                'http_errors' => false,
                'timeout' => 15,
            ]);

            $status = $response->getStatusCode();
            $body = (string)$response->getBody();
            $decoded = json_decode($body, true);
            if (($status === 200 || $status === 206) && is_array($decoded) && isset($decoded['signedURL'])) {
                return rtrim((string)$this->supabaseClient->getConfig('base_uri'), '/') . '/storage/v1' . (string)$decoded['signedURL'];
            }
            error_log('[StudyToolsController] signStorageObject failed: ' . json_encode(['status' => $status, 'payload' => $decoded ?? $body]));
        } catch (\Throwable $e) {
            error_log('[StudyToolsController] signStorageObject exception: ' . $e->getMessage());
        }

        return null;
    }

    private function encodePath(string $path): string
    {
        return implode('/', array_map('rawurlencode', explode('/', $path)));
    }

    /**
     * Call AI service based on content type.
     * @return array{success: bool, data?: mixed, error?: string}
     */
    private function callAiService(string $type, string $text): array
    {
        return match ($type) {
            'summary' => $this->aiService->generateSummary($text),
            'keypoints' => $this->aiService->generateKeyPoints($text),
            'quiz' => $this->aiService->generateQuiz($text, 5),
            'flashcards' => $this->aiService->generateFlashcards($text, 10),
            default => ['success' => false, 'error' => 'Unknown type'],
        };
    }

    /**
     * Parse AI response into database-ready format.
     * @return array<string,mixed>
     */
    private function parseAiResponse(string $type, array $aiData): array
    {
        return match ($type) {
            'summary' => AiResponseParser::parseSummary($aiData),
            'keypoints' => AiResponseParser::parseKeyPoints($aiData),
            'quiz' => AiResponseParser::parseQuiz($aiData),
            'flashcards' => AiResponseParser::parseFlashcards($aiData),
            default => [],
        };
    }

    /**
     * Generate and store embedding for AI content.
     */
    private function generateAndStoreEmbedding(string $aiVersionId, string $text, string $token): void
    {
        $response = $this->aiService->generateEmbedding($text);
        
        if (!$response['success'] || !isset($response['data']['vector'])) {
            error_log('[StudyToolsController] Failed to generate embedding: ' . ($response['error'] ?? 'Unknown'));
            return;
        }

        $vector = $response['data']['vector'];
        $embeddingId = $this->embeddingRepo->insert($aiVersionId, $vector, $token);
        
        if ($embeddingId === null) {
            error_log('[StudyToolsController] Failed to store embedding for ai_version_id: ' . $aiVersionId);
        }
    }

    /**
     * Get model name for content type.
     */
    private function getModelName(string $type): string
    {
        return match ($type) {
            'summary' => 'facebook/bart-large-cnn',
            'keypoints' => 'facebook/bart-large-cnn',
            'quiz' => 't5-base-qg',
            'flashcards' => 't5-base-qg',
            default => 'unknown',
        };
    }

    /**
     * Build simple HTML for PDF rendering based on AI version content.
     * @param array<string,mixed> $aiVersion
     */
    private function buildHtmlForType(string $title, array $aiVersion): string
    {
        $type = (string)($aiVersion['type'] ?? 'summary');
        $content = null;
        if (isset($aiVersion['content']) && is_string($aiVersion['content'])) {
            $decoded = json_decode($aiVersion['content'], true);
            $content = is_array($decoded) ? $decoded : null;
        }

        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $createdAt = htmlspecialchars((string)($aiVersion['created_at'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $header = '<h1>' . $safeTitle . ' — ' . ucfirst($type) . '</h1><div class="muted">Generated at ' . $createdAt . '</div>';

        if ($type === 'summary') {
            $text = htmlspecialchars((string)($content['text'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            return $header . '<p>' . nl2br($text) . '</p>';
        }

        if ($type === 'keypoints') {
            $items = '';
            foreach (($content['keypoints'] ?? []) as $kp) {
                $items .= '<li>' . htmlspecialchars((string)$kp, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>';
            }
            return $header . '<h2>Key Points</h2><ul>' . $items . '</ul>';
        }

        if ($type === 'quiz') {
            $html = $header . '<h2>Quiz</h2>';
            $idx = 1;
            foreach (($content['questions'] ?? []) as $q) {
                if (!is_array($q)) { continue; }
                $qText = htmlspecialchars((string)($q['question'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                $html .= '<p><strong>Q' . $idx . '.</strong> ' . $qText . '</p>';
                if (isset($q['options']) && is_array($q['options'])) {
                    $html .= '<ul>';
                    foreach ($q['options'] as $opt) {
                        $html .= '<li>' . htmlspecialchars((string)$opt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>';
                    }
                    $html .= '</ul>';
                }
                if (isset($q['correct_answer'])) {
                    $html .= '<div class="muted">Answer: ' . htmlspecialchars((string)$q['correct_answer'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</div>';
                }
                if (isset($q['explanation']) && $q['explanation'] !== null && $q['explanation'] !== '') {
                    $html .= '<div class="muted">Explanation: ' . htmlspecialchars((string)$q['explanation'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</div>';
                }
                $idx++;
            }
            return $html;
        }

        return $header;
    }

    private function safeFileBase(string $name): string
    {
        $base = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? 'document');
        $base = trim($base, '-');
        return $base === '' ? 'document' : $base;
    }

    /**
     * Generate a unique run ID for this generation request.
     */
    private function generateRunId(): string
    {
        // Generate a RFC 4122 compliant UUID v4 string
        $data = random_bytes(16);
        // Set version to 0100
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        // Set bits 6-7 to 10
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        $hex = bin2hex($data);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split($hex, 4));
    }

    /**
     * Detect language from text (simple heuristic for MVP).
     */
    private function detectLanguage(string $text): string
    {
        // TODO: Use proper language detection library
        return 'en'; // Default to English
    }

    /**
     * Transform AI version record for API response.
     * @param array<string,mixed> $version
     * @return array<string,mixed>
     */
    private function transformAiVersion(array $version): array
    {
        $content = null;
        if (isset($version['content']) && is_string($version['content'])) {
            $decoded = json_decode($version['content'], true);
            $content = is_array($decoded) ? $decoded : null;
        }

        return [
            'id' => (string)($version['ai_version_id'] ?? ''),
            'material_id' => (string)($version['material_id'] ?? ''),
            'type' => (string)($version['type'] ?? ''),
            'content' => $content,
            'model_name' => (string)($version['model_name'] ?? ''),
            'confidence' => $version['confidence'] ?? null,
            'language' => (string)($version['language'] ?? 'en'),
            'preview' => (string)($version['content_preview'] ?? ''),
            'created_at' => (string)($version['created_at'] ?? ''),
            'created_by' => (string)($version['created_by'] ?? ''),
        ];
    }

    /**
     * Transform AI version to frontend-expected format.
     * @param array<string,mixed> $version
     * @return array<string,mixed>
     */
    private function transformForFrontend(array $version, string $materialId): array
    {
        $type = (string)($version['type'] ?? '');
        $content = null;
        if (isset($version['content']) && is_string($version['content'])) {
            $decoded = json_decode($version['content'], true);
            $content = is_array($decoded) ? $decoded : null;
        }

        $createdAt = (string)($version['created_at'] ?? date('c'));

        return match ($type) {
            'summary' => [
                'materialId' => $materialId,
                'summary' => $content['text'] ?? '',
                'generatedAt' => $createdAt,
            ],
            'keypoints' => [
                'materialId' => $materialId,
                'keypoints' => array_map(fn($text, $idx) => [
                    'id' => (string)$idx,
                    'text' => $text,
                ], $content['keypoints'] ?? [], array_keys($content['keypoints'] ?? [])),
                'generatedAt' => $createdAt,
            ],
            'quiz' => [
                'materialId' => $materialId,
                'type' => 'multiple-choice',
                'difficulty' => 'normal',
                'questions' => array_map(fn($q, $idx) => [
                    'id' => (string)$idx,
                    'question' => $q['question'] ?? '',
                    'type' => 'multiple-choice',
                    'options' => $q['options'] ?? [],
                    'correctAnswer' => $q['correct_answer'] ?? '',
                    'explanation' => $q['explanation'] ?? null,
                ], $content['questions'] ?? [], array_keys($content['questions'] ?? [])),
                'generatedAt' => $createdAt,
            ],
            'flashcards' => [
                'materialId' => $materialId,
                'flashcards' => array_map(fn($card, $idx) => [
                    'id' => (string)$idx,
                    'question' => $card['front'] ?? '',
                    'answer' => $card['back'] ?? '',
                ], $content['flashcards'] ?? [], array_keys($content['flashcards'] ?? [])),
                'generatedAt' => $createdAt,
            ],
            default => ['error' => 'Unknown type'],
        };
    }

    /**
     * Create a quiz attempt with responses.
     * POST /api/materials/{material_id}/quiz-attempts
     * Body: { "quiz_id": "uuid", "score": 80.5, "total_questions": 10, "correct_answers": 8, "time_spent": 300, "responses": [...] }
     */
    public function createQuizAttempt(Request $request, string $materialId): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        // Verify material ownership
        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        $ownerId = (string)($material['user_id'] ?? '');
        if ($ownerId !== $user->getId()) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }

        // Parse request body
        $input = $request->getBody() ?? [];
        $quizId = isset($input['quiz_id']) ? trim((string)$input['quiz_id']) : '';
        $score = isset($input['score']) && is_numeric($input['score']) ? (float)$input['score'] : null;
        $totalQuestions = isset($input['total_questions']) && is_numeric($input['total_questions']) ? (int)$input['total_questions'] : null;
        $correctAnswers = isset($input['correct_answers']) && is_numeric($input['correct_answers']) ? (int)$input['correct_answers'] : 0;
        $timeSpent = isset($input['time_spent']) && is_numeric($input['time_spent']) ? (int)$input['time_spent'] : 0;
        $responses = isset($input['responses']) && is_array($input['responses']) ? $input['responses'] : [];

        // Validate required fields
        if ($quizId === '' || $score === null || $totalQuestions === null) {
            JsonResponder::badRequest('Missing required fields: quiz_id, score, total_questions');
            return;
        }

        // Verify quiz exists and belongs to this material
        $quizResult = $this->send('GET', '/rest/v1/quizzes', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'quiz_id' => 'eq.' . $quizId,
                'material_id' => 'eq.' . $materialId,
                'limit' => 1,
            ],
        ]);

        if ($quizResult['status'] >= 400 || !is_array($quizResult['payload']) || empty($quizResult['payload'])) {
            JsonResponder::withStatus(404, ['error' => 'Quiz not found for this material']);
            return;
        }

        // Create the attempt record
        $attemptData = [
            'quiz_id' => $quizId,
            'user_id' => $user->getId(),
            'score' => $score,
            'total_questions' => $totalQuestions,
            'correct_answers' => $correctAnswers,
            'time_spent' => $timeSpent,
        ];

        $attemptId = $this->quizAttemptsRepo->create($attemptData, $token);
        if ($attemptId === null) {
            JsonResponder::withStatus(500, ['error' => 'Failed to create quiz attempt']);
            return;
        }

        // Create response records for each question
        $responsesCreated = 0;
        foreach ($responses as $response) {
            if (!is_array($response)) {
                continue;
            }

            $questionId = isset($response['question_id']) ? trim((string)$response['question_id']) : '';
            $userAnswer = $response['user_answer'] ?? null;
            $isCorrect = isset($response['is_correct']) ? (bool)$response['is_correct'] : false;
            $responseTimeMs = isset($response['response_time_ms']) && is_numeric($response['response_time_ms']) ? (int)$response['response_time_ms'] : null;

            if ($questionId === '') {
                continue;
            }

            // Store answer as JSONB (can be string, array, or object)
            $answerData = is_array($userAnswer) || is_object($userAnswer) ? $userAnswer : ['value' => $userAnswer];

            $responseData = [
                'attempt_id' => $attemptId,
                'question_id' => $questionId,
                'answer' => json_encode($answerData),
                'is_correct' => $isCorrect,
                'response_time_ms' => $responseTimeMs,
            ];

            $responseId = $this->quizAttemptsRepo->createResponse($responseData, $token);
            if ($responseId !== null) {
                $responsesCreated++;
            }
        }

        // Return success response
        JsonResponder::created([
            'attempt_id' => $attemptId,
            'created_at' => date('c'),
            'score' => $score,
            'total_questions' => $totalQuestions,
            'correct_answers' => $correctAnswers,
            'responses_saved' => $responsesCreated,
        ]);
    }

    /**
     * Get quiz attempt history for a material.
     * GET /api/materials/{material_id}/quiz-attempts/history
     * Returns all quiz attempts with detailed responses.
     */
    public function getQuizAttemptHistory(Request $request, string $materialId): void
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return;
        }

        // Verify material ownership
        $material = $this->materialRepo->findById($materialId, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        $ownerId = (string)($material['user_id'] ?? '');
        if ($ownerId !== $user->getId()) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }

        // Get all attempts for this material's quizzes
        $attempts = $this->quizAttemptsRepo->findByMaterialId($materialId, $user->getId(), $token);

        // For each attempt, fetch responses and get quiz questions for correct answers
        $enrichedAttempts = [];
        foreach ($attempts as $attempt) {
            $attemptId = (string)($attempt['attempt_id'] ?? '');
            $quizId = (string)($attempt['quiz_id'] ?? '');
            
            if ($attemptId === '') {
                continue;
            }

            // Get responses for this attempt
            $responses = $this->quizAttemptsRepo->getResponsesByAttemptId($attemptId, $token);

            // Get quiz questions to include correct answers
            $quizQuestions = $this->getQuizQuestions($quizId, $token);
            $questionsMap = [];
            foreach ($quizQuestions as $q) {
                $qid = (string)($q['question_id'] ?? '');
                if ($qid !== '') {
                    $questionsMap[$qid] = $q;
                }
            }

            // Transform responses to include correct answers
            $enrichedResponses = [];
            foreach ($responses as $resp) {
                $questionId = (string)($resp['question_id'] ?? '');
                $userAnswer = null;
                
                // Decode JSONB answer field
                if (isset($resp['answer'])) {
                    if (is_string($resp['answer'])) {
                        $decoded = json_decode($resp['answer'], true);
                        $userAnswer = is_array($decoded) ? ($decoded['value'] ?? $decoded) : $resp['answer'];
                    } else {
                        $userAnswer = $resp['answer'];
                    }
                }

                $correctAnswer = null;
                if (isset($questionsMap[$questionId])) {
                    $correctAnswer = $questionsMap[$questionId]['correct_answer'] ?? null;
                }

                $enrichedResponses[] = [
                    'question_id' => $questionId,
                    'user_answer' => $userAnswer,
                    'is_correct' => (bool)($resp['is_correct'] ?? false),
                    'correct_answer' => $correctAnswer,
                    'response_time_ms' => isset($resp['response_time_ms']) ? (int)$resp['response_time_ms'] : null,
                ];
            }

            $score = isset($attempt['score']) && is_numeric($attempt['score']) ? (float)$attempt['score'] : 0.0;
            $totalQuestions = isset($attempt['total_questions']) && is_numeric($attempt['total_questions']) ? (int)$attempt['total_questions'] : 0;
            $percentage = $totalQuestions > 0 ? round(($score / $totalQuestions) * 100, 2) : 0.0;

            $enrichedAttempts[] = [
                'attempt_id' => $attemptId,
                'quiz_id' => $quizId,
                'score' => $score,
                'total_questions' => $totalQuestions,
                'correct_answers' => isset($attempt['correct_answers']) ? (int)$attempt['correct_answers'] : 0,
                'percentage' => $percentage,
                'time_spent' => isset($attempt['time_spent']) ? (int)$attempt['time_spent'] : 0,
                'completed_at' => (string)($attempt['completed_at'] ?? ''),
                'responses' => $enrichedResponses,
            ];
        }

        JsonResponder::ok([
            'material_id' => $materialId,
            'attempts' => $enrichedAttempts,
            'total_attempts' => count($enrichedAttempts),
        ]);
    }

    /**
     * Get quiz questions for a specific quiz.
     * @param string $quizId
     * @param string $token
     * @return array<int,array<string,mixed>>
     */
    private function getQuizQuestions(string $quizId, string $token): array
    {
        $result = $this->send('GET', '/rest/v1/quiz_questions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => '*',
                'quiz_id' => 'eq.' . $quizId,
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
            $response = $this->supabaseClient->request($method, $path, $options);
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
