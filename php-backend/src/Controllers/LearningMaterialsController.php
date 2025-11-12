<?php
declare(strict_types=1);

/**
 * LearningMaterialsController
 *
 * Controller for managing learning materials (CRUD operations,
 * signed URL generation, likes/unlikes, downloads, and enrichment
 * with user profiles). Uses a LearningMaterialRepository to perform
 * PostgREST requests to Supabase and returns JSON responses.
 */
namespace App\Controllers;

use App\Auth\AuthenticatedUser;
use App\Auth\SupabaseAuth;
use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use App\Repositories\LearningMaterialRepository;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

final class LearningMaterialsController
{
    private SupabaseAuth $supabaseAuth;
    private LearningMaterialRepository $repository;
    private Client $client;
    private string $supabaseUrl;
    private string $anonKey;
    private ?string $serviceRoleKey;
    private string $bucket;
    private const ALLOWED_CONTENT_TYPES = ['pdf', 'video', 'ppt', 'article'];

    public function __construct(SupabaseConfig $config, SupabaseAuth $supabaseAuth, LearningMaterialRepository $repository)
    {
        $this->supabaseAuth = $supabaseAuth;
        $this->repository = $repository;
        $this->supabaseUrl = rtrim($config->getUrl(), '/');
        $this->anonKey = $config->getAnonKey();
        $this->serviceRoleKey = $config->getServiceRoleKey();
        $this->bucket = $config->getStorageBucket();
        $this->client = new Client(['base_uri' => $this->supabaseUrl]);
    }

