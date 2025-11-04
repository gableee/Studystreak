<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth\SupabaseAuth;
use App\Config\SupabaseConfig;
use App\Http\Request;
use App\Http\JsonResponder;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * StudyToolsController handles AI-powered study features for learning materials
 * 
 * Endpoints:
 * - GET  /api/materials/{id}/study-tools/summary
 * - GET  /api/materials/{id}/study-tools/keypoints
 * - POST /api/materials/{id}/study-tools/quiz
 * - GET  /api/materials/{id}/study-tools/flashcards
 */
class StudyToolsController
{
  private SupabaseConfig $config;
  private SupabaseAuth $auth;
  private Client $httpClient;

  public function __construct(SupabaseConfig $config, SupabaseAuth $auth)
  {
    $this->config = $config;
    $this->auth = $auth;
    $this->httpClient = new Client([
      'timeout' => 30,
      'connect_timeout' => 10,
    ]);
  }

  /**
   * Fetch material metadata and verify AI is enabled
   * Returns null if material not found or AI not enabled
   */
  private function getMaterialIfAiEnabled(string $materialId): ?array
  {
    try {
      $serviceKey = $this->config->getServiceRoleKey();
      $url = $this->config->getUrl();

      $response = $this->httpClient->get(
        "{$url}/rest/v1/learning_materials",
        [
          'headers' => [
            'apikey' => $serviceKey,
            'Authorization' => "Bearer {$serviceKey}",
          ],
          'query' => [
            'material_id' => 'eq.' . $materialId,
            'select' => 'material_id,ai_toggle_enabled,ai_summary,ai_keypoints,ai_quiz,ai_flashcards,ai_generated_at',
          ],
        ]
      );

      $materials = json_decode((string)$response->getBody(), true);
      if (empty($materials)) {
        return null;
      }

      $material = $materials[0];
      
      // Check if AI is enabled for this material
      if (!($material['ai_toggle_enabled'] ?? false)) {
        return null;
      }

      return $material;
    } catch (GuzzleException $e) {
      error_log("Failed to fetch material: " . $e->getMessage());
      return null;
    }
  }

  /**
   * Update AI-generated content in database
   */
  private function updateMaterialAiContent(
    string $materialId,
    ?string $summary = null,
    ?array $keypoints = null,
    ?array $quiz = null,
    ?array $flashcards = null
  ): bool {
    try {
      $serviceKey = $this->config->getServiceRoleKey();
      $url = $this->config->getUrl();

      $updates = [
        'ai_generated_at' => date('c'), // ISO 8601 timestamp
      ];

      if ($summary !== null) {
        $updates['ai_summary'] = $summary;
      }
      if ($keypoints !== null) {
        $updates['ai_keypoints'] = json_encode($keypoints);
      }
      if ($quiz !== null) {
        $updates['ai_quiz'] = json_encode($quiz);
      }
      if ($flashcards !== null) {
        $updates['ai_flashcards'] = json_encode($flashcards);
      }

      $this->httpClient->patch(
        "{$url}/rest/v1/learning_materials",
        [
          'headers' => [
            'apikey' => $serviceKey,
            'Authorization' => "Bearer {$serviceKey}",
            'Content-Type' => 'application/json',
            'Prefer' => 'return=minimal',
          ],
          'query' => [
            'material_id' => 'eq.' . $materialId,
          ],
          'json' => $updates,
        ]
      );

      return true;
    } catch (GuzzleException $e) {
      error_log("Failed to update material AI content: " . $e->getMessage());
      return false;
    }
  }

  /**
   * Call Python AI service to generate content
   * Returns generated data or null on failure
   */
  private function callAiService(string $endpoint, array $payload): ?array
  {
    // TODO: Configure AI service URL from environment
    $aiServiceUrl = $_ENV['AI_SERVICE_URL'] ?? 'http://localhost:8000';

    try {
      $response = $this->httpClient->post(
        "{$aiServiceUrl}{$endpoint}",
        [
          'json' => $payload,
          'timeout' => 60, // AI generation can take time
        ]
      );

      return json_decode((string)$response->getBody(), true);
    } catch (GuzzleException $e) {
      error_log("AI service call failed: " . $e->getMessage());
      return null;
    }
  }

