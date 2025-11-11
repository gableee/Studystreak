<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Config\SupabaseConfig;
use App\Config\AiConfig;
use App\Http\Request;
use App\Http\JsonResponder;
use App\Repositories\LearningMaterialRepository;
use App\Repositories\MaterialAiVersionRepository;
use GuzzleHttp\Client;
use Exception;

/**
 * StudyToolsController
 *
 * Thin wrapper that proxies study tool generation/display requests
 * to the Python AI service. This class was previously referenced
 * by public/index.php but was empty (causing fatal error). It now
 * delegates to AIStudyToolsController for actual AI calls to keep
 * backwards compatibility with existing routing while centralizing
 * generation logic.
 */
final class StudyToolsController
{
	private SupabaseConfig $supabaseConfig;
	private AiConfig $aiConfig;
	private AIStudyToolsController $aiController;
	private LearningMaterialRepository $materials;
    private MaterialAiVersionRepository $aiVersions;

	use StudyToolsControllerHelpers;

	public function __construct(SupabaseConfig $supabaseConfig, AiConfig $aiConfig, LearningMaterialRepository $materials)
	{
		$this->supabaseConfig = $supabaseConfig;
		$this->aiConfig = $aiConfig;
		$this->aiController = new AIStudyToolsController();
		$this->materials = $materials;

        // Initialize AI versions repository for caching generated outputs
        $client = new Client(['base_uri' => $this->supabaseConfig->getUrl()]);
        $this->aiVersions = new MaterialAiVersionRepository(
            $client,
            $this->supabaseConfig->getAnonKey(),
            $this->supabaseConfig->getServiceRoleKey()
        );
	}

	/**
	 * GET summary for a learning material (proxy). For now we require the client
	 * to supply either raw extracted content or a supabase_file_path.
	 * In future, we could fetch the material by ID and infer supabase path.
	 */
	public function getSummary(Request $request, string $materialId): void
	{
		try {
			$payload = $this->buildPayload($request, $materialId);
			$token = $request->getBearerToken() ?? '';

			// Serve from cache unless regenerate=true
			if (!$this->shouldRegenerate($request)) {
				$latest = $this->aiVersions->getLatestByType($materialId, 'summary', $token);
				if (is_array($latest) && isset($latest['content'])) {
					$content = $latest['content'];
					// JSONB might return as string, decode if needed
					if (is_string($content)) {
						$content = json_decode($content, true) ?? [];
					}
					JsonResponder::withStatus(200, [
						'success' => true,
						'summary' => $content
					]);
					return;
				}
			}
			$result = $this->aiController->proxyGenerate('/generate/summary', $payload);

			$summary = $result['summary'] ?? null;
			if ($summary !== null) {
				// Store version for cache
				$preview = '';
				if (is_array($summary) && isset($summary['content']) && is_string($summary['content'])) {
					$preview = mb_substr($summary['content'], 0, 280);
				} elseif (is_string($summary)) {
					$preview = mb_substr($summary, 0, 280);
				}
				$this->aiVersions->insert([
					'material_id' => $materialId,
					'type' => 'summary',
					'content' => $summary,
					'model_name' => 'ollama',
					'generated_by' => 'ai-service',
					'content_preview' => $preview,
				], $token);
			}

			JsonResponder::withStatus(200, [
				'success' => true,
				'summary' => $summary ?? []
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to generate summary',
				'detail' => $e->getMessage(),
			]);
		}
	}

	public function getKeyPoints(Request $request, string $materialId): void
	{
		try {
			$payload = $this->buildPayload($request, $materialId);
			$token = $request->getBearerToken() ?? '';

			if (!$this->shouldRegenerate($request)) {
				$latest = $this->aiVersions->getLatestByType($materialId, 'keypoints', $token);
				if (is_array($latest) && isset($latest['content'])) {
					$content = $latest['content'];
					// JSONB might return as string, decode if needed
					if (is_string($content)) {
						$content = json_decode($content, true) ?? [];
					}
					JsonResponder::withStatus(200, [
						'success' => true,
						'keypoints' => $content
					]);
					return;
				}
			}
			$result = $this->aiController->proxyGenerate('/generate/keypoints', $payload);

			$keypoints = $result['keypoints'] ?? [];
			// Store version
			$preview = '';
			if (is_array($keypoints) && !empty($keypoints)) {
				if (isset($keypoints[0]['topic'])) {
					$preview = (string)$keypoints[0]['topic'];
				}
			}
			$this->aiVersions->insert([
				'material_id' => $materialId,
				'type' => 'keypoints',
				'content' => $keypoints,
				'model_name' => 'ollama',
				'generated_by' => 'ai-service',
				'content_preview' => $preview,
			], $token);

			JsonResponder::withStatus(200, [
				'success' => true,
				'keypoints' => $keypoints
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to generate key points',
				'detail' => $e->getMessage(),
			]);
		}
	}

