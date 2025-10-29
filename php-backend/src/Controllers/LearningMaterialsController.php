<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth\AuthenticatedUser;
use App\Auth\SupabaseAuth;
use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

final class LearningMaterialsController
{
    private SupabaseAuth $supabaseAuth;
    private Client $client;
    private string $supabaseUrl;
    private string $anonKey;
    private ?string $serviceRoleKey;
    private string $bucket;
    private string $publicBaseUrl;
    private const ALLOWED_CONTENT_TYPES = ['pdf', 'video', 'ppt', 'article'];

    public function __construct(SupabaseConfig $config, SupabaseAuth $supabaseAuth)
    {
        $this->supabaseAuth = $supabaseAuth;
        $this->supabaseUrl = rtrim($config->getUrl(), '/');
        $this->anonKey = $config->getAnonKey();
        $this->serviceRoleKey = $config->getServiceRoleKey();
        $this->bucket = $config->getStorageBucket();
        $this->publicBaseUrl = $config->getStoragePublicBaseUrl();
        $this->client = new Client(['base_uri' => $this->supabaseUrl]);
    }

    public function index(Request $request): void
    {
        [$user, $token] = $this->resolveOptionalUser($request);
        $query = $this->buildListQuery($request->getQueryParams(), $user);
        $headers = [
            'apikey' => $this->anonKey,
            'Authorization' => 'Bearer ' . ($token ?? $this->anonKey),
            'Accept' => 'application/json',
            'Prefer' => 'count=exact',
        ];

        $result = $this->send('GET', '/rest/v1/learning_materials', [
            'headers' => $headers,
            'query' => $query,
        ]);

        if ($result['status'] !== 200) {
            JsonResponder::withStatus($result['status'], [
                'error' => 'Unable to fetch learning materials',
                'details' => $result['payload'],
            ]);
            return;
        }

        $materials = is_array($result['payload']) ? $result['payload'] : [];
        $transformed = array_map(function (array $item): array {
            return $this->transformMaterial($item);
        }, $materials);

        $total = $this->parseTotalFromHeaders($result['headers']);
        $page = max(1, (int)($request->getQueryParams()['page'] ?? 1));
        $perPage = max(1, min(50, (int)($request->getQueryParams()['per_page'] ?? 20)));

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
        $material = $this->fetchMaterial($id, $token ?? $this->anonKey);

        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        if (!$material['is_public'] && ($user === null || $material['uploader_id'] !== $user->getId())) {
            JsonResponder::unauthorized('You do not have access to this material');
            return;
        }

        JsonResponder::ok($this->transformMaterial($material));
    }

    public function create(Request $request): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $input = $this->collectInput($request);
        $title = trim((string)($input['title'] ?? ''));
        if ($title === '') {
            JsonResponder::badRequest('Title is required');
            return;
        }

        $isPublic = $this->toBool($input['is_public'] ?? false);
        $description = $this->optionalString($input['description'] ?? null);
        $tags = $this->normalizeTags($input['tags'] ?? null);

        $uploadError = null;
        $fileInfo = $this->resolveUploadedFile($uploadError);
        if ($uploadError !== null) {
            JsonResponder::badRequest($uploadError);
            return;
        }

        $storagePath = null;
        $fileName = null;
        $mime = null;
        $size = null;

        if ($fileInfo !== null) {
            $storagePath = $this->canonicalizePath($user->getId(), $fileInfo['name']);
            $uploadResult = $this->uploadFile($storagePath, $fileInfo, $token);
            if ($uploadResult === false) {
                return;
            }
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
            'created_by' => $user->getId(),
            'tags_jsonb' => $tags,
        ];

        if ($payload['file_url'] === null) {
            unset($payload['file_url']);
        }

        // Dump payload for debugging in case the DB rejects the insert (temporary)
        @mkdir(__DIR__ . '/../../../tmp', 0755, true);
        @file_put_contents(__DIR__ . '/../../../tmp/create_payload.log', json_encode($payload, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

        $result = $this->send('POST', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=representation',
                'Content-Type' => 'application/json',
            ],
            'json' => $payload,
        ]);

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

