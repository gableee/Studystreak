<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth\AuthenticatedUser;
use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use App\Services\StorageException;
use App\Services\StorageService;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\RequestOptions;

final class LearningMaterialsController
{
    private const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

    /** @var string[] */
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    private SupabaseConfig $config;
    private Client $client;
    private string $storageBucket;
    private ?string $serviceRoleKey;
    private ?Client $aiClient;
    private ?string $aiServiceApiKey;
    /** @var array<string,bool> */
    private array $storagePathBackfillCache = [];
    private StorageService $storage;

    public function __construct(SupabaseConfig $config)
    {
        $this->config = $config;
        $this->client = new Client([
            'base_uri' => $config->getUrl(),
            'timeout' => 15,
        ]);
        $this->storageBucket = $config->getStorageBucket();
        $this->serviceRoleKey = $config->getServiceRoleKey();
        $aiServiceUrl = $config->getAiServiceUrl();
        $this->aiServiceApiKey = $config->getAiServiceApiKey();
        $this->aiClient = $aiServiceUrl !== null
            ? new Client([
                'base_uri' => rtrim($aiServiceUrl, '/') . '/',
                'timeout' => 5,
                'connect_timeout' => 2,
            ])
            : null;

        $this->storage = new StorageService(
            $config,
            $this->client,
            $this->storageBucket,
            $config->getStoragePublicBaseUrl(),
            $this->serviceRoleKey
        );
    }

    public function index(Request $request): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

        $params = $request->getQueryParams();
        $query = $this->buildListQuery($params, $user->getId());
        $accessToken = (string)$request->getAttribute('access_token');

        $restToken = $this->serviceRoleKey ?? '';
        if ($restToken === '') {
            $restToken = $accessToken;
        }

        if ($restToken === '') {
            error_log('[learning_materials.index] aborting fetch because no Supabase token is available');
            JsonResponder::withStatus(500, [
                'error' => 'Failed to fetch learning materials',
                'details' => ['message' => 'Supabase credentials missing for REST call'],
            ]);
            return;
        }