	public function getKeyPointsV2(Request $request, string $materialId): void
	{
		$this->getKeyPoints($request, $materialId);
	}

	public function generateQuiz(Request $request, string $materialId): void
	{
		try {
			$payload = $this->buildPayload($request, $materialId);
			$body = $request->getBody() ?? [];
			
			// Allow client to customize quiz generation
			if (isset($body['num_questions'])) {
				$payload['num_questions'] = (int)$body['num_questions'];
			}
			if (isset($body['question_type'])) {
				$payload['question_type'] = (string)$body['question_type'];
			}
			if (isset($body['difficulty'])) {
				$payload['difficulty'] = (string)$body['difficulty'];
			}

			// NEVER cache quizzes - always generate fresh to allow multiple variations
			$result = $this->aiController->proxyGenerate('/generate/quiz', $payload);

			$quiz = $result['quiz'] ?? [];
			$metadata = $result['metadata'] ?? [];

			JsonResponder::withStatus(200, [
				'success' => true,
				'quiz' => $quiz,
				'metadata' => $metadata
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to generate quiz',
				'detail' => $e->getMessage(),
			]);
		}
	}

	public function getFlashcards(Request $request, string $materialId): void
	{
		try {
			$payload = $this->buildPayload($request, $materialId);
			// Allow client to override number of cards
			$body = $request->getBody() ?? [];
			if (isset($body['num_cards'])) {
				$payload['num_cards'] = (int)$body['num_cards'];
			}
			$token = $request->getBearerToken() ?? '';

			if (!$this->shouldRegenerate($request)) {
				$latest = $this->aiVersions->getLatestByType($materialId, 'flashcards', $token);
				if (is_array($latest) && isset($latest['content'])) {
					$content = $latest['content'];
					// JSONB might return as string, decode if needed
					if (is_string($content)) {
						$content = json_decode($content, true) ?? [];
					}
					JsonResponder::withStatus(200, [
						'success' => true,
						'flashcards' => is_array($content) && isset($content['flashcards']) ? $content['flashcards'] : ($content ?? []),
						'metadata' => is_array($content) && isset($content['metadata']) ? $content['metadata'] : []
					]);
					return;
				}
			}
			$result = $this->aiController->proxyGenerate('/generate/flashcards', $payload);

			$flashcards = $result['flashcards'] ?? [];
			$metadata = $result['metadata'] ?? [];
			// Store version
			$preview = '';
			if (is_array($flashcards) && !empty($flashcards)) {
				if (isset($flashcards[0]['Q'])) {
					$preview = mb_substr((string)$flashcards[0]['Q'], 0, 280);
				}
			}
			$this->aiVersions->insert([
				'material_id' => $materialId,
				'type' => 'flashcards',
				'content' => [ 'flashcards' => $flashcards, 'metadata' => $metadata ],
				'model_name' => 'ollama',
				'generated_by' => 'ai-service',
				'content_preview' => $preview,
			], $token);

			JsonResponder::withStatus(200, [
				'success' => true,
				'flashcards' => $flashcards,
				'metadata' => $metadata
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to generate flashcards',
				'detail' => $e->getMessage(),
			]);
		}
	}

	public function getStudyNote(Request $request, string $materialId): void
	{
		try {
			$token = $request->getBearerToken() ?? '';

			// Check cache first
			if (!$this->shouldRegenerate($request)) {
				$latest = $this->aiVersions->getLatestByType($materialId, 'keypoints', $token);
				if (is_array($latest) && isset($latest['content'])) {
					$content = $latest['content'];
					// JSONB might return as string, decode if needed
					if (is_string($content)) {
						$content = json_decode($content, true) ?? [];
					}
					
					// Generate markdown document from keypoints
					$document = $this->generateMarkdownFromKeypoints($content);
					
					JsonResponder::withStatus(200, [
						'success' => true,
						'documentMarkdown' => $document['markdown'],
						'outline' => $document['outline'],
						'wordCount' => $document['word_count'],
						'confidence' => 0.85,
						'keypointsCount' => count($content)
					]);
					return;
				}
			}

			// If no cache, generate keypoints first
			$payload = $this->buildPayload($request, $materialId);
			$result = $this->aiController->proxyGenerate('/generate/keypoints', $payload);
			$keypoints = $result['keypoints'] ?? [];

			// Store keypoints in cache
			$preview = '';
			if (is_array($keypoints) && !empty($keypoints)) {
				if (isset($keypoints[0]['topic'])) {
					$preview = (string)$keypoints[0]['topic'];
				}
			}
			$this->aiVersions->insert([
				'material_id' => $materialId,
				'type' => 'keypoints',
				'content' => $keypoints,
				'model_name' => 'ollama',
				'generated_by' => 'ai-service',
				'content_preview' => $preview,
			], $token);

			// Generate markdown document
			$document = $this->generateMarkdownFromKeypoints($keypoints);

			JsonResponder::withStatus(200, [
				'success' => true,
				'documentMarkdown' => $document['markdown'],
				'outline' => $document['outline'],
				'wordCount' => $document['word_count'],
				'confidence' => 0.85,
				'keypointsCount' => count($keypoints)
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to generate study note',
				'detail' => $e->getMessage(),
			]);
		}
	}