  /**
   * GET /api/materials/{id}/study-tools/summary
   * Fetch or generate AI summary for a material
   */
  public function getSummary(Request $request, string $materialId): void
  {
    $material = $this->getMaterialIfAiEnabled($materialId);

    if ($material === null) {
      JsonResponder::withStatus(404, [
        'error' => 'Material not found or AI features not enabled',
      ]);
      return;
    }

    // If summary already exists, return it
    if (!empty($material['ai_summary'])) {
      JsonResponder::success([
        'materialId' => $materialId,
        'summary' => $material['ai_summary'],
        'generatedAt' => $material['ai_generated_at'] ?? null,
      ]);
      return;
    }

    // TODO: Generate summary via AI service
    // For now, return placeholder
    JsonResponder::withStatus(404, [
      'error' => 'Summary not yet generated. AI generation will be implemented in next phase.',
    ]);
  }

  /**
   * GET /api/materials/{id}/study-tools/keypoints
   * Fetch or generate AI key points for a material
   */
  public function getKeyPoints(Request $request, string $materialId): void
  {
    $material = $this->getMaterialIfAiEnabled($materialId);

    if ($material === null) {
      JsonResponder::withStatus(404, [
        'error' => 'Material not found or AI features not enabled',
      ]);
      return;
    }

    // If keypoints already exist, return them
    if (!empty($material['ai_keypoints'])) {
      $keypoints = json_decode($material['ai_keypoints'], true);
      
      JsonResponder::success([
        'materialId' => $materialId,
        'keypoints' => $keypoints,
        'generatedAt' => $material['ai_generated_at'] ?? null,
      ]);
      return;
    }

    // TODO: Generate keypoints via AI service
    JsonResponder::withStatus(404, [
      'error' => 'Key points not yet generated. AI generation will be implemented in next phase.',
    ]);
  }

  /**
   * POST /api/materials/{id}/study-tools/quiz
   * Generate AI quiz for a material
   * Body: { type: 'multiple-choice' | 'true-false' | 'short-answer', difficulty: 'easy' | 'normal' | 'hard' }
   */
  public function generateQuiz(Request $request, string $materialId): void
  {
    $material = $this->getMaterialIfAiEnabled($materialId);

    if ($material === null) {
      JsonResponder::withStatus(404, [
        'error' => 'Material not found or AI features not enabled',
      ]);
      return;
    }

    $body = $request->getJsonBody();
    $type = $body['type'] ?? 'multiple-choice';
    $difficulty = $body['difficulty'] ?? 'normal';

    // Validate inputs
    $validTypes = ['multiple-choice', 'true-false', 'short-answer'];
    $validDifficulties = ['easy', 'normal', 'hard'];

    if (!in_array($type, $validTypes)) {
      JsonResponder::withStatus(400, [
        'error' => 'Invalid quiz type. Must be: ' . implode(', ', $validTypes),
      ]);
      return;
    }

    if (!in_array($difficulty, $validDifficulties)) {
      JsonResponder::withStatus(400, [
        'error' => 'Invalid difficulty. Must be: ' . implode(', ', $validDifficulties),
      ]);
      return;
    }

    // Check if quiz already exists with same params
    if (!empty($material['ai_quiz'])) {
      $existingQuiz = json_decode($material['ai_quiz'], true);
      
      if (
        ($existingQuiz['type'] ?? '') === $type &&
        ($existingQuiz['difficulty'] ?? '') === $difficulty
      ) {
        JsonResponder::success([
          'materialId' => $materialId,
          'type' => $type,
          'difficulty' => $difficulty,
          'questions' => $existingQuiz['questions'] ?? [],
          'generatedAt' => $material['ai_generated_at'] ?? null,
        ]);
        return;
      }
    }

    // TODO: Generate quiz via AI service
    JsonResponder::withStatus(404, [
      'error' => 'Quiz generation not yet implemented. AI service will be added in next phase.',
      'requestedType' => $type,
      'requestedDifficulty' => $difficulty,
    ]);
  }

  /**
   * GET /api/materials/{id}/study-tools/flashcards
   * Fetch or generate AI flashcards for a material
   */
  public function getFlashcards(Request $request, string $materialId): void
  {
    $material = $this->getMaterialIfAiEnabled($materialId);

    if ($material === null) {
      JsonResponder::withStatus(404, [
        'error' => 'Material not found or AI features not enabled',
      ]);
      return;
    }

    // If flashcards already exist, return them
    if (!empty($material['ai_flashcards'])) {
      $flashcards = json_decode($material['ai_flashcards'], true);
      
      JsonResponder::success([
        'materialId' => $materialId,
        'flashcards' => $flashcards,
        'generatedAt' => $material['ai_generated_at'] ?? null,
      ]);
      return;
    }

    // TODO: Generate flashcards via AI service
    JsonResponder::withStatus(404, [
      'error' => 'Flashcards not yet generated. AI generation will be implemented in next phase.',
    ]);
  }
}
