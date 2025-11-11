<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Config\SupabaseConfig;
use App\Config\AiConfig;
use App\Http\Request;
use App\Http\JsonResponder;
use App\Repositories\LearningMaterialRepository;
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

	use StudyToolsControllerHelpers;

	public function __construct(SupabaseConfig $supabaseConfig, AiConfig $aiConfig, LearningMaterialRepository $materials)
	{
		$this->supabaseConfig = $supabaseConfig;
		$this->aiConfig = $aiConfig;
		$this->aiController = new AIStudyToolsController();
		$this->materials = $materials;
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
			$result = $this->aiController->proxyGenerate('/generate/summary', $payload);
			JsonResponder::withStatus(200, [
				'success' => true,
				'summary' => $result['summary'] ?? []
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
			$result = $this->aiController->proxyGenerate('/generate/keypoints', $payload);
			JsonResponder::withStatus(200, [
				'success' => true,
				'keypoints' => $result['keypoints'] ?? []
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
			// Allow client to override number of questions
			$body = $request->getBody() ?? [];
			if (isset($body['num_questions'])) {
				$payload['num_questions'] = (int)$body['num_questions'];
			}
			$result = $this->aiController->proxyGenerate('/generate/quiz', $payload);
			JsonResponder::withStatus(200, [
				'success' => true,
				'quiz' => $result['quiz'] ?? [],
				'metadata' => $result['metadata'] ?? []
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
			$result = $this->aiController->proxyGenerate('/generate/flashcards', $payload);
			JsonResponder::withStatus(200, [
				'success' => true,
				'flashcards' => $result['flashcards'] ?? [],
				'metadata' => $result['metadata'] ?? []
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
		// Placeholder: tie into study note generation if/when implemented.
		JsonResponder::withStatus(501, [
			'success' => false,
			'error' => 'Study note generation not implemented'
		]);
	}

	public function downloadPdf(Request $request, string $materialId, string $type): void
	{
		// Placeholder for PDF generation; existing code references this route.
		JsonResponder::withStatus(501, [
			'success' => false,
			'error' => 'PDF generation not implemented'
		]);
	}
}

/**
 * Helper methods
 */
namespace App\Controllers;

use App\Http\Request as HttpRequest;

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