	/**
	 * Generate a formatted markdown document from keypoints data.
	 */
	private function generateMarkdownFromKeypoints(array $keypoints): array
	{
		$markdown = "# Study Notes\n\n";
		$outline = [];
		$wordCount = 0;

		foreach ($keypoints as $section) {
			if (!isset($section['topic'])) continue;
			
			$topic = (string)$section['topic'];
			$markdown .= "## {$topic}\n\n";
			$outline[] = ['title' => $topic, 'level' => 2];
			$wordCount += str_word_count($topic);

			$terms = $section['terms'] ?? [];
			if (is_array($terms)) {
				foreach ($terms as $term) {
					if (!isset($term['term'])) continue;
					
					$termName = (string)$term['term'];
					$definition = (string)($term['definition'] ?? '');
					
					$markdown .= "### {$termName}\n\n";
					$outline[] = ['title' => $termName, 'level' => 3];
					$wordCount += str_word_count($termName);

					if ($definition) {
						$markdown .= "{$definition}\n\n";
						$wordCount += str_word_count($definition);
					}

					// Add full definition if available
					if (isset($term['fullDefinition']) && $term['fullDefinition']) {
						$fullDef = (string)$term['fullDefinition'];
						$markdown .= "**Detailed Explanation:**\n\n{$fullDef}\n\n";
						$wordCount += str_word_count($fullDef);
					}

					// Add bulleted highlights if available
					if (isset($term['bulletedHighlights']) && is_array($term['bulletedHighlights'])) {
						$markdown .= "**Key Points:**\n\n";
						foreach ($term['bulletedHighlights'] as $highlight) {
							$markdown .= "- {$highlight}\n";
							$wordCount += str_word_count((string)$highlight);
						}
						$markdown .= "\n";
					}

					// Add usage example if available
					if (isset($term['usage']) && $term['usage']) {
						$usage = (string)$term['usage'];
						$markdown .= "**Usage:** {$usage}\n\n";
						$wordCount += str_word_count($usage);
					}

					$markdown .= "---\n\n";
				}
			}
		}

		return [
			'markdown' => $markdown,
			'outline' => $outline,
			'word_count' => $wordCount
		];
	}

	public function downloadPdf(Request $request, string $materialId, string $type): void
	{
		// Placeholder for PDF generation; existing code references this route.
		JsonResponder::withStatus(501, [
			'success' => false,
			'error' => 'PDF generation not implemented'
		]);
	}