    public function index(Request $request): void
    {
        [$user, $token] = $this->resolveOptionalUser($request);
        $params = $request->getQueryParams();
        $filter = strtolower((string)($params['filter'] ?? 'all'));
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = max(1, min(50, (int)($params['per_page'] ?? 20)));

        $likedMaterialIds = [];
        $likedIdsFetched = false;

        if ($filter === 'liked') {
            if ($user === null) {
                JsonResponder::ok([
                    'data' => [],
                    'meta' => [
                        'total' => 0,
                        'page' => $page,
                        'per_page' => $perPage,
                    ],
                ]);
                return;
            }

            $likedMaterialIds = $this->fetchUserLikedMaterialIds($user->getId(), $token);
            $likedIdsFetched = true;

            if ($likedMaterialIds === []) {
                JsonResponder::ok([
                    'data' => [],
                    'meta' => [
                        'total' => 0,
                        'page' => $page,
                        'per_page' => $perPage,
                    ],
                ]);
                return;
            }
        }

        $query = $this->buildListQuery($params, $user, $likedMaterialIds);
        $result = $this->repository->list($query, $token ?? $this->anonKey);

        if ($result['status'] !== 200 && $result['status'] !== 206) {
            // Log upstream (PostgREST) response for debugging
            error_log('PostgREST error: ' . json_encode([
                'time' => gmdate('c'),
                'status' => $result['status'],
                'headers' => $result['headers'],
                'payload' => $result['payload'],
                'query' => $query,
            ]));

            JsonResponder::withStatus($result['status'], [
                'error' => 'Unable to fetch learning materials',
                'details' => $result['payload'],
            ]);
            return;
        }

        $materials = is_array($result['payload']) ? $result['payload'] : [];
        $materials = $this->enrichMaterialsWithProfiles($materials, $token);

        $userLikes = [];
        if ($user !== null) {
            if (!$likedIdsFetched) {
                $likedMaterialIds = $this->fetchUserLikedMaterialIds($user->getId(), $token);
                $likedIdsFetched = true;
            }

            foreach ($likedMaterialIds as $likedId) {
                $userLikes[(string)$likedId] = true;
            }
        }

        $transformed = array_map(function (array $item) use ($userLikes): array {
            $materialId = isset($item['material_id']) ? (string)$item['material_id'] : (string)($item['id'] ?? '');
            $item['user_liked'] = isset($userLikes[$materialId]);
            return $this->transformMaterial($item);
        }, $materials);

        $total = $this->parseTotalFromHeaders($result['headers']);

        JsonResponder::ok([
            'data' => $transformed,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function show(Request $request, string $id): void
    {
        [$user, $token] = $this->resolveOptionalUser($request);
        $material = $this->repository->findById($id, $token ?? $this->anonKey);

        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        $ownerId = isset($material['uploader_id']) ? (string)$material['uploader_id'] : (string)($material['user_id'] ?? '');
        // Avoid undefined array key warnings by normalizing is_public access
        $isPublic = (bool)($material['is_public'] ?? false);
        if (!$isPublic && ($user === null || $ownerId === '' || $ownerId !== $user->getId())) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }

        $enriched = $this->enrichMaterialsWithProfiles([$material], $token);
        if ($enriched !== []) {
            $material = $enriched[0];
        }

        // Check if user has liked this material
        $material['user_liked'] = false;
        if ($user !== null) {
            $material['user_liked'] = $this->userHasLikedMaterial($user->getId(), $id, $token);
        }

        JsonResponder::ok($this->transformMaterial($material));
    }

    public function create(Request $request): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        error_log('[CREATE] Starting create for user: ' . $user->getId() . ', token: ' . substr($token, 0, 20) . '...');

        $input = $this->collectInput($request);
        error_log('[CREATE] Input: ' . json_encode($input));
        error_log('[CREATE] FILES: ' . json_encode($_FILES));
        $title = trim((string)($input['title'] ?? ''));
        if ($title === '') {
            JsonResponder::badRequest('Title is required');
            return;
        }

        $isPublic = $this->toBool($input['is_public'] ?? false);
        $aiToggleEnabled = $this->toBool($input['ai_toggle_enabled'] ?? false);
        $description = $this->optionalString($input['description'] ?? null);
        $tags = $this->normalizeTags($input['tags'] ?? null);

        $uploadError = null;
        $fileInfo = $this->resolveUploadedFile($uploadError);
        if ($uploadError !== null) {
            JsonResponder::badRequest($uploadError);
            return;
        }

        error_log('[CREATE] File info: ' . json_encode($fileInfo));

        $storagePath = null;
        $fileName = null;
        $mime = null;
        $size = null;

        if ($fileInfo !== null) {
            $storagePath = $this->canonicalizePath($user->getId(), $fileInfo['name']);
            error_log('[CREATE] About to upload file to path: ' . $storagePath . ', bucket: ' . $this->bucket);
            $uploadResult = $this->uploadFile($storagePath, $fileInfo, $token, $isPublic);
            if ($uploadResult === false) {
                error_log('[CREATE] Upload failed');
                return;
            }
            error_log('[CREATE] Upload successful');
            // After a successful upload, explicitly set metadata (is_public)
            // using a privileged call to avoid RLS anomalies.
            $this->updateObjectMetadata($storagePath, ['is_public' => $isPublic], $token);
            $fileName = $fileInfo['name'];
            $mime = $fileInfo['type'] !== '' ? $fileInfo['type'] : null;
            $size = $fileInfo['size'];
        }

        $contentType = $this->determineContentType($input, $fileInfo);

        $payload = [
            'title' => $title,
            'description' => $description,
            'content_type' => $contentType,
            'file_url' => $storagePath === null ? $this->optionalString($input['file_url'] ?? null) : null,
            'storage_path' => $storagePath,
            'file_name' => $fileName,
            'mime' => $mime,
            'size' => $size,
            'is_public' => $isPublic,
            'user_id' => $user->getId(),
            'tags_jsonb' => $tags,
            'ai_toggle_enabled' => $aiToggleEnabled,
        ];

        if ($payload['file_url'] === null) {
            unset($payload['file_url']);
        }

        // Dump payload for debugging in case the DB rejects the insert (temporary)
        @mkdir(__DIR__ . '/../../../tmp', 0755, true);
        @file_put_contents(__DIR__ . '/../../../tmp/create_payload.log', json_encode($payload, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

        $result = $this->repository->create($payload, $token);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            JsonResponder::withStatus($result['status'], [
                'error' => 'Unable to create learning material',
                'details' => $result['payload'],
            ]);
            return;
        }

        $material = $result['payload'][0] ?? null;
        if (!is_array($material)) {
            JsonResponder::withStatus(500, ['error' => 'Unexpected response from backend']);
            return;
        }

        JsonResponder::created($this->transformMaterial($material));
    }

        public function update(Request $request, string $id): void
        {
            [$user, $token] = $this->requireAuth($request);
            if ($user === null || $token === null) {
                return;
            }

            $existing = $this->repository->findById($id, $token);
            if ($existing === null) {
                JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
                return;
            }

            if (!$this->canModify($user, $existing)) {
                JsonResponder::unauthorized('You are not allowed to modify this material');
                return;
            }

            $input = $this->collectInput($request);

            $payload = [];
            if (isset($input['title'])) {
                $title = trim((string)$input['title']);
                if ($title === '') {
                    JsonResponder::badRequest('Title cannot be empty');
                    return;
                }
                $payload['title'] = $title;
            }

            if (array_key_exists('description', $input)) {
                $payload['description'] = $this->optionalString($input['description'] ?? null);
            }

            if (array_key_exists('is_public', $input)) {
                $newIsPublic = $this->toBool($input['is_public']);
                $payload['is_public'] = $newIsPublic;
                
                // Update Storage object metadata when toggling visibility
                $storagePath = (string)($existing['storage_path'] ?? '');
                if ($storagePath !== '') {
                    $this->updateObjectMetadata($storagePath, ['is_public' => $newIsPublic], $token);
                }
            }

            if (array_key_exists('ai_toggle_enabled', $input)) {
                $newAiToggle = $this->toBool($input['ai_toggle_enabled']);
                
                // AI Toggle Lock: once enabled, cannot be disabled
                $currentAiToggle = $this->toBool($existing['ai_toggle_enabled'] ?? false);
                if ($currentAiToggle === true && $newAiToggle === false) {
                    JsonResponder::badRequest('AI cannot be disabled once enabled to preserve resources');
                    return;
                }
                
                $payload['ai_toggle_enabled'] = $newAiToggle;
            }

            if (array_key_exists('tags', $input)) {
                $tags = $this->normalizeTags($input['tags'] ?? null);
                $payload['tags_jsonb'] = $tags;
            }

            if ($payload === []) {
                JsonResponder::badRequest('No updatable fields provided');
                return;
            }

            $result = $this->repository->update($id, $payload, $token);

            if ($result['status'] >= 400 || !is_array($result['payload'])) {
                JsonResponder::withStatus($result['status'], [
                    'error' => 'Unable to update learning material',
                    'details' => $result['payload'],
                ]);
                return;
            }

            $updated = $result['payload'][0] ?? null;
            if (!is_array($updated)) {
                JsonResponder::withStatus(500, ['error' => 'Unexpected response from backend']);
                return;
            }

            // Enrich and return
            $enriched = $this->enrichMaterialsWithProfiles([$updated], $token);
            if ($enriched !== []) {
                $updated = $enriched[0];
            }

            // Preserve user_liked status
            $updated['user_liked'] = $this->userHasLikedMaterial($user->getId(), $id, $token);

            JsonResponder::ok($this->transformMaterial($updated));
        }

    public function delete(Request $request, string $id): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $material = $this->repository->findById($id, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        if (!$this->canModify($user, $material)) {
            JsonResponder::unauthorized('You are not allowed to delete this material');
            return;
        }

        if (isset($material['storage_path']) && is_string($material['storage_path']) && $material['storage_path'] !== '') {
            $this->deleteObject($material['storage_path'], $token, (bool)($material['is_public'] ?? false));
        }

        $result = $this->repository->softDelete($id, $token);

        if ($result['status'] >= 400) {
            JsonResponder::withStatus($result['status'], [
                'error' => 'Unable to delete learning material',
                'details' => $result['payload'],
            ]);
            return;
        }

        JsonResponder::withStatus(204, []);
    }

    public function signedUrl(Request $request, string $id): void
    {
        // Allow unauthenticated access for public materials. Use optional auth when available.
        [$user, $maybeToken] = $this->resolveOptionalUser($request);
        $tokenForSelect = $maybeToken ?? $this->anonKey;

        $material = $this->repository->findById($id, $tokenForSelect);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        // Normalize is_public to avoid PHP notices when the DB omits the key
        if (!(bool)($material['is_public'] ?? false) && ($user === null || !$this->canViewPrivate($user, $material))) {
            JsonResponder::unauthorized('You are not allowed to access this material');
            return;
        }

        $directUrl = $this->optionalString($material['file_url'] ?? null);
        $expiresIn = $this->normalizeExpires((string)($request->getQueryParams()['expiresIn'] ?? '3600'));
        if ($directUrl !== null && $directUrl !== '') {
            JsonResponder::ok([
                'signed_url' => $directUrl,
                'expires_at' => time() + $expiresIn,
            ]);
            return;
        }

        $storagePath = (string)($material['storage_path'] ?? '');
        if ($storagePath === '') {
            // Attempt to auto-recover missing storage_path by locating the object in Storage
            $recovered = $this->findAndRestoreStoragePath($material);
            if (is_string($recovered) && $recovered !== '') {
                $storagePath = $recovered;
            } else {
                JsonResponder::withStatus(404, ['error' => 'Material has no storage object attached']);
                return;
            }
        }

        // Always sign from the configured private bucket. Public materials are allowed even without auth.
        // Prefer caller token if available, otherwise use service role (best) then anon.
        $authToken = (string)($maybeToken ?? ($this->serviceRoleKey ?? $this->anonKey));
        $signed = $this->signObject($id, $storagePath, $expiresIn, $authToken, (bool)($material['is_public'] ?? false));
        if ($signed === null) {
            JsonResponder::withStatus(404, ['error' => 'Material file is missing']);
            return;
        }

        // Optional telemetry: bump download_count when purpose=download
        $purpose = strtolower((string)($request->getQueryParams()['purpose'] ?? ''));
        if ($purpose === 'download') {
            $this->incrementDownloadCount($id, $material, $maybeToken);
        }

        JsonResponder::ok($signed);
    }

    /**
     * Attempt to locate the storage object for a material when storage_path is missing.
     * Strategy:
     *  - Compute the canonical date-based prefix userId/YYYY/MM/DD/ using created_at
     *  - List objects under that prefix across candidate buckets (configured, legacy)
     *  - Pick the object whose filename ends with "-slugified(file_name)" (matches our canonical naming)
     *  - If found, persist storage_path back into DB and return it
     */
    private function findAndRestoreStoragePath(array $material): ?string
    {
        $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Starting recovery for material: ' . json_encode($material));
        $ownerId = (string)($material['user_id'] ?? $material['uploader_id'] ?? '');
        $fileName = (string)($material['file_name'] ?? '');
        $createdAt = (string)($material['created_at'] ?? '');

        if ($ownerId === '' || $fileName === '' || $createdAt === '') {
            return null;
        }

        try {
            $dt = new \DateTimeImmutable($createdAt);
        } catch (\Throwable $e) {
            return null;
        }

        $prefix = sprintf('%s/%s/%s/%s/', $ownerId, $dt->format('Y'), $dt->format('m'), $dt->format('d'));
        $slug = $this->slugifyFileName($fileName);
        $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Computed prefix=' . $prefix . ', slug=' . $slug);

        // Build candidate buckets
        $buckets = [$this->bucket];
        if (!in_array('learning-materials', $buckets, true)) {
            $buckets[] = 'learning-materials';
        }
        if (!in_array('learning-materials-v2', $buckets, true)) {
            $buckets[] = 'learning-materials-v2';
        }

        // Service role is preferred for listing
        $authToken = $this->serviceRoleKey ?? $this->anonKey;
        $apiKey = $authToken;

        $bestMatch = null; // ['bucket' => string, 'name' => string]

        foreach ($buckets as $bucket) {
            $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Checking bucket: ' . $bucket);
            // POST /storage/v1/object/list/{bucket}
            $listUrl = '/storage/v1/object/list/' . rawurlencode($bucket);
            $listPayload = [
                'prefix' => $prefix,
                'limit' => 1000,
                'offset' => 0,
            ];
            $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Sending POST to ' . $listUrl . ' with payload: ' . json_encode($listPayload));

            $result = $this->send('POST', $listUrl, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $authToken,
                    'apikey' => $apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => $listPayload,
                'timeout' => 20,
            ]);

            $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: List response from bucket ' . $bucket . ': Status=' . $result['status'] . ', Payload=' . json_encode($result['payload']));

            if (($result['status'] === 200 || $result['status'] === 206) && is_array($result['payload'])) {
                foreach ($result['payload'] as $obj) {
                    if (!is_array($obj)) {
                        continue;
                    }
                    $name = isset($obj['name']) ? (string)$obj['name'] : '';
                    if ($name === '') {
                        continue;
                    }
                    $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Checking object: ' . $name);
                    // The 'name' from the list response is the object name within the prefix, not the full path.
                    // The prefix check is therefore redundant and incorrect here.
                    // We just need to check if the object name matches our slug pattern.
                    if ($name === $slug || str_ends_with($name, '-' . $slug)) {
                        // Candidate found. Prefer the most recently updated.
                        $ts = isset($obj['updated_at']) ? strtotime((string)$obj['updated_at']) : 0;
                        if ($bestMatch === null || $ts > ($bestMatch['ts'] ?? 0)) {
                            // Reconstruct the full path for the match.
                            $fullPath = $prefix . $name;
                            $bestMatch = ['bucket' => $bucket, 'name' => $fullPath, 'ts' => $ts];
                            $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Found new best match: ' . json_encode($bestMatch));
                        }
                    }
                }
            }
        }

        if ($bestMatch === null) {
            $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: No match found in any bucket. Returning null.');
            return null;
        }

        $foundPath = $bestMatch['name'];
        $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Final match found. Path: ' . $foundPath);

        // Persist storage_path back to DB for future requests (service role only)
        if ($this->serviceRoleKey !== null) {
            $materialId = isset($material['material_id']) ? (string)$material['material_id'] : (string)($material['id'] ?? '');
            if ($materialId !== '') {
                $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Persisting path for material_id ' . $materialId);
                $this->send('PATCH', '/rest/v1/learning_materials', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                        'apikey' => $this->serviceRoleKey,
                        'Content-Type' => 'application/json',
                    ],
                    'query' => ['material_id' => 'eq.' . $materialId],
                    'json' => ['storage_path' => $foundPath],
                ]);
            }
        }