        [$status, $payload, $rawBody] = $this->rest('GET', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($restToken),
            RequestOptions::QUERY => $query,
        ]);

        if ($status < 200 || $status >= 300 || !is_array($payload)) {
            error_log(sprintf('[learning_materials.index] fetch failed status=%s body=%s', (string)$status, $rawBody));

            $details = $payload ?? ['response' => $rawBody];
            if (is_array($details)) {
                $details['status'] = $status;
            }

            JsonResponder::withStatus($status > 0 ? $status : 500, [
                'error' => 'Failed to fetch learning materials',
                'details' => $details,
            ]);
            return;
        }

        $categoryParam = trim((string)($params['category'] ?? ''));
        $searchTerm = trim((string)($params['search'] ?? ''));

        $materials = array_map(function (array $item): array {
            $tags = $this->normalizeTags($item['tags'] ?? []);
            $fileUrl = $item['file_url'] ?? null;
            if (!is_string($fileUrl) || $fileUrl === '') {
                $fileUrl = null;
            }

            $storedType = isset($item['content_type']) ? (string)$item['content_type'] : '';
            $expandedType = $this->expandStoredContentType($storedType);

            $result = [
                'material_id' => $item['material_id'] ?? $item['id'] ?? null,
                'title' => $item['title'] ?? '',
                'description' => $item['description'] ?? '',
                'file_url' => $fileUrl,
                'content_type' => $expandedType !== '' ? $expandedType : $storedType,
                'content_type_label' => $storedType !== '' ? $storedType : null,
                'estimated_duration' => $item['estimated_duration'] ?? null,
                'created_at' => $item['created_at'] ?? null,
                'extracted_content' => $item['extracted_content'] ?? null,
                'word_count' => (int)($item['word_count'] ?? 0),
                'ai_quiz_generated' => $this->toBool($item['ai_quiz_generated'] ?? false),
                'user_id' => $item['user_id'] ?? null,
                'created_by' => $item['created_by'] ?? null,
                'is_public' => $this->toBool($item['is_public'] ?? false),
                'category' => $item['category'] ?? null,
                'tags' => $tags,
                'user_name' => $this->extractOwnerName($item),
                'storage_path' => $item['storage_path'] ?? null,
            ];

            if (isset($item['like_count'])) {
                $result['like_count'] = (int)$item['like_count'];
            }

            if (isset($item['download_count'])) {
                $result['download_count'] = (int)$item['download_count'];
            }

            return $result;
        }, $payload);

        foreach ($materials as &$material) {
            $material = $this->ensureDownloadUrl($material, $restToken);
        }
        unset($material);

    // Fetch profile usernames in a second request when they are missing so the
    // frontend can display the owner handle without relying on PostgREST embeds.
        $needLookup = false;
        $userIds = [];
        foreach ($materials as $m) {
            if (!empty($m['user_name'])) {
                continue;
            }

            $candidateIds = [];
            if (!empty($m['user_id'])) {
                $candidateIds[] = $m['user_id'];
            }
            if (!empty($m['created_by'])) {
                $candidateIds[] = $m['created_by'];
            }

            if ($candidateIds !== []) {
                $needLookup = true;
                foreach ($candidateIds as $cid) {
                    $userIds[] = $cid;
                }
            }
        }

        if ($needLookup && count($userIds) > 0) {
            $userIds = array_values(array_unique($userIds));
            // Build PostgREST 'in' filter for string ids
            $quoted = array_map(fn($id) => "'" . str_replace("'", "\\'", (string)$id) . "'", $userIds);
            $inList = '(' . implode(',', $quoted) . ')';

            [$pStatus, $pPayload, $pRaw] = $this->rest('GET', '/rest/v1/profiles', [
                RequestOptions::HEADERS => $this->restHeaders($restToken),
                RequestOptions::QUERY => [
                    'select' => 'id,username',
                    'id' => 'in.' . $inList,
                ],
            ]);

            if ($pStatus >= 200 && $pStatus < 300 && is_array($pPayload)) {
                $map = [];
                foreach ($pPayload as $prof) {
                    if (isset($prof['id']) && isset($prof['username'])) {
                        $map[(string)$prof['id']] = $prof['username'];
                    }
                }

                foreach ($materials as &$m) {
                    if (!empty($m['user_name'])) {
                        continue;
                    }

                    $candidateIds = [];
                    if (!empty($m['user_id'])) {
                        $candidateIds[] = (string)$m['user_id'];
                    }
                    if (!empty($m['created_by'])) {
                        $candidateIds[] = (string)$m['created_by'];
                    }

                    foreach ($candidateIds as $cid) {
                        if (isset($map[$cid])) {
                            $m['user_name'] = $map[$cid];
                            break;
                        }
                    }
                }
                unset($m);
            } else {
                error_log(sprintf('[learning_materials.index] profile lookup failed status=%s body=%s', (string)$pStatus, $pRaw));
            }
        }

        if ($categoryParam !== '' && strcasecmp($categoryParam, 'all') !== 0) {
            $materials = array_values(array_filter($materials, function (array $item) use ($categoryParam): bool {
                return isset($item['category']) && strcasecmp((string)$item['category'], $categoryParam) === 0;
            }));
        }

        if ($searchTerm !== '') {
            $materials = array_values(array_filter($materials, function (array $item) use ($searchTerm): bool {
                $haystacks = [
                    $item['title'] ?? '',
                    $item['description'] ?? '',
                    implode(' ', $item['tags'] ?? []),
                ];
                foreach ($haystacks as $text) {
                    if ($text !== null && stripos((string)$text, $searchTerm) !== false) {
                        return true;
                    }
                }
                return false;
            }));
        }

        JsonResponder::ok($materials);
    }

    /**
     * Return a fresh signed URL for a private learning material.
     * GET /api/learning-materials/:id/signed-url
     */
    public function signedUrl(Request $request, string $id): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

        $restToken = $this->requireRestToken($request);
        if ($restToken === null) {
            return;
        }

        // Fetch the material record
        [$status, $payload, $body] = $this->rest('GET', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($restToken),
            RequestOptions::QUERY => [
                'select' => 'material_id,storage_path,is_public',
                'material_id' => 'eq.' . $id,
                'limit' => '1',
            ],
        ]);

        if ($status < 200 || $status >= 300 || !is_array($payload) || count($payload) === 0) {
            JsonResponder::withStatus($status > 0 ? $status : 404, ['error' => 'Material not found', 'details' => $body]);
            return;
        }

        $record = $payload[0];
        $storagePath = isset($record['storage_path']) ? (string)$record['storage_path'] : '';
        $isPublic = $this->toBool($record['is_public'] ?? false);

        if ($storagePath === '') {
            JsonResponder::withStatus(400, ['error' => 'Material has no storage path']);
            return;
        }

        $signed = $this->storage->createSignedUrl($storagePath, $isPublic ? 60 * 60 * 24 * 30 : 60 * 60, $restToken);
        if ($signed === null) {
            JsonResponder::withStatus(500, ['error' => 'Unable to create signed URL']);
            return;
        }

        $signedUrl = rtrim($this->config->getUrl(), '/') . $signed;
        JsonResponder::ok(['signed_url' => $signedUrl]);
    }

    public function like(Request $request, string $id): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

        $this->incrementMaterialMetric($request, $id, 'like_count', 'Liked successfully');
    }

    public function download(Request $request, string $id): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

        $this->incrementMaterialMetric($request, $id, 'download_count', 'Download counted');
    }

    public function stream(Request $request, string $id): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

        $restToken = $this->requireRestToken($request);
        if ($restToken === null) {
            return;
        }

        [$status, $payload, $rawBody] = $this->rest('GET', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($restToken),
            RequestOptions::QUERY => [
                'select' => 'storage_path,is_public',
                'material_id' => 'eq.' . $id,
                'limit' => '1',
            ],
        ]);

        if ($status < 200 || $status >= 300 || !is_array($payload) || count($payload) === 0) {
            $responseStatus = $status > 0 ? $status : 404;
            JsonResponder::withStatus($responseStatus, [
                'error' => 'Material not found',
                'details' => $payload ?? ['response' => $rawBody],
            ]);
            return;
        }

        $record = $payload[0];
        $storagePath = isset($record['storage_path']) ? trim((string)$record['storage_path']) : '';
        if ($storagePath === '') {
            JsonResponder::withStatus(400, ['error' => 'Material has no storage path']);
            return;
        }

        $isPublic = $this->toBool($record['is_public'] ?? false);

        $objectResponse = $this->storage->fetchObject($storagePath, $restToken);
        if ($objectResponse === null) {
            JsonResponder::withStatus(500, ['error' => 'Unable to load material content']);
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $contentType = $objectResponse->getHeaderLine('Content-Type');
        if ($contentType === '') {
            $contentType = 'application/octet-stream';
        }

        $contentLength = $objectResponse->getHeaderLine('Content-Length');
        $etag = $objectResponse->getHeaderLine('ETag');
        $lastModified = $objectResponse->getHeaderLine('Last-Modified');
        $acceptRanges = $objectResponse->getHeaderLine('Accept-Ranges');
        $disposition = $objectResponse->getHeaderLine('Content-Disposition');

        http_response_code(200);
        header('Content-Type: ' . $contentType);
        if ($contentLength !== '') {
            header('Content-Length: ' . $contentLength);
        }
        if ($etag !== '') {
            header('ETag: ' . $etag);
        }
        if ($lastModified !== '') {
            header('Last-Modified: ' . $lastModified);
        }
        if ($acceptRanges !== '') {
            header('Accept-Ranges: ' . $acceptRanges);
        }

        $filename = basename($storagePath);
        $safeName = str_replace('"', '\"', $filename);
        if ($disposition !== '' && str_contains(strtolower($disposition), 'inline')) {
            header('Content-Disposition: ' . $disposition);
        } else {
            header('Content-Disposition: inline; filename="' . $safeName . '"');
        }

        $cacheControl = $isPublic ? 'public, max-age=300' : 'private, max-age=60';
        header('Cache-Control: ' . $cacheControl);

        // Security headers to prevent content-type sniffing
        header('X-Content-Type-Options: nosniff');

        // Restrict CORS to configured allowed origins to avoid exposing internal assets.
        $allowed = $this->config->getAllowedOrigins();
        if (is_string($allowed) && $allowed !== '') {
            // The config contains a comma-separated list of origins; pick the first that matches
            $origins = array_map('trim', explode(',', $allowed));
            $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
            if ($requestOrigin !== '' && in_array($requestOrigin, $origins, true)) {
                header('Access-Control-Allow-Origin: ' . $requestOrigin);
                header('Access-Control-Allow-Methods: GET');
                header('Access-Control-Allow-Headers: Authorization, Content-Type');
            }
        } else {
            // Fallback: do not allow wildcard in production; allow same-origin only
            header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? ''));
            header('Access-Control-Allow-Methods: GET');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
        }

        // Reject streaming HTML or JavaScript to avoid executing untrusted markup inside the
        // iframe even with sandboxing. Only allow typical binary/document/image content.
        $lowerType = strtolower($contentType);
        if (str_starts_with($lowerType, 'text/html') || str_contains($lowerType, 'javascript') || str_contains($lowerType, 'text/javascript')) {
            JsonResponder::withStatus(403, ['error' => 'Refusing to stream potentially executable content']);
            return;
        }

        $body = $objectResponse->getBody();
        while (!$body->eof()) {
            echo $body->read(8192);
            if (function_exists('flush')) {
                flush();
            }
        }

        if (method_exists($body, 'close')) {
            $body->close();
        }

        exit;
    }

    public function upload(Request $request): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

        error_log('[UPLOAD DEBUG] start upload for user=' . $user->getId());

        $storageToken = $this->serviceRoleKey ?? (string)$request->getAttribute('access_token');
        if ($storageToken === '') {
            JsonResponder::error(500, 'Supabase access token not configured for storage upload');
            return;
        }

        $writeToken = $this->resolveWriteToken($request);
        if ($writeToken === null) {
            JsonResponder::error(500, 'Unable to determine token for database write');
            return;
        }

        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            error_log('[UPLOAD DEBUG] no file present in $_FILES');
            JsonResponder::badRequest('No file uploaded');
            return;
        }

        $file = $_FILES['file'];
        error_log('[UPLOAD DEBUG] file received name=' . ($file['name'] ?? 'n/a') . ' size=' . ($file['size'] ?? 'n/a') . ' error=' . ($file['error'] ?? 'n/a'));
        $uploadError = (int)($file['error'] ?? UPLOAD_ERR_OK);
        if ($uploadError !== UPLOAD_ERR_OK) {
            $details = ['code' => $uploadError];
            $uploadLimit = ini_get('upload_max_filesize');
            if (is_string($uploadLimit) && $uploadLimit !== '') {
                $details['upload_max_filesize'] = $uploadLimit;
            }

            $postLimit = ini_get('post_max_size');
            if (is_string($postLimit) && $postLimit !== '') {
                $details['post_max_size'] = $postLimit;
            }

            JsonResponder::badRequest($this->uploadErrorMessage($uploadError), $details);
            return;
        }

        $title = trim((string)($_POST['title'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));
        $category = trim((string)($_POST['category'] ?? ''));
        $tags = $this->parseTags($_POST['tags'] ?? '[]');
        $isPublic = filter_var($_POST['is_public'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($title === '') {
            JsonResponder::badRequest('Title is required');
            return;
        }

        $tmpPath = (string)($file['tmp_name'] ?? '');
        if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
            JsonResponder::badRequest('Uploaded file is invalid');
            return;
        }

        $clientMime = (string)($file['type'] ?? '');
        $mime = $this->detectMimeType($tmpPath, $clientMime);
        $error = $this->validateFile($file, $mime);
        if ($error !== null) {
            JsonResponder::badRequest($error);
            return;
        }

        $originalName = (string)($file['name'] ?? 'upload');
        $extension = $this->guessExtension($mime, $originalName);
        $objectPath = $this->buildObjectPath($user->getId(), $title, $extension);

        try {
            error_log('[UPLOAD DEBUG] uploading to storage objectPath=' . $objectPath);
            $objectKey = $this->storage->upload($tmpPath, $mime, $objectPath, $storageToken);
            error_log('[UPLOAD DEBUG] storage.upload returned objectKey=' . $objectKey);
        } catch (StorageException $e) {
            $details = $e->getDetails();
            error_log('[UPLOAD DEBUG] storage.upload failed message=' . $e->getMessage() . ' details=' . json_encode($details));
            $payload = ['error' => $e->getMessage()];
            if ($details !== []) {
                $payload['details'] = $details;
            }

            JsonResponder::withStatus($e->getStatus(), $payload);
            return;
        }

        $extractedContent = $this->extractTextContent($tmpPath, $mime);
        $wordCount = $extractedContent !== null ? str_word_count($extractedContent) : 0;

    $initialFileUrl = $this->storage->buildFileUrl($objectKey, $isPublic, $storageToken);
    error_log('[UPLOAD DEBUG] initialFileUrl=' . ($initialFileUrl ?? 'null'));

        $payload = [
            'title' => $title,
            'description' => $description !== '' ? $description : null,
            'content_type' => $this->mapContentType($mime),
            'file_url' => $isPublic ? $initialFileUrl : null,
            'estimated_duration' => null,
            'extracted_content' => $extractedContent,
            'word_count' => $wordCount,
            'user_id' => $user->getId(),
            'created_by' => $user->getId(),
            'is_public' => $isPublic,
            'category' => $category !== '' ? $category : null,
            'tags' => $tags,
            'storage_path' => $objectKey,
        ];

        error_log('[UPLOAD DEBUG] DB insert payload: ' . json_encode($payload));

        [$status, $response, $rawBody] = $this->rest('POST', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($writeToken) + [
                'Content-Type' => 'application/json',
                'Prefer' => 'return=representation',
            ],
            RequestOptions::JSON => $payload,
        ]);

        error_log('[UPLOAD DEBUG] DB insert status=' . $status . ' raw=' . $rawBody);

        if ($status < 200 || $status >= 300 || !is_array($response) || !isset($response[0])) {
            JsonResponder::withStatus($status > 0 ? $status : 500, [
                'error' => 'Failed to save learning material metadata',
                'details' => $response ?? ['response' => $rawBody],
            ]);
            return;
        }
        $record = $response[0];
        $record['tags'] = $this->normalizeTags($record['tags'] ?? []);
        $storedContentType = isset($record['content_type']) ? (string)$record['content_type'] : '';
        $record['content_type_label'] = $storedContentType !== '' ? $storedContentType : null;
        $record['content_type'] = $this->expandStoredContentType($storedContentType);

        $resolvedName = null;
        if (isset($record['profiles']) && is_array($record['profiles'])) {
            $maybe = $record['profiles']['username'] ?? null;
            if (is_string($maybe)) {
                $maybe = trim($maybe);
                if ($maybe !== '') {
                    $resolvedName = $maybe;
                }
            }
        }
        if ($resolvedName === null && isset($record['user_name'])) {
            $maybe = is_string($record['user_name']) ? trim($record['user_name']) : null;
            if ($maybe !== null && $maybe !== '') {
                $resolvedName = $maybe;
            }
        }
        if ($resolvedName === null) {
            $resolvedName = $user->getEmail();
        }
        $record['user_name'] = $resolvedName;
        unset($record['profiles']);

    $record['storage_path'] = $objectKey;
    $record = $this->ensureDownloadUrl($record, $storageToken);

        $this->dispatchAiProcessing($record, $mime);

        JsonResponder::created([
            'message' => 'File uploaded successfully',
            'material' => $record,
        ]);
    }

    private function getAuthenticatedUser(Request $request): ?AuthenticatedUser
    {
        $user = $request->getAttribute('user');
        if (!$user instanceof AuthenticatedUser) {
            JsonResponder::unauthorized();
            return null;
        }

        return $user;
    }

    private function requireRestToken(Request $request): ?string
    {
        $token = $this->serviceRoleKey ?? (string)$request->getAttribute('access_token');
        if ($token === '') {
            JsonResponder::withStatus(500, ['error' => 'Supabase token not available']);
            return null;
        }

        return $token;
    }

    /**
     * @param array<string,mixed> $params
     * @return array<string,string>
     */
    private function buildListQuery(array $params, string $userId): array
    {
        $filter = (string)($params['filter'] ?? 'all');
        $query = [
            'select' => implode(',', [
                'material_id',
                'title',
                'description',
                'content_type',
                'file_url',
                'estimated_duration',
                'created_at',
                'extracted_content',
                'word_count',
                'ai_quiz_generated',
                'user_id',
                'created_by',
                'is_public',
                'category',
                'tags',
                'ai_status',
                'storage_path',
            ]),
            'order' => 'created_at.desc',
        ];

        switch ($filter) {
            case 'my':
                $query['user_id'] = 'eq.' . $userId;
                break;

            case 'community':
                $query['is_public'] = 'is.true';
                break;

            case 'official':
                $query['is_public'] = 'is.true';
                $query['category'] = 'not.is.null';
                break;

            default:
                $query['or'] = sprintf('(user_id.eq.%s,is_public.is.true)', $userId);
                break;
        }

        $category = trim((string)($params['category'] ?? ''));
        if ($category !== '' && strcasecmp($category, 'all') !== 0) {
            $query['category'] = 'eq.' . $category;
        }

        return $query;
    }

    private function resolveWriteToken(Request $request): ?string
    {
        if ($this->serviceRoleKey !== null && $this->serviceRoleKey !== '') {
            error_log('[UPLOAD DEBUG] using service role key for DB write');
            return $this->serviceRoleKey;
        }

        $token = (string)$request->getAttribute('access_token');
        error_log('[UPLOAD DEBUG] using user token for DB write: ' . ($token !== '' ? 'yes' : 'no'));
        return $token !== '' ? $token : null;
    }

    private function incrementMaterialMetric(Request $request, string $id, string $column, string $successMessage): void
    {
        $restToken = $this->requireRestToken($request);
        if ($restToken === null) {
            return;
        }

        [$status, $payload, $rawBody] = $this->rest('GET', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($restToken),
            RequestOptions::QUERY => [
                'select' => $column,
                'material_id' => 'eq.' . $id,
                'limit' => '1',
            ],
        ]);

        if ($status < 200 || $status >= 300 || !is_array($payload) || count($payload) === 0) {
            $responseStatus = $status > 0 ? $status : 404;
            JsonResponder::withStatus($responseStatus, [
                'error' => 'Material not found',
                'details' => $payload ?? ['response' => $rawBody],
            ]);
            return;
        }

        $record = $payload[0];
        $currentRaw = $record[$column] ?? 0;
        $current = is_numeric($currentRaw) ? (int)$currentRaw : 0;
        $nextValue = $current + 1;

        $headers = $this->restHeaders($restToken);
        $headers['Content-Type'] = 'application/json';
        $headers['Prefer'] = 'return=minimal';

        [$updateStatus, , $updateRawBody] = $this->rest('PATCH', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $headers,
            RequestOptions::QUERY => [
                'material_id' => 'eq.' . $id,
            ],
            RequestOptions::JSON => [
                $column => $nextValue,
            ],
        ]);

        if ($updateStatus < 200 || $updateStatus >= 300) {
            JsonResponder::withStatus($updateStatus > 0 ? $updateStatus : 500, [
                'error' => 'Failed to update material metric',
                'details' => ['response' => $updateRawBody, 'status' => $updateStatus],
            ]);
            return;
        }

        JsonResponder::ok([
            'message' => $successMessage,
            'material_id' => $id,
            $column => $nextValue,
        ]);
    }

    /**
     * @return array<int,string>
     */
    private function parseTags($raw): array
    {
        if (is_array($raw)) {
            return array_values(array_filter(array_map('strval', $raw), fn(string $tag): bool => $tag !== ''));
        }

        if (!is_string($raw) || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_filter(array_map('strval', $decoded), fn(string $tag): bool => $tag !== ''));
    }

    /**
     * @param mixed $value
     * @return array<int,string>
     */
    private function normalizeTags($value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('strval', $value), fn(string $tag): bool => $tag !== ''));
        }

        if (is_string($value) && $value !== '') {
            $value = trim($value, '{}');
            if ($value === '') {
                return [];
            }
            return array_map('strval', array_map('trim', explode(',', $value)));
        }

        return [];
    }

    /**
     * @param array<string,mixed> $material
     * @return array<string,mixed>
     */
    private function ensureDownloadUrl(array $material, ?string $token = null): array
    {
        $storagePath = isset($material['storage_path']) && is_string($material['storage_path'])
            ? trim($material['storage_path'])
            : '';

        if ($storagePath === '' && isset($material['file_url']) && is_string($material['file_url'])) {
            $derived = $this->storage->extractStoragePathFromUrl($material['file_url']);
            if ($derived !== null) {
                $storagePath = $derived;
                $material['storage_path'] = $derived;
                $this->backfillStoragePath($material, $derived);
            }
        }

        if ($storagePath === '') {
            if (isset($material['file_url']) && is_string($material['file_url'])) {
                $trimmed = trim($material['file_url']);
                $material['file_url'] = $trimmed !== '' ? $trimmed : null;
            } else {
                $material['file_url'] = null;
            }
            return $material;
        }

        $isPublic = $this->toBool($material['is_public'] ?? false);
        $freshUrl = $this->storage->buildFileUrl($storagePath, $isPublic, $token);

        if ($freshUrl !== null) {
            $material['file_url'] = $freshUrl;
            return $material;
        }

        if (isset($material['file_url']) && is_string($material['file_url'])) {
            $trimmed = trim($material['file_url']);
            $material['file_url'] = $trimmed !== '' ? $trimmed : null;
        } else {
            $material['file_url'] = null;
        }

        return $material;
    }

    /**
     * @param array<string,mixed> $material
     */
    private function backfillStoragePath(array $material, string $storagePath): void
    {
        if ($this->serviceRoleKey === null || $this->serviceRoleKey === '') {
            return;
        }

        $materialKey = null;
        $filterColumn = null;
        if (isset($material['material_id']) && is_scalar($material['material_id'])) {
            $materialKey = trim((string)$material['material_id']);
            $filterColumn = 'material_id';
        } elseif (isset($material['id']) && is_scalar($material['id'])) {
            $materialKey = trim((string)$material['id']);
            $filterColumn = 'id';
        } else {
            return;
        }

        if ($materialKey === '' || $filterColumn === null) {
            return;
        }

        if (isset($this->storagePathBackfillCache[$materialKey])) {
            return;
        }
        $this->storagePathBackfillCache[$materialKey] = true;

        [$status, , $rawBody] = $this->rest('PATCH', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($this->serviceRoleKey) + [
                'Content-Type' => 'application/json',
                'Prefer' => 'return=minimal',
            ],
            RequestOptions::QUERY => [
                $filterColumn => 'eq.' . $materialKey,
            ],
            RequestOptions::JSON => [
                'storage_path' => $storagePath,
            ],
        ]);

        if ($status < 200 || $status >= 300) {
            error_log(sprintf('[learning_materials.index] failed to backfill storage_path for %s (%s)', $materialKey, $rawBody));
        }
    }

    private function mapContentType(string $mime): string
    {
        $normalized = strtolower(trim($mime));

        return match ($normalized) {
            'application/pdf' => 'pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'ppt',
            'video/mp4', 'video/webm', 'video/quicktime' => 'video',
            'text/plain', 'text/markdown', 'text/html' => 'article',
            default => 'article',
        };
    }

    private function expandStoredContentType(string $stored): string
    {
        $normalized = strtolower(trim($stored));
        if ($normalized === '' || str_contains($normalized, '/')) {
            return $stored;
        }

        return match ($normalized) {
            'pdf' => 'application/pdf',
            'ppt', 'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'video' => 'video/mp4',
            'article' => 'text/plain',
            default => $stored,
        };
    }

    /**
     * @param array<string,mixed> $item
     */
    private function extractOwnerName(array $item): ?string
    {
        $owner = $item['owner'] ?? $item['profiles'] ?? null;
        if (is_array($owner)) {
            // Handle two shapes returned by PostgREST: either an associative
            // object (['username' => '...']) or an array of objects
            // ([ ['username'=>'...'] ]). Try both.
            if (isset($owner['username']) && is_string($owner['username'])) {
                $username = trim($owner['username']);
                if ($username !== '') {
                    return $username;
                }
            }

            // Numeric-indexed array (take first element)
            if (array_values($owner) !== $owner) {
                // associative not numeric, already handled
            } else {
                $first = $owner[0] ?? null;
                if (is_array($first) && isset($first['username']) && is_string($first['username'])) {
                    $username = trim($first['username']);
                    if ($username !== '') {
                        return $username;
                    }
                }
            }
        }

        $fallback = $item['user_name'] ?? null;
        if (is_string($fallback)) {
            $fallback = trim($fallback);
            if ($fallback !== '') {
                return $fallback;
            }
        }

        return null;
    }

    private function detectMimeType(string $filePath, string $fallback): string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, $filePath);
            finfo_close($finfo);
            if (is_string($detected) && $detected !== '') {
                return $detected;
            }
        }

        return $fallback !== '' ? $fallback : 'application/octet-stream';
    }

    /**
     * @param array<string, mixed> $record
     */
    private function dispatchAiProcessing(array $record, string $mime): void
    {
        if ($this->aiClient === null) {
            return;
        }

        $materialId = (string)($record['material_id'] ?? $record['id'] ?? '');
        $fileUrl = (string)($record['file_url'] ?? '');
        $contentType = $mime !== '' ? $mime : $this->expandStoredContentType((string)($record['content_type'] ?? ''));
        $storagePath = (string)($record['storage_path'] ?? '');

        if ($materialId === '' || $fileUrl === '') {
            return;
        }

        $options = [
            RequestOptions::JSON => [
                'material_id' => $materialId,
                'file_url' => $fileUrl,
                'content_type' => $contentType !== '' ? $contentType : 'application/octet-stream',
                'storage_bucket' => $this->storageBucket,
                'storage_path' => $storagePath !== '' ? $storagePath : null,
            ],
            RequestOptions::HEADERS => [
                'Content-Type' => 'application/json',
            ],
        ];

        if ($this->aiServiceApiKey !== null && $this->aiServiceApiKey !== '') {
            $options[RequestOptions::HEADERS]['Authorization'] = 'Bearer ' . $this->aiServiceApiKey;
        }

        try {
            $this->aiClient->post('process-material', $options);
        } catch (GuzzleException|\Throwable $e) {
            // Swallow AI dispatch errors to keep upload flow responsive.
        }
    }

    private function validateFile(array $file, string $mime): ?string
    {
        if (!in_array($mime, self::ALLOWED_MIME_TYPES, true)) {
            return 'Only PDF or PowerPoint files are allowed';
        }

        $size = (int)($file['size'] ?? 0);
        if ($size <= 0) {
            return 'Uploaded file appears to be empty';
        }

        if ($size > self::MAX_FILE_SIZE) {
            $limitMb = (int)ceil(self::MAX_FILE_SIZE / (1024 * 1024));
            return sprintf('File size exceeds the %dMB limit', $limitMb);
        }

        return null;
    }

    private function uploadErrorMessage(int $code): string
    {
        switch ($code) {
            case UPLOAD_ERR_INI_SIZE:
                $limit = ini_get('upload_max_filesize') ?: 'the configured limit';
                return sprintf('File exceeds the server upload limit (%s).', $limit);
            case UPLOAD_ERR_FORM_SIZE:
                return 'File exceeds the allowed size for this form.';
            case UPLOAD_ERR_PARTIAL:
                return 'File was only partially uploaded. Please try again.';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded.';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Server is missing a temporary folder for uploads.';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Server failed to write the uploaded file to disk.';
            case UPLOAD_ERR_EXTENSION:
                return 'File upload was blocked by a PHP extension on the server.';
            default:
                return 'Upload failed. Please try again.';
        }
    }

    private function guessExtension(string $mime, string $originalName): string
    {
        $ext = strtolower((string)pathinfo($originalName, PATHINFO_EXTENSION));
        if ($ext !== '') {
            return $ext;
        }

        $map = [
            'application/pdf' => 'pdf',
            'application/vnd.ms-powerpoint' => 'ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        ];

        return $map[$mime] ?? 'bin';
    }

    private function buildObjectPath(string $userId, string $title, string $extension): string
    {
        $datePath = date('Y/m/d');
        $slug = $this->slugify($title);
        try {
            $random = bin2hex(random_bytes(5));
        } catch (\Exception $e) {
            $random = (string)mt_rand(100000, 999999);
        }

        $filename = $slug . '-' . $random;
        if ($extension !== '') {
            $filename .= '.' . $extension;
        }

        return trim($userId, '/') . '/' . $datePath . '/' . $filename;
    }

    private function slugify(string $value): string
    {
        $value = strtolower(trim($value));
        if ($value === '') {
            return 'material';
        }

        $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT', $value);
        if (is_string($transliterated) && $transliterated !== '') {
            $value = $transliterated;
        }

        $value = preg_replace('/[^a-z0-9]+/i', '-', $value);
        $value = trim((string)$value, '-');

        return $value !== '' ? $value : 'material';
    }

    private function extractTextContent(string $filePath, string $mime): ?string
    {
        if ($mime === 'application/pdf') {
            return null; // Placeholder for real PDF parsing implementation
        }

        if (str_starts_with($mime, 'text/')) {
            return file_get_contents($filePath) ?: null;
        }

        return null;
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return in_array(strtolower($value), ['true', 't', '1', 'yes'], true);
        }

        return (bool)$value;
    }

    /**
     * @return array{0:int,1:array<mixed>|null,2:string}
     */
    private function rest(string $method, string $path, array $options): array
    {
        try {
            $options[RequestOptions::HTTP_ERRORS] = false;
            $response = $this->client->request($method, $path, $options);
            $status = $response->getStatusCode();
            $body = (string)$response->getBody();
            $decoded = json_decode($body, true);
            $payload = is_array($decoded) ? $decoded : null;
            return [$status, $payload, $body];
        } catch (GuzzleException $e) {
            return [0, null, $e->getMessage()];
        }
    }

    /**
     * @return array<string,string>
     */
    private function restHeaders(string $token): array
    {
        $headers = [
            'apikey' => $this->config->getAnonKey(),
            'Accept' => 'application/json',
        ];

        if ($token !== '') {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        return $headers;
    }
}