	public function getQuizAttemptHistory(Request $request, string $materialId): void
	{
		try {
			$token = $request->getBearerToken() ?? '';
			
			// Get user ID from token (you may need to decode JWT)
			// For now, we'll query all attempts for this material
			$client = new Client(['base_uri' => $this->supabaseConfig->getUrl()]);
			
			// Query quiz_attempts with responses
			$response = $client->request('GET', '/rest/v1/quiz_attempts', [
				'headers' => [
					'Authorization' => 'Bearer ' . $token,
					'apikey' => $this->supabaseConfig->getAnonKey(),
					'Accept' => 'application/json',
				],
				'query' => [
					'select' => 'attempt_id,quiz_id,score,total_questions,correct_answers,time_spent,completed_at,quiz_attempt_responses(question_id,answer,is_correct,response_time_ms)',
					'order' => 'completed_at.desc',
					'limit' => 50,
				],
				'http_errors' => false,
				'timeout' => 15,
			]);

			$status = $response->getStatusCode();
			$body = (string)$response->getBody();
			$attempts = json_decode($body, true);

			if ($status >= 400 || !is_array($attempts)) {
				JsonResponder::withStatus(500, [
					'success' => false,
					'error' => 'Failed to fetch quiz history',
				]);
				return;
			}

			// Transform responses to match frontend format
			$formattedAttempts = [];
			foreach ($attempts as $attempt) {
				$responses = [];
				if (isset($attempt['quiz_attempt_responses']) && is_array($attempt['quiz_attempt_responses'])) {
					foreach ($attempt['quiz_attempt_responses'] as $resp) {
						$responses[] = [
							'question_id' => $resp['question_id'] ?? null,
							'user_answer' => $resp['answer'] ?? null,
							'is_correct' => $resp['is_correct'] ?? false,
							'response_time_ms' => $resp['response_time_ms'] ?? null,
						];
					}
				}

				$formattedAttempts[] = [
					'attempt_id' => $attempt['attempt_id'],
					'quiz_id' => $attempt['quiz_id'] ?? null,
					'score' => $attempt['score'] ?? 0,
					'total_questions' => $attempt['total_questions'] ?? 0,
					'correct_answers' => $attempt['correct_answers'] ?? 0,
					'percentage' => ($attempt['total_questions'] ?? 0) > 0 
						? round(($attempt['correct_answers'] ?? 0) / $attempt['total_questions'] * 100, 1)
						: 0,
					'time_spent' => $attempt['time_spent'] ?? 0,
					'completed_at' => $attempt['completed_at'] ?? date('c'),
					'responses' => $responses,
				];
			}

			JsonResponder::withStatus(200, [
				'success' => true,
				'material_id' => $materialId,
				'attempts' => $formattedAttempts,
				'total_attempts' => count($formattedAttempts),
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to fetch quiz history',
				'detail' => $e->getMessage(),
			]);
		}
	}

	public function createQuizAttempt(Request $request, string $materialId): void
	{
		try {
			$token = $request->getBearerToken() ?? '';
			$data = $request->getBody() ?? [];
			
			// Extract quiz attempt data
			$quizId = $data['quiz_id'] ?? null;
			$score = $data['score'] ?? 0;
			$totalQuestions = $data['total_questions'] ?? 0;
			$correctAnswers = $data['correct_answers'] ?? 0;
			$timeSpent = $data['time_spent'] ?? 0;
			$responses = $data['responses'] ?? [];
			
			if ($totalQuestions === 0) {
				JsonResponder::withStatus(400, [
					'success' => false,
					'error' => 'Invalid quiz attempt: total_questions is required',
				]);
				return;
			}
			
			$client = new Client(['base_uri' => $this->supabaseConfig->getUrl()]);
			
			// Insert quiz attempt
			$attemptPayload = [
				'material_id' => $materialId,
				'quiz_id' => $quizId,
				'score' => $score,
				'total_questions' => $totalQuestions,
				'correct_answers' => $correctAnswers,
				'time_spent' => $timeSpent,
				'completed_at' => date('c'),
			];
			
			$attemptResponse = $client->request('POST', '/rest/v1/quiz_attempts', [
				'headers' => [
					'Authorization' => 'Bearer ' . $token,
					'apikey' => $this->supabaseConfig->getAnonKey(),
					'Content-Type' => 'application/json',
					'Prefer' => 'return=representation',
				],
				'json' => $attemptPayload,
				'http_errors' => false,
				'timeout' => 15,
			]);
			
			$attemptStatus = $attemptResponse->getStatusCode();
			$attemptBody = (string)$attemptResponse->getBody();
			$attemptResult = json_decode($attemptBody, true);
			
			if ($attemptStatus >= 400 || !is_array($attemptResult) || empty($attemptResult)) {
				JsonResponder::withStatus(500, [
					'success' => false,
					'error' => 'Failed to create quiz attempt',
					'detail' => $attemptBody,
				]);
				return;
			}
			
			$attemptId = $attemptResult[0]['attempt_id'] ?? null;
			
			if ($attemptId === null) {
				JsonResponder::withStatus(500, [
					'success' => false,
					'error' => 'Failed to retrieve attempt_id from created quiz attempt',
				]);
				return;
			}
			
			// Insert quiz attempt responses
			$responseRecords = [];
			foreach ($responses as $resp) {
				$responseRecords[] = [
					'attempt_id' => $attemptId,
					'question_id' => $resp['question_id'] ?? null,
					'answer' => $resp['user_answer'] ?? null,
					'is_correct' => $resp['is_correct'] ?? false,
					'response_time_ms' => $resp['response_time_ms'] ?? null,
				];
			}
			
			if (!empty($responseRecords)) {
				$responsesResponse = $client->request('POST', '/rest/v1/quiz_attempt_responses', [
					'headers' => [
						'Authorization' => 'Bearer ' . $token,
						'apikey' => $this->supabaseConfig->getAnonKey(),
						'Content-Type' => 'application/json',
					],
					'json' => $responseRecords,
					'http_errors' => false,
					'timeout' => 15,
				]);
				
				$responsesStatus = $responsesResponse->getStatusCode();
				
				if ($responsesStatus >= 400) {
					// Log error but don't fail the request - attempt was created
					error_log(sprintf('[Quiz] Failed to save responses for attempt %s: %s', $attemptId, (string)$responsesResponse->getBody()));
				}
			}
			
			JsonResponder::withStatus(201, [
				'success' => true,
				'attempt_id' => $attemptId,
				'message' => 'Quiz attempt saved successfully',
			]);
			return;
		} catch (Exception $e) {
			JsonResponder::withStatus(500, [
				'success' => false,
				'error' => 'Failed to create quiz attempt',
				'detail' => $e->getMessage(),
			]);
		}
	}
}