        // Ensure metadata is set for recovered objects (important for RLS policies)
        $isPublic = (bool)($material['is_public'] ?? false);
        if ($isPublic) {
            $this->appendTmpLog('storage_error.log', 'findAndRestoreStoragePath: Updating metadata for public object: ' . $foundPath);
            $this->updateObjectMetadata($foundPath, ['is_public' => true], $authToken);
        }

        return $foundPath;
    }

    private function incrementDownloadCount(string $materialId, array $material, ?string $maybeToken): void
    {
        $current = (int)($material['download_count'] ?? 0);
        $this->repository->incrementDownloadCount($materialId, $current);
    }

    public function like(Request $request, string $id): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $material = $this->repository->findById($id, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        // Check if user already liked this material
        $checkResult = $this->send('GET', '/rest/v1/learning_material_likes', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'material_id' => 'eq.' . $id,
                'user_id' => 'eq.' . $user->getId(),
                'select' => 'like_id',
            ],
        ]);

        // If already liked, return current material without changing
        if ($checkResult['status'] === 200 && is_array($checkResult['payload']) && count($checkResult['payload']) > 0) {
            JsonResponder::ok($this->transformMaterial($material));
            return;
        }

        // Insert like record
        $insertResult = $this->send('POST', '/rest/v1/learning_material_likes', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=minimal',
                'Content-Type' => 'application/json',
            ],
            'json' => [
                'material_id' => $id,
                'user_id' => $user->getId(),
            ],
        ]);

        if ($insertResult['status'] >= 400) {
            JsonResponder::withStatus($insertResult['status'], [
                'error' => 'Unable to record like',
                'details' => $insertResult['payload'],
            ]);
            return;
        }

        // Increment like count
        $currentLikes = (int)($material['likes_count'] ?? 0);
        $nextLikes = $currentLikes + 1;
        $payload = [
            'likes_count' => $nextLikes,
        ];

        $result = $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $id],
            'json' => $payload,
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            JsonResponder::withStatus($result['status'], [
                'error' => 'Unable to update like count',
                'details' => $result['payload'],
            ]);
            return;
        }

        $updated = $result['payload'][0] ?? null;
        if (!is_array($updated)) {
            JsonResponder::withStatus(500, ['error' => 'Unexpected response from backend']);
            return;
        }

        $updated['user_liked'] = true;

        JsonResponder::ok($this->transformMaterial($updated));
    }

    public function unlike(Request $request, string $id): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $material = $this->repository->findById($id, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        $deleteResult = $this->send('DELETE', '/rest/v1/learning_material_likes', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=minimal',
                'Content-Type' => 'application/json',
            ],
            'query' => [
                'material_id' => 'eq.' . $id,
                'user_id' => 'eq.' . $user->getId(),
            ],
        ]);

        if ($deleteResult['status'] >= 400 && $deleteResult['status'] !== 404) {
            JsonResponder::withStatus($deleteResult['status'], [
                'error' => 'Unable to remove like',
                'details' => $deleteResult['payload'],
            ]);
            return;
        }

        $currentLikes = (int)($material['likes_count'] ?? 0);
        $nextLikes = max(0, $currentLikes - 1);
        $payload = [
            'likes_count' => $nextLikes,
        ];

        $result = $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $id],
            'json' => $payload,
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            JsonResponder::withStatus($result['status'], [
                'error' => 'Unable to update like count',
                'details' => $result['payload'],
            ]);
            return;
        }

        $updated = $result['payload'][0] ?? null;
        if (!is_array($updated)) {
            JsonResponder::withStatus(500, ['error' => 'Unexpected response from backend']);
            return;
        }

        $updated['user_liked'] = false;

        JsonResponder::ok($this->transformMaterial($updated));
    }

    /**
     * @param array<string,mixed> $params
     * @param array<string> $likedMaterialIds
     * @return array<string,mixed>
     */
    private function buildListQuery(array $params, ?AuthenticatedUser $user, array $likedMaterialIds = []): array
    {
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = max(1, min(50, (int)($params['per_page'] ?? 20)));
        $filter = strtolower((string)($params['filter'] ?? 'all'));
        $sort = $this->normalizeSort((string)($params['sort'] ?? 'created_at.desc'));
        $search = trim((string)($params['q'] ?? ''));

        $query = [
            'select' => 'material_id,title,description,content_type,file_url,file_name,mime,size,is_public,user_id,storage_path,tags_jsonb,likes_count,download_count,ai_toggle_enabled,created_at,updated_at,deleted_at,extracted_content',
            'order' => $sort,
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage,
            'deleted_at' => 'is.null',
        ];

        $filters = [];
        if ($filter === 'liked') {
            if (!empty($likedMaterialIds)) {
                $escaped = array_map(static function (string $id): string {
                    $sanitized = str_replace('"', '""', $id);
                    return '"' . $sanitized . '"';
                }, $likedMaterialIds);
                $filters[] = 'material_id.in.(' . implode(',', $escaped) . ')';
            } else {
                $filters[] = 'material_id.eq.__none__';
            }
        } elseif ($filter === 'my') {
            if ($user !== null) {
                $filters[] = 'user_id.eq.' . $user->getId();
            } else {
                $filters[] = 'user_id.eq.__none__';
            }
        } elseif ($filter === 'community') {
            $filters[] = 'is_public.eq.true';
        } elseif ($filter === 'official') {
            $filters[] = 'is_public.eq.true';
        } else {
            if ($user !== null) {
                $filters[] = sprintf('or(is_public.eq.true,user_id.eq.%s)', $user->getId());
            } else {
                $filters[] = 'is_public.eq.true';
            }
        }

        if ($search !== '') {
            $pattern = $this->toIlikePattern($search);
            $filters[] = sprintf('or(title.ilike.%1$s,description.ilike.%1$s,file_name.ilike.%1$s)', $pattern);
        }

        if ($filters !== []) {
            if (count($filters) === 1) {
                $single = $filters[0];

                if (preg_match('/^(or|and)\((.+)\)$/', $single, $matches) === 1) {
                    $logical = $matches[1];
                    $query[$logical] = '(' . $matches[2] . ')';
                } else {
                    $parts = explode('.', $single, 2);
                    if (count($parts) === 2) {
                        $query[$parts[0]] = $parts[1];
                    }
                }
            } else {
                $query['and'] = '(' . implode(',', $filters) . ')';
            }
        }

        return $query;
    }

    private function normalizeSort(string $raw): string
    {
        $allowed = ['created_at', 'title', 'likes_count', 'downloads_count', 'download_count'];
        $parts = explode('.', strtolower($raw));
        $field = in_array($parts[0] ?? 'created_at', $allowed, true) ? $parts[0] : 'created_at';
        $direction = $parts[1] ?? 'desc';
        if ($direction !== 'asc' && $direction !== 'desc') {
            $direction = 'desc';
        }
        // Normalize known aliases to actual DB column names
        if ($field === 'downloads_count') {
            $field = 'download_count';
        }

        return $field . '.' . $direction;
    }

    private function toIlikePattern(string $search): string
    {
        $escaped = str_replace(['*', ' ', ','], ['%', ' ', ' '], $search);
        return '*' . rawurlencode($escaped) . '*';
    }

    private function transformMaterial(array $item): array
    {
        $item['id'] = isset($item['material_id']) ? (string)$item['material_id'] : (string)($item['id'] ?? '');
        unset($item['material_id']);

        $ownerId = (string)($item['user_id'] ?? $item['uploader_id'] ?? '');
        $item['uploader_id'] = $ownerId !== '' ? $ownerId : null;
        unset($item['user_id']);

        $tags = [];
        if (isset($item['tags_jsonb']) && is_array($item['tags_jsonb'])) {
            $tags = array_values(array_filter(array_map('strval', $item['tags_jsonb']), fn($tag) => $tag !== ''));
        } elseif (isset($item['tags']) && is_array($item['tags'])) {
            $tags = array_values(array_filter(array_map('strval', $item['tags']), fn($tag) => $tag !== ''));
        } elseif (isset($item['tags']) && is_string($item['tags'])) {
            $trimmed = trim($item['tags']);
            if ($trimmed !== '') {
                $trimmed = trim($trimmed, '{}');
                if ($trimmed !== '') {
                    $parts = array_map('trim', explode(',', $trimmed));
                    $tags = array_values(array_filter(array_map('strval', $parts), fn($tag) => $tag !== ''));
                }
            }
        }
        $item['tags'] = $tags;
        unset($item['tags_jsonb']);

        $item['likes_count'] = isset($item['likes_count']) ? (int)$item['likes_count'] : 0;

        $downloads = $item['downloads_count'] ?? $item['download_count'] ?? 0;
        $item['downloads_count'] = (int)$downloads;
        unset($item['download_count']);

        $item['size'] = isset($item['size']) ? (int)$item['size'] : null;

        $name = null;
        if (isset($item['uploader_name']) && is_string($item['uploader_name'])) {
            $trimmed = trim($item['uploader_name']);
            $name = $trimmed !== '' ? $trimmed : null;
        }

        $email = null;
        if (isset($item['uploader_email']) && is_string($item['uploader_email'])) {
            $trimmed = trim($item['uploader_email']);
            $email = $trimmed !== '' ? $trimmed : null;
        }

        $item['uploader_name'] = $name;
        $item['uploader_email'] = $email;

        // Preserve user_liked if set, default to false
        if (!isset($item['user_liked'])) {
            $item['user_liked'] = false;
        }

        $path = (string)($item['storage_path'] ?? '');
        $fileUrl = (string)($item['file_url'] ?? '');
        // With single private bucket, avoid returning a direct public URL.
        // Clients should request a signed URL via /signed-url when needed.
        if ($fileUrl !== '') {
            $item['resolved_url'] = $fileUrl;
        } else {
            $item['resolved_url'] = null;
        }

        unset($item['deleted_at']);

        return $item;
    }

    /**
     * @param array<int,array<string,mixed>> $materials
     * @return array<int,array<string,mixed>>
     */
    private function enrichMaterialsWithProfiles(array $materials, ?string $token): array
    {
        if ($materials === []) {
            return $materials;
        }

        $uniqueIds = [];
        foreach ($materials as $material) {
            if (!is_array($material)) {
                continue;
            }

            $ownerId = (string)($material['user_id'] ?? $material['uploader_id'] ?? '');
            if ($ownerId !== '') {
                $uniqueIds[$ownerId] = true;
            }
        }

        if ($uniqueIds === []) {
            return $materials;
        }

        $idList = array_keys($uniqueIds);
        $escaped = array_map(static function (string $id): string {
            $sanitized = str_replace('"', '""', $id);
            return '"' . $sanitized . '"';
        }, $idList);

        $authToken = $this->serviceRoleKey ?? $token;
        $authorization = $authToken ?? $this->anonKey;
        $apiKey = $authToken !== null && $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;

        $response = $this->send('GET', '/rest/v1/profiles', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authorization,
                'apikey' => $apiKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                // Prefer an explicit preferred_name when present, else compose from first/last, else username/email.
                'select' => 'id,preferred_name,first_name,last_name,username,email',
                'id' => 'in.(' . implode(',', $escaped) . ')',
            ],
        ]);

        if ($response['status'] !== 200 && $response['status'] !== 206 && !is_array($response['payload'])) {
            return $materials;
        }

        $profiles = [];
        foreach ($response['payload'] as $profile) {
            if (!is_array($profile)) {
                continue;
            }

            $profileId = isset($profile['id']) ? (string)$profile['id'] : '';
            if ($profileId === '') {
                continue;
            }

            $preferred = isset($profile['preferred_name']) && is_string($profile['preferred_name']) ? trim($profile['preferred_name']) : '';
            $first = isset($profile['first_name']) && is_string($profile['first_name']) ? trim($profile['first_name']) : '';
            $last = isset($profile['last_name']) && is_string($profile['last_name']) ? trim($profile['last_name']) : '';
            $username = isset($profile['username']) && is_string($profile['username']) ? trim($profile['username']) : '';
            $email = isset($profile['email']) && is_string($profile['email']) ? trim($profile['email']) : null;

            $full = $preferred !== '' ? $preferred : trim(($first . ' ' . $last));
            if ($full === '') {
                $full = $username !== '' ? $username : null;
            }
            if ($full === null && $email !== null) {
                $atPos = strpos($email, '@');
                $full = $atPos !== false ? substr($email, 0, $atPos) : $email;
            }

            $profiles[$profileId] = [
                'name' => $full,
                'email' => $email,
            ];
        }

        if ($profiles === []) {
            return $materials;
        }

        foreach ($materials as &$material) {
            if (!is_array($material)) {
                continue;
            }

            $ownerId = (string)($material['user_id'] ?? $material['uploader_id'] ?? '');
            if ($ownerId === '' || !isset($profiles[$ownerId])) {
                continue;
            }

            $profile = $profiles[$ownerId];
            if ($profile['name'] !== null) {
                $material['uploader_name'] = $profile['name'];
            }

            if ($profile['email'] !== null) {
                $material['uploader_email'] = $profile['email'];
            }
        }
        unset($material);

        return $materials;
    }

    /**
     * @return array<string>
     */
    private function fetchUserLikedMaterialIds(string $userId, ?string $token): array
    {
        $response = $this->requestMaterialLikes([
            'user_id' => 'eq.' . $userId,
            'select' => 'material_id',
        ], $token);

        if ($response['status'] !== 200 && $response['status'] !== 206 || !is_array($response['payload'])) {
            return [];
        }

        $ids = [];
        foreach ($response['payload'] as $row) {
            if (is_array($row) && isset($row['material_id'])) {
                $ids[] = (string)$row['material_id'];
            }
        }

        return array_values(array_unique($ids));
    }

    private function userHasLikedMaterial(string $userId, string $materialId, ?string $token): bool
    {
        $response = $this->requestMaterialLikes([
            'user_id' => 'eq.' . $userId,
            'material_id' => 'eq.' . $materialId,
            'select' => 'id',
            'limit' => 1,
        ], $token);

        return $response['status'] === 200 || $response['status'] === 206 && is_array($response['payload']) && count($response['payload']) > 0;
    }

    /**
     * @param array<string,string> $query
     * @return array{status:int,payload:mixed,headers:array<string,array<int,string>>}
     */
    private function requestMaterialLikes(array $query, ?string $token): array
    {
        $attemptHeaders = [];

        if ($token !== null && $token !== '') {
            $attemptHeaders[] = [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ];
        }

        if ($this->serviceRoleKey !== null && $this->serviceRoleKey !== '') {
            $attemptHeaders[] = [
                'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                'apikey' => $this->serviceRoleKey,
                'Accept' => 'application/json',
            ];
        }

        if ($attemptHeaders === []) {
            $attemptHeaders[] = [
                'Authorization' => 'Bearer ' . $this->anonKey,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ];
        }

        $lastResponse = [
            'status' => 403,
            'payload' => ['error' => 'Forbidden'],
            'headers' => [],
        ];

        foreach ($attemptHeaders as $headers) {
            $response = $this->send('GET', '/rest/v1/learning_material_likes', [
                'headers' => $headers,
                'query' => $query,
            ]);

            if ($response['status'] === 200 || $response['status'] === 206) {
                return $response;
            }

            $lastResponse = $response;

            if (!in_array($response['status'], [401, 403], true)) {
                return $response;
            }
        }

        return $lastResponse;
    }

    private function parseTotalFromHeaders(array $headers): int
    {
        $contentRange = $headers['Content-Range'][0] ?? $headers['content-range'][0] ?? null;
        if (!$contentRange || !is_string($contentRange)) {
            return 0;
        }

        if (preg_match('/\/(\d+|\*)$/', $contentRange, $matches)) {
            $raw = $matches[1];
            return $raw === '*' ? 0 : (int)$raw;
        }

        return 0;
    }

    private function optionalString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string)$value);
        return $string === '' ? null : $string;
    }

    private function normalizeTags($value): ?array
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            return array_values(array_filter(array_map('strval', $value), fn($tag) => $tag !== ''));
        }

        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return null;
            }

            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map('strval', $decoded), fn($tag) => $tag !== ''));
            }

            $parts = array_map('trim', explode(',', $trimmed));
            $parts = array_values(array_filter($parts, fn($part) => $part !== ''));
            return $parts === [] ? null : $parts;
        }

        return null;
    }

    private function determineContentType(array $input, ?array $fileInfo): string
    {
        $explicit = $this->optionalString($input['content_type'] ?? null);
        if ($explicit !== null) {
            $normalized = strtolower($explicit);
            if ($normalized === 'link') {
                $normalized = 'article';
            } elseif ($normalized === 'file') {
                $normalized = $fileInfo !== null ? $this->mapFileToContentType($fileInfo) : 'pdf';
            }

            if (in_array($normalized, self::ALLOWED_CONTENT_TYPES, true)) {
                return $normalized;
            }
        }

        if ($fileInfo !== null) {
            return $this->mapFileToContentType($fileInfo);
        }

        return 'article';
    }

    private function mapFileToContentType(array $fileInfo): string
    {
        $extension = strtolower((string)pathinfo((string)($fileInfo['name'] ?? ''), PATHINFO_EXTENSION));
        if ($extension !== '') {
            if (in_array($extension, ['pdf'], true)) {
                return 'pdf';
            }

            if (in_array($extension, ['ppt', 'pptx', 'pps', 'ppsx', 'pot', 'potx', 'odp', 'key'], true)) {
                return 'ppt';
            }

            if (in_array($extension, ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv', 'mpg', 'mpeg'], true)) {
                return 'video';
            }
        }

        $mime = strtolower((string)($fileInfo['type'] ?? ''));
        if ($mime !== '') {
            if (str_contains($mime, 'video/')) {
                return 'video';
            }

            if (str_contains($mime, 'powerpoint') || str_contains($mime, 'presentation')) {
                return 'ppt';
            }

            if ($mime === 'application/pdf') {
                return 'pdf';
            }
        }

        return 'pdf';
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            $lower = strtolower($value);
            return in_array($lower, ['1', 'true', 'yes', 'on'], true);
        }

        if (is_int($value)) {
            return $value === 1;
        }

        return false;
    }

    private function resolveUploadedFile(?string &$error = null): ?array
    {
        $error = null;
        if (!isset($_FILES['file'])) {
            $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
            $contentType = $_SERVER['CONTENT_TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
            if ($contentLength > 0
                && stripos((string)$contentType, 'multipart/form-data') !== false
                && empty($_POST)
            ) {
                $error = $this->uploadExceededLimitMessage($contentLength);
            }
            return null;
        }

        $file = $_FILES['file'];
        if (!is_array($file)) {
            $error = 'File upload payload malformed';
            return null;
        }

        $code = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($code !== UPLOAD_ERR_OK) {
            if ($code === UPLOAD_ERR_NO_FILE) {
                return null;
            }

            $error = $this->uploadErrorMessage($code);
            return null;
        }

        if (!isset($file['tmp_name'], $file['name'])) {
            $error = 'Invalid upload payload';
            return null;
        }

        $size = isset($file['size']) ? (int)$file['size'] : null;
        if ($size !== null && $size > 104_857_600) {
            $error = 'File exceeds maximum allowed size of 100MB';
            return null;
        }

        return [
            'tmp_name' => (string)$file['tmp_name'],
            'name' => (string)$file['name'],
            'size' => $size ?? 0,
            'type' => isset($file['type']) ? (string)$file['type'] : 'application/octet-stream',
        ];
    }

    private function canonicalizePath(string $userId, string $originalName): string
    {
        $date = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $slug = $this->slugifyFileName($originalName);
        $uuid = bin2hex(random_bytes(8));

        return sprintf(
            '%s/%s/%s/%s/%s-%s',
            $userId,
            $date->format('Y'),
            $date->format('m'),
            $date->format('d'),
            $uuid,
            $slug
        );
    }

    private function slugifyFileName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return 'file';
        }

        $dotPos = strrpos($name, '.');
        $base = $dotPos !== false ? substr($name, 0, $dotPos) : $name;
        $ext = $dotPos !== false ? substr($name, $dotPos + 1) : '';

        $base = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $base) ?? 'file');
        $base = trim($base, '-');
        if ($base === '') {
            $base = 'file';
        }

        if ($ext !== '') {
            $ext = strtolower(preg_replace('/[^a-z0-9]+/i', '', $ext) ?? '');
        }

        return $ext === '' ? $base : $base . '.' . $ext;
    }

    /**
     * Update Storage object metadata. Used to set is_public flag for RLS policies.
     * 
     * @param string $storagePath The storage path of the object
     * @param array<string,mixed> $metadata Key-value pairs to set in metadata
     * @param string $token Auth token (will use service role if available)
     * @return bool True if metadata was updated successfully
     */
    private function updateObjectMetadata(string $storagePath, array $metadata, string $token): bool
    {
        // Prefer service role for metadata updates to avoid RLS issues
        $authToken = $this->serviceRoleKey ?? $token;
        $apiKey = $authToken === $this->serviceRoleKey ? $this->serviceRoleKey : $this->anonKey;
        
        // Convert metadata values to strings as required by Supabase storage
        $stringMetadata = [];
        foreach ($metadata as $key => $value) {
            if (is_bool($value)) {
                $stringMetadata[$key] = $value ? 'true' : 'false';
            } else {
                $stringMetadata[$key] = (string)$value;
            }
        }
        
        // Update metadata directly in storage.objects table via PostgREST
        // This is more reliable than using the storage API PUT endpoint
        $result = $this->send('PATCH', '/rest/v1/storage.objects', [
            'headers' => [
                'Authorization' => 'Bearer ' . $authToken,
                'apikey' => $apiKey,
                'Content-Type' => 'application/json',
                'Prefer' => 'return=minimal',
            ],
            'query' => [
                'name' => 'eq.' . $storagePath,
                'bucket_id' => 'eq.' . $this->bucket,
            ],
            'json' => [
                'metadata' => $stringMetadata,
            ],
        ]);
        
        if ($result['status'] >= 200 && $result['status'] < 300) {
            error_log(sprintf('[METADATA UPDATE] Successfully updated metadata for %s: %s', 
                $storagePath, 
                json_encode($stringMetadata)
            ));
            return true;
        }
        
        error_log(sprintf('[METADATA UPDATE] Failed to update metadata for %s: Status %d, %s', 
            $storagePath,
            $result['status'],
            json_encode($result['payload'])
        ));
        
        return false;
    }

    private function uploadFile(string $storagePath, array $fileInfo, string $token, bool $isPublic): bool
    {
        // Always use the single private bucket. Visibility is controlled via DB (is_public) and signed URLs.
        $bucket = $this->bucket;
        
        // DEBUG: Log upload attempt (console + file)
        $debugLine = sprintf('[UPLOAD DEBUG] Bucket: %s, Path: %s, IsPublic: %s, Token: %s...',
            $bucket,
            $storagePath,
            $isPublic ? 'true' : 'false',
            substr($token, 0, 20)
        );
        error_log($debugLine);
        $this->appendTmpLog('upload_debug.log', $debugLine);
        
        $uploadHeaders = [
            'x-upsert' => 'false',
            'Content-Type' => $fileInfo['type'] ?? 'application/octet-stream',
            'Expect' => '',
        ];

        if (!empty($fileInfo['size'])) {
            $uploadHeaders['Content-Length'] = (string)$fileInfo['size'];
        }
        
        // Do not rely on setting metadata during upload: some Supabase setups
        // can treat metadata writes differently depending on auth. Upload the
        // object first, then set metadata via the privileged service role.
        // (This avoids RLS / 404 anomalies when clients try to set metadata
        // inline.)

        // Build attempt order.
        // - For PUBLIC uploads: force service role only (most reliable), then fall back to user token ONLY IF no service role is configured.
        // - For PRIVATE uploads: try user token first, then fallback to service role if available.
        $attempts = [];
        if ($isPublic) {
            if ($this->serviceRoleKey !== null && $this->serviceRoleKey !== '') {
                $attempts[] = [
                    'label' => 'service-role-only',
                    'token' => $this->serviceRoleKey,
                    'apiKey' => $this->serviceRoleKey,
                ];
            } else {
                // No service role available, try with user token as a last resort
                $attempts[] = [
                    'label' => 'user-token-public-fallback',
                    'token' => $token,
                    'apiKey' => $this->anonKey,
                ];
            }
        } else {
            // Private upload path: user's token first, then service role fallback if present
            $attempts[] = [
                'label' => 'user-token',
                'token' => $token,
                'apiKey' => ($this->serviceRoleKey !== null && $token === $this->serviceRoleKey)
                    ? $this->serviceRoleKey
                    : $this->anonKey,
            ];
            if ($this->serviceRoleKey !== null && $this->serviceRoleKey !== '' && $this->serviceRoleKey !== $token) {
                $attempts[] = [
                    'label' => 'service-role-fallback',
                    'token' => $this->serviceRoleKey,
                    'apiKey' => $this->serviceRoleKey,
                ];
            }
        }

        $timeoutSeconds = $this->computeUploadTimeout((int)($fileInfo['size'] ?? 0));
        
        $attemptNum = 0;
        foreach ($attempts as $attempt) {
            $attemptNum++;
            $authToken = $attempt['token'];
            $apiKey = $attempt['apiKey'];
            
            error_log(sprintf('[UPLOAD DEBUG] Attempt %d (%s): Using token %s... with apiKey %s...', 
                $attemptNum,
                $attempt['label'] ?? 'unknown',
                substr($authToken, 0, 20),
                substr($apiKey, 0, 20)
            ));
            
            $stream = fopen($fileInfo['tmp_name'], 'rb');
            if ($stream === false) {
                JsonResponder::withStatus(500, ['error' => 'Unable to read uploaded file from disk']);
                return false;
            }

            $uploadUrl = '/storage/v1/object/' . rawurlencode($bucket) . '/' . $this->encodePath($storagePath);
            $this->appendTmpLog('upload_debug.log', '[UPLOAD DEBUG] Upload URL: ' . $uploadUrl);
            error_log('[UPLOAD DEBUG] Upload URL: ' . $uploadUrl);
            
            $result = $this->send('POST', $uploadUrl, [
                'headers' => array_merge($uploadHeaders, [
                    'Authorization' => 'Bearer ' . $authToken,
                    'apikey' => $apiKey,
                ]),
                'body' => $stream,
                'timeout' => $timeoutSeconds,
            ]);

            if (is_resource($stream)) {
                fclose($stream);
            }
            
            $this->appendTmpLog('upload_debug.log', sprintf('[UPLOAD DEBUG] Attempt %d (%s) result: Status %d, Payload: %s', 
                $attemptNum, 
                $attempt['label'] ?? 'unknown',
                $result['status'],
                json_encode($result['payload'])
            ));
            error_log(sprintf('[UPLOAD DEBUG] Attempt %d (%s) result: Status %d, Payload: %s', 
                $attemptNum,
                $attempt['label'] ?? 'unknown',
                $result['status'],
                json_encode($result['payload'])
            ));

            if ($result['status'] >= 200 && $result['status'] < 300) {
                error_log('[UPLOAD DEBUG] Upload successful!');
                return true;
            }

            // If the first attempt with the user's token fails due to
            // authentication, RLS, or bucket visibility (401, 403, or 404), retry with the service
            // role key when available. This handles cases where storage
            // operations are blocked by Row-Level Security or bucket visibility for non-privileged
            // tokens.
            if ($authToken === $token && in_array($result['status'], [401, 403, 404], true) && $this->serviceRoleKey !== null) {
                error_log('[UPLOAD DEBUG] First attempt failed with status ' . $result['status'] . ', retrying with service role...');
                continue;
            }

            $this->appendTmpLog('upload_debug.log', '[UPLOAD DEBUG] Upload failed, returning error to client');
            error_log('[UPLOAD DEBUG] Upload failed, returning error to client');
            JsonResponder::withStatus($result['status'], [
                'error' => 'Failed to upload file to storage',
                'details' => $result['payload'],
                'bucket' => $bucket,
                'upload_url' => $uploadUrl,
            ]);
            return false;
        }

        $this->appendTmpLog('upload_debug.log', '[UPLOAD DEBUG] All attempts exhausted');
        error_log('[UPLOAD DEBUG] All attempts exhausted');
        JsonResponder::withStatus(500, ['error' => 'No authorization available to upload file', 'bucket' => $bucket]);
        return false;
    }

    /**
     * Append a line to a file under tmp/ directory.
     */
    private function appendTmpLog(string $file, string $line): void
    {
        $dir = __DIR__ . '/../../../tmp';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $path = $dir . '/' . $file;
        error_log('[TMP LOG] Writing to ' . $path . ': ' . $line);
        file_put_contents($path, '[' . gmdate('c') . '] ' . $line . "\n", FILE_APPEND);
    }

    private function deleteObject(string $storagePath, string $token, bool $isPublic): void
    {
        // Always use the single private bucket.
        $bucket = $this->bucket;
        $apiKey = ($this->serviceRoleKey !== null && $token === $this->serviceRoleKey)
            ? $this->serviceRoleKey
            : $this->anonKey;
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'apikey' => $apiKey,
        ];

        $result = $this->send('DELETE', '/storage/v1/object/' . rawurlencode($bucket) . '/' . $this->encodePath($storagePath), [
            'headers' => $headers,
        ]);

        if (in_array($result['status'], [401, 403, 404], true) && $this->serviceRoleKey !== null) {
            $result = $this->send('DELETE', '/storage/v1/object/' . rawurlencode($bucket) . '/' . $this->encodePath($storagePath), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                    'apikey' => $this->serviceRoleKey,
                ],
            ]);
        }
    }

    private function signObject(string $materialId, string $storagePath, int $expiresIn, string $token, bool $isPublic): ?array
    {
        // Try multiple buckets to be robust to migrations. Primary is the configured bucket;
        // fallback to legacy bucket names when object not found (404).
        $bucketsToTry = [$this->bucket];
        if ($this->bucket !== 'learning-materials') {
            $bucketsToTry[] = 'learning-materials';
        }
        if ($this->bucket !== 'learning-materials-v2' && !in_array('learning-materials-v2', $bucketsToTry, true)) {
            $bucketsToTry[] = 'learning-materials-v2';
        }

        $all404 = true;
        $hadAuthError = false;
        $lastResult = null;
        $lastBucketTried = null;

        foreach ($bucketsToTry as $bucket) {
            $lastBucketTried = $bucket;
            $apiKey = ($this->serviceRoleKey !== null && $token === $this->serviceRoleKey)
                ? $this->serviceRoleKey
                : $this->anonKey;
            $headers = [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $apiKey,
                'Content-Type' => 'application/json',
            ];

            $result = $this->send('POST', '/storage/v1/object/sign/' . rawurlencode($bucket) . '/' . $this->encodePath($storagePath), [
                'headers' => $headers,
                'json' => ['expiresIn' => $expiresIn],
            ]);

            $status = $this->normalizeStorageSignStatus($result['status'], $result['payload']);

            if (in_array($status, [401, 403, 404], true) && $this->serviceRoleKey !== null && $token !== $this->serviceRoleKey) {
                // Retry with service role for this bucket
                $result = $this->send('POST', '/storage/v1/object/sign/' . rawurlencode($bucket) . '/' . $this->encodePath($storagePath), [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                        'apikey' => $this->serviceRoleKey,
                        'Content-Type' => 'application/json',
                    ],
                    'json' => ['expiresIn' => $expiresIn],
                ]);
                $status = $this->normalizeStorageSignStatus($result['status'], $result['payload']);
            }

            $lastResult = $result;
            $lastResult['normalized_status'] = $status;

            if (($status === 200 || $status === 206) && is_array($result['payload']) && isset($result['payload']['signedURL'])) {
                $signedPath = (string)$result['payload']['signedURL'];
                return [
                    'signed_url' => rtrim($this->supabaseUrl, '/') . '/storage/v1' . $signedPath,
                    'expires_at' => time() + $expiresIn,
                ];
            }

            if (!in_array($status, [404, 401, 403], true)) {
                // Non-retryable error; stop here.
                break;
            }

            if (in_array($status, [401, 403], true)) {
                $hadAuthError = true;
            }

            if ($status !== 404) {
                $all404 = false;
            }

            // On 404, continue to next bucket candidate
        }

        // Log non-success responses from the storage sign endpoint to aid debugging
        if (!is_dir(__DIR__ . '/../../../tmp')) {
            @mkdir(__DIR__ . '/../../../tmp', 0755, true);
        }
        @file_put_contents(__DIR__ . '/../../../tmp/storage_error.log', json_encode([
            'time' => gmdate('c'),
            'material_id' => $materialId,
            'buckets_tried' => $bucketsToTry,
            'storage_path' => $storagePath,
            'last_status' => $lastResult['status'] ?? null,
            'normalized_status' => $lastResult['normalized_status'] ?? null,
            'last_payload' => $lastResult['payload'] ?? null,
            'last_bucket' => $lastBucketTried,
            'had_auth_error' => $hadAuthError,
            'service_role_available' => $this->serviceRoleKey !== null,
        ], JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

        // Only clean up the storage_path if we definitively could not find the object
        // in any candidate bucket (all attempts returned 404). Avoid cleanup on auth errors.
        if ($all404 && $this->serviceRoleKey !== null) {
            $this->cleanupMissingStoragePath($materialId);
        }

        return null;
    }

    private function cleanupMissingStoragePath($materialId): void
    {
        if ($this->serviceRoleKey === null || !is_string($materialId) || $materialId === '') {
            return;
        }

        $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                'apikey' => $this->serviceRoleKey,
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $materialId],
            'json' => ['storage_path' => null],
        ]);
    }

    /**
     * Normalize Supabase Storage sign responses that embed the true HTTP status inside the payload.
     * Some edge cases respond with HTTP 400 but include statusCode=404 and error="not_found".
     */
    private function normalizeStorageSignStatus(int $status, $payload): int
    {
        if ($status === 400 && is_array($payload)) {
            $statusCode = (string)($payload['statusCode'] ?? '');
            if ($statusCode !== '') {
                $code = (int)$statusCode;
                if (in_array($code, [401, 403, 404], true)) {
                    return $code;
                }
            }

            $error = strtolower((string)($payload['error'] ?? ''));
            if ($error === 'not_found') {
                return 404;
            }

            $message = strtolower((string)($payload['message'] ?? ''));
            if ($message !== '' && str_contains($message, 'not found')) {
                return 404;
            }
        }

        return $status;
    }

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File exceeds server upload limit (increase PHP upload_max_filesize and post_max_size)',
            UPLOAD_ERR_PARTIAL => 'File upload was interrupted',
            UPLOAD_ERR_NO_TMP_DIR => 'Server temporary folder is missing',
            UPLOAD_ERR_CANT_WRITE => 'Server failed to write uploaded file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload blocked by a PHP extension',
            default => 'File upload failed',
        };
    }

    private function encodePath(string $path): string
    {
        return implode('/', array_map('rawurlencode', explode('/', $path)));
    }

    private function normalizeExpires(string $raw): int
    {
        $value = (int)$raw;
        if ($value < 60) {
            $value = 60;
        }
        if ($value > 3600) {
            $value = 3600;
        }
        return $value;
    }

    private function computeUploadTimeout(int $bytes): int
    {
        if ($bytes <= 0) {
            return 120;
        }

        $megabytes = (int)ceil($bytes / 1_000_000);
        $estimated = max(120, $megabytes * 4);

        return min(900, $estimated);
    }

    private function uploadExceededLimitMessage(int $contentLength): string
    {
        $sizeLabel = $contentLength > 0
            ? sprintf('%s bytes (%s)', number_format($contentLength), $this->formatBytes($contentLength))
            : 'an unknown size';

        $uploadLimit = ini_get('upload_max_filesize') ?: 'not configured';
        $postLimit = ini_get('post_max_size') ?: 'not configured';

        return sprintf(
            'The uploaded payload of %s was rejected before it reached the application. Ensure PHP upload_max_filesize=%s and post_max_size=%s are configured to at least 110M to support 100MB uploads.',
            $sizeLabel,
            $uploadLimit,
            $postLimit
        );
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 bytes';
        }

        $units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
        $value = (float)$bytes;
        $index = 0;

        while ($value >= 1024 && $index < count($units) - 1) {
            $value /= 1024;
            $index++;
        }

        return sprintf('%.2f %s', $value, $units[$index]);
    }

    /**
     * @return array{0:AuthenticatedUser|null,1:string|null}
     */
    private function resolveOptionalUser(Request $request): array
    {
        $token = $request->getBearerToken();
        if ($token === null || $token === '') {
            return [null, null];
        }

        $user = $this->supabaseAuth->validateToken($token);
        if ($user === null) {
            return [null, null];
        }

        return [$user, $token];
    }

    /**
     * @return array{0:AuthenticatedUser|null,1:string|null}
     */
    private function requireAuth(Request $request): array
    {
        $user = $request->getAttribute('user');
        $token = $request->getAttribute('access_token');

        if (!$user instanceof AuthenticatedUser || !is_string($token) || $token === '') {
            JsonResponder::unauthorized('Authentication required');
            return [null, null];
        }

        return [$user, $token];
    }

    private function canModify(AuthenticatedUser $user, array $material): bool
    {
        $ownerId = (string)($material['user_id'] ?? $material['uploader_id'] ?? '');
        if ($ownerId !== '' && $ownerId === $user->getId()) {
            return true;
        }

        return $this->hasAdminRole($user);
    }

    private function canViewPrivate(AuthenticatedUser $user, array $material): bool
    {
        return $this->canModify($user, $material);
    }

    private function hasAdminRole(AuthenticatedUser $user): bool
    {
        $raw = $user->getRaw();
        $role = $raw['app_metadata']['role'] ?? $raw['user_metadata']['role'] ?? null;
        if (is_string($role) && strtolower($role) === 'admin') {
            return true;
        }

        $roles = $raw['app_metadata']['roles'] ?? $raw['user_metadata']['roles'] ?? null;
        if (is_array($roles)) {
            foreach ($roles as $candidate) {
                if (is_string($candidate) && strtolower($candidate) === 'admin') {
                    return true;
                }
            }
        }

        return false;
    }



    /**
     * @param array<string,mixed>|null $body
     * @return array<string,mixed>
     */
    private function collectInput(Request $request): array
    {
        $contentType = $request->getHeader('Content-Type') ?? '';
        if (stripos($contentType, 'multipart/form-data') !== false) {
            return $_POST;
        }

        return $request->getBody() ?? [];
    }

    /**
     * @param array<string,mixed> $options
     * @return array{status:int,payload:mixed,headers:array<string,array<int,string>>}
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
        } catch (GuzzleException $e) {
            return [
                'status' => 502,
                'payload' => ['error' => 'Upstream request failed', 'message' => $e->getMessage()],
                'headers' => [],
            ];
        }
    }
}