    public function delete(Request $request, string $id): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $material = $this->fetchMaterial($id, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        if (!$this->canModify($user, $material)) {
            JsonResponder::unauthorized('You are not allowed to delete this material');
            return;
        }

        if (isset($material['storage_path']) && is_string($material['storage_path']) && $material['storage_path'] !== '') {
            $this->deleteObject($material['storage_path'], $token);
        }

        $result = $this->send('PATCH', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Prefer' => 'return=minimal',
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $id],
            'json' => [
                'deleted_at' => gmdate('c'),
                'storage_path' => null,
            ],
        ]);

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
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $material = $this->fetchMaterial($id, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        if (!$material['is_public'] && !$this->canViewPrivate($user, $material)) {
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
            JsonResponder::withStatus(404, ['error' => 'Material has no storage object attached']);
            return;
        }

        if ((bool)$material['is_public']) {
            JsonResponder::ok([
                'signed_url' => $this->publicBaseUrl . ltrim($storagePath, '/'),
                'expires_at' => time() + $expiresIn,
            ]);
            return;
        }

        $signed = $this->signObject($id, $storagePath, $expiresIn, $token);
        if ($signed === null) {
            JsonResponder::withStatus(404, ['error' => 'Material file is missing']);
            return;
        }

        JsonResponder::ok($signed);
    }

    public function like(Request $request, string $id): void
    {
        [$user, $token] = $this->requireAuth($request);
        if ($user === null || $token === null) {
            return;
        }

        $material = $this->fetchMaterial($id, $token);
        if ($material === null) {
            JsonResponder::withStatus(404, ['error' => 'Learning material not found']);
            return;
        }

        $currentLikes = (int)($material['likes_count'] ?? $material['like_count'] ?? 0);
        $nextLikes = $currentLikes + 1;
        $payload = [
            'likes_count' => $nextLikes,
            'like_count' => $nextLikes,
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

        JsonResponder::ok($this->transformMaterial($updated));
    }

    /**
     * @param array<string,mixed> $params
     * @return array<string,mixed>
     */
    private function buildListQuery(array $params, ?AuthenticatedUser $user): array
    {
        $page = max(1, (int)($params['page'] ?? 1));
        $perPage = max(1, min(50, (int)($params['per_page'] ?? 20)));
        $filter = strtolower((string)($params['filter'] ?? 'all'));
        $sort = $this->normalizeSort((string)($params['sort'] ?? 'created_at.desc'));
        $search = trim((string)($params['q'] ?? ''));

        $query = [
            'select' => 'material_id,title,description,content_type,file_url,file_name,mime,size,is_public,user_id,created_by,uploader_name,uploader_email,storage_path,tags,tags_jsonb,like_count,likes_count,download_count,downloads_count,created_at,updated_at,deleted_at',
            'order' => $sort,
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage,
            'deleted_at' => 'is.null',
        ];

        $filters = [];
        if ($filter === 'my') {
            if ($user !== null) {
                $filters[] = 'user_id.eq.' . $user->getId();
            } else {
                // Without auth default to only public rows, results will be empty for my filter
                $filters[] = 'user_id.eq.__none__';
            }
        } elseif ($filter === 'community') {
            $filters[] = 'is_public.eq.true';
        } elseif ($filter === 'official') {
            // For official materials, we need materials uploaded by admin users
            // This is complex to filter in a single query, so for now we'll show all public materials
            // TODO: Implement proper admin filtering
            $filters[] = 'is_public.eq.true';
        } else {
            // 'all' filter - show all materials the user can access
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
        $allowed = ['created_at', 'title', 'likes_count', 'downloads_count'];
        $parts = explode('.', strtolower($raw));
        $field = in_array($parts[0] ?? 'created_at', $allowed, true) ? $parts[0] : 'created_at';
        $direction = $parts[1] ?? 'desc';
        if ($direction !== 'asc' && $direction !== 'desc') {
            $direction = 'desc';
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

        $ownerId = (string)($item['user_id'] ?? $item['created_by'] ?? $item['uploader_id'] ?? '');
        $item['uploader_id'] = $ownerId !== '' ? $ownerId : null;
        unset($item['user_id'], $item['created_by']);

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

        $likes = $item['likes_count'] ?? $item['like_count'] ?? 0;
        $item['likes_count'] = (int)$likes;
        unset($item['like_count']);

        $downloads = $item['downloads_count'] ?? $item['download_count'] ?? 0;
        $item['downloads_count'] = (int)$downloads;
        unset($item['download_count']);

        $item['size'] = isset($item['size']) ? (int)$item['size'] : null;

        $path = (string)($item['storage_path'] ?? '');
        $fileUrl = (string)($item['file_url'] ?? '');
        $isPublic = (bool)($item['is_public'] ?? false);
        if ($fileUrl !== '') {
            $item['resolved_url'] = $fileUrl;
        } elseif ($isPublic && $path !== '') {
            $item['resolved_url'] = $this->publicBaseUrl . ltrim($path, '/');
        } else {
            $item['resolved_url'] = null;
        }

        unset($item['deleted_at']);

        return $item;
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

    private function uploadFile(string $storagePath, array $fileInfo, string $token): bool
    {
        $uploadHeaders = [
            'x-upsert' => 'false',
            'Content-Type' => $fileInfo['type'] ?? 'application/octet-stream',
            'Expect' => '',
        ];

        if (!empty($fileInfo['size'])) {
            $uploadHeaders['Content-Length'] = (string)$fileInfo['size'];
        }

        $attempts = [
            $token,
        ];

        if ($this->serviceRoleKey !== null) {
            $attempts[] = $this->serviceRoleKey;
        }

        $timeoutSeconds = $this->computeUploadTimeout((int)($fileInfo['size'] ?? 0));

        foreach ($attempts as $authToken) {
            $stream = fopen($fileInfo['tmp_name'], 'rb');
            if ($stream === false) {
                JsonResponder::withStatus(500, ['error' => 'Unable to read uploaded file from disk']);
                return false;
            }

            $result = $this->send('POST', '/storage/v1/object/' . rawurlencode($this->bucket) . '/' . $this->encodePath($storagePath), [
                'headers' => array_merge($uploadHeaders, [
                    'Authorization' => 'Bearer ' . $authToken,
                    'apikey' => $this->anonKey,
                ]),
                'body' => $stream,
                'timeout' => $timeoutSeconds,
            ]);

            if (is_resource($stream)) {
                fclose($stream);
            }

            if ($result['status'] >= 200 && $result['status'] < 300) {
                return true;
            }

            // If the first attempt with the user's token fails due to
            // authentication or RLS (401 or 403), retry with the service
            // role key when available. This handles cases where storage
            // inserts are blocked by Row-Level Security for non-privileged
            // tokens.
            if ($authToken === $token && ($result['status'] === 401 || $result['status'] === 403) && $this->serviceRoleKey !== null) {
                if (is_resource($stream)) {
                    fclose($stream);
                }
                // Try the next (elevated) token in the attempts array.
                continue;
            }

            JsonResponder::withStatus($result['status'], [
                'error' => 'Failed to upload file to storage',
                'details' => $result['payload'],
            ]);
            return false;
        }

        JsonResponder::withStatus(500, ['error' => 'No authorization available to upload file']);
        return false;
    }

    private function deleteObject(string $storagePath, string $token): void
    {
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'apikey' => $this->anonKey,
        ];

        $result = $this->send('DELETE', '/storage/v1/object/' . rawurlencode($this->bucket) . '/' . $this->encodePath($storagePath), [
            'headers' => $headers,
        ]);

        if ($result['status'] === 401 && $this->serviceRoleKey !== null) {
            $result = $this->send('DELETE', '/storage/v1/object/' . rawurlencode($this->bucket) . '/' . $this->encodePath($storagePath), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                    'apikey' => $this->anonKey,
                ],
            ]);
        }
    }

    private function signObject(string $materialId, string $storagePath, int $expiresIn, string $token): ?array
    {
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'apikey' => $this->anonKey,
            'Content-Type' => 'application/json',
        ];

        $result = $this->send('POST', '/storage/v1/object/sign/' . rawurlencode($this->bucket) . '/' . $this->encodePath($storagePath), [
            'headers' => $headers,
            'json' => ['expiresIn' => $expiresIn],
        ]);

        if ($result['status'] === 401 && $this->serviceRoleKey !== null) {
            $result = $this->send('POST', '/storage/v1/object/sign/' . rawurlencode($this->bucket) . '/' . $this->encodePath($storagePath), [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                    'apikey' => $this->anonKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => ['expiresIn' => $expiresIn],
            ]);
        }

        if ($result['status'] === 200 && is_array($result['payload']) && isset($result['payload']['signedURL'])) {
            $signedPath = (string)$result['payload']['signedURL'];
            return [
                'signed_url' => rtrim($this->supabaseUrl, '/') . '/storage/v1' . $signedPath,
                'expires_at' => time() + $expiresIn,
            ];
        }

        if ($result['status'] === 404 && $this->serviceRoleKey !== null) {
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
                'apikey' => $this->anonKey,
                'Content-Type' => 'application/json',
            ],
            'query' => ['material_id' => 'eq.' . $materialId],
            'json' => ['storage_path' => null],
        ]);
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
        $ownerId = (string)($material['user_id'] ?? $material['created_by'] ?? $material['uploader_id'] ?? '');
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

    private function fetchMaterial(string $id, string $token): ?array
    {
        $result = $this->send('GET', '/rest/v1/learning_materials', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'apikey' => $this->anonKey,
                'Accept' => 'application/json',
            ],
            'query' => [
                'select' => 'material_id,title,description,content_type,file_url,file_name,mime,size,is_public,user_id,created_by,uploader_name,uploader_email,storage_path,tags,tags_jsonb,like_count,likes_count,download_count,downloads_count,created_at,updated_at,deleted_at',
                'material_id' => 'eq.' . $id,
                'deleted_at' => 'is.null',
                'limit' => 1,
            ],
        ]);

        if ($result['status'] >= 400 || !is_array($result['payload'])) {
            return null;
        }

        $material = $result['payload'][0] ?? null;
        if (!is_array($material)) {
            return null;
        }

        return $material;
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