/**
 * Helper methods
 */
namespace App\Controllers;

use App\Http\Request as HttpRequest;
use App\Http\JsonResponder;

trait StudyToolsControllerHelpers
{
	/**
	 * Build payload for AI generation. Resolves supabase_file_path from material when missing.
	 *
	 * @param HttpRequest $request
	 * @param string $materialId
	 * @return array<string,mixed>
	 * @throws \Exception
	 */
	private function buildPayload(HttpRequest $request, string $materialId): array
	{
		/** @var StudyToolsController $self */
		$self = $this;
		$data = $request->getBody() ?? [];

		$content = $data['content'] ?? null;
		$supabasePath = $data['supabase_file_path'] ?? null;
		$assignment = $data['assignment'] ?? null;

		if (empty($content) && empty($supabasePath)) {
			// Try to resolve from learning_materials
			$token = $request->getBearerToken();
			if ($token === null) {
				JsonResponder::withStatus(401, [
					'success' => false,
					'error' => 'Unauthorized: missing bearer token'
				]);
				exit;
			}

			$material = $self->materials->findById($materialId, $token);
			if ($material === null) {
				JsonResponder::withStatus(404, [
					'success' => false,
					'error' => 'Learning material not found or inaccessible'
				]);
				exit;
			}

			// Prefer storage_path; fallback to parsing file_url
			$storagePath = $material['storage_path'] ?? null;
			if (!is_string($storagePath) || trim($storagePath) === '') {
				$fileUrl = (string)($material['file_url'] ?? '');
				$storagePath = $this->parseStoragePathFromUrl($fileUrl);
			}

			if (!is_string($storagePath) || trim($storagePath) === '') {
				// Fallback: use extracted_content if available
				$extracted = (string)($material['extracted_content'] ?? '');
				if (trim($extracted) !== '') {
					$content = $extracted;
				} else {
					JsonResponder::withStatus(400, [
						'success' => false,
						'error' => 'Either content or supabase_file_path is required and could not be inferred from material'
					]);
					exit;
				}
			} else {
				$supabasePath = $storagePath;
			}
		}

		$payload = [
			'content' => $content,
			'supabase_file_path' => $supabasePath,
			'assignment' => $assignment,
		];

		return $payload;
	}

	/**
	 * Determine whether the client requested to bypass cache and regenerate.
	 */
	private function shouldRegenerate(HttpRequest $request): bool
	{
		$body = $request->getBody() ?? [];
		$query = $request->getQueryParams() ?? [];
		$flagFromBody = isset($body['regenerate']) && ($body['regenerate'] === true || $body['regenerate'] === 'true' || $body['regenerate'] === 1 || $body['regenerate'] === '1');
		$flagFromQuery = isset($query['regenerate']) && ($query['regenerate'] === 'true' || $query['regenerate'] === '1');
		return ($flagFromBody || $flagFromQuery);
	}

	/**
	 * Attempt to derive storage path (key within bucket) from a Supabase storage URL.
	 */
	private function parseStoragePathFromUrl(string $url): ?string
	{
		if ($url === '') return null;
		// Typical patterns:
		// .../storage/v1/object/<bucket>/<path>
		// .../storage/v1/object/public/<bucket>/<path>
		$needle = '/storage/v1/object/';
		$pos = stripos($url, $needle);
		if ($pos === false) return null;
		$tail = substr($url, $pos + strlen($needle));
		// Remove optional 'public/' prefix
		if (stripos($tail, 'public/') === 0) {
			$tail = substr($tail, strlen('public/'));
		}
		// tail begins with "<bucket>/<path>"; drop the bucket segment
		$segments = explode('/', $tail, 2);
		if (count($segments) < 2) return null;
		return $segments[1];
	}
}

