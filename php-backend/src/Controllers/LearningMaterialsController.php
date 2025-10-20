<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth\AuthenticatedUser;
use App\Config\SupabaseConfig;
use App\Http\JsonResponder;
use App\Http\Request;
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
    private string $storagePublicBaseUrl;
    private ?string $serviceRoleKey;
    private ?Client $aiClient;
    private ?string $aiServiceApiKey;

    public function __construct(SupabaseConfig $config)
    {
        $this->config = $config;
        $this->client = new Client([
            'base_uri' => $config->getUrl(),
            'timeout' => 15,
        ]);
        $this->storageBucket = $config->getStorageBucket();
        $this->storagePublicBaseUrl = $config->getStoragePublicBaseUrl();
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
            return [
                'material_id' => $item['material_id'] ?? $item['id'] ?? null,
                'title' => $item['title'] ?? '',
                'description' => $item['description'] ?? '',
                'file_url' => $fileUrl,
                'content_type' => $item['content_type'] ?? '',
                'estimated_duration' => $item['estimated_duration'] ?? null,
                'created_at' => $item['created_at'] ?? null,
                'extracted_content' => $item['extracted_content'] ?? null,
                'word_count' => (int)($item['word_count'] ?? 0),
                'ai_quiz_generated' => $this->toBool($item['ai_quiz_generated'] ?? false),
                'user_id' => $item['user_id'] ?? null,
                'is_public' => $this->toBool($item['is_public'] ?? false),
                'category' => $item['category'] ?? null,
                'tags' => $tags,
                'like_count' => (int)($item['like_count'] ?? 0),
                'download_count' => (int)($item['download_count'] ?? 0),
                'user_name' => $this->extractOwnerName($item),
                'storage_path' => $item['storage_path'] ?? null,
            ];
        }, $payload);

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

    public function upload(Request $request): void
    {
        $user = $this->getAuthenticatedUser($request);
        if ($user === null) {
            return;
        }

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
            JsonResponder::badRequest('No file uploaded');
            return;
        }

        $file = $_FILES['file'];
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

        $objectKey = $this->uploadToStorage($tmpPath, $mime, $objectPath, $storageToken);
        if ($objectKey === null) {
            return; // uploadToStorage already emitted a response
        }

        $fileUrl = $this->buildFileUrl($objectKey, $isPublic);

        $extractedContent = $this->extractTextContent($tmpPath, $mime);
        $wordCount = $extractedContent !== null ? str_word_count($extractedContent) : 0;

        $payload = [
            'title' => $title,
            'description' => $description !== '' ? $description : null,
            'content_type' => $mime,
            'file_url' => $fileUrl,
            'estimated_duration' => null,
            'extracted_content' => $extractedContent,
            'word_count' => $wordCount,
            'user_id' => $user->getId(),
            'created_by' => $user->getId(),
            'is_public' => $isPublic,
            'category' => $category !== '' ? $category : null,
            'tags' => $tags,
        ];

        [$status, $response, $rawBody] = $this->rest('POST', '/rest/v1/learning_materials', [
            RequestOptions::HEADERS => $this->restHeaders($writeToken) + [
                'Content-Type' => 'application/json',
                'Prefer' => 'return=representation',
            ],
            RequestOptions::JSON => $payload,
        ]);

        if ($status < 200 || $status >= 300 || !is_array($response) || !isset($response[0])) {
            JsonResponder::withStatus($status > 0 ? $status : 500, [
                'error' => 'Failed to save learning material metadata',
                'details' => $response ?? ['response' => $rawBody],
            ]);
            return;
        }

    $record = $response[0];
    $record['tags'] = $this->normalizeTags($record['tags'] ?? []);
        $record['user_name'] = $record['profiles']['username'] ?? $record['user_name'] ?? $user->getEmail();
    $record['storage_path'] = $objectKey;

        $this->dispatchAiProcessing($record);

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

    /**
     * @param array<string,mixed> $params
     * @return array<string,string>
     */
    private function buildListQuery(array $params, string $userId): array
    {
        $filter = (string)($params['filter'] ?? 'all');
        $query = [
            'select' => 'material_id,title,description,content_type,file_url,estimated_duration,created_at,extracted_content,word_count,ai_quiz_generated,user_id,is_public,category,tags,like_count,download_count,owner:profiles!learning_materials_user_id_fkey(username)',
            'order' => 'created_at.desc',
        ];

        switch ($filter) {
            case 'my':
                $query['user_id'] = 'eq.' . $userId;
                break;

            case 'community':
                $query['is_public'] = 'eq.true';
                break;

            case 'official':
                $query['is_public'] = 'eq.true';
                $query['category'] = 'not.is.null';
                break;

            default:
                $query['or'] = sprintf('(user_id.eq.%s,is_public.eq.true)', $userId);
                break;
        }

        $category = trim((string)($params['category'] ?? ''));
        if ($category !== '' && strcasecmp($category, 'all') !== 0) {
            $query['category'] = 'eq.' . $category;
        }

        return $query;
    }

    private function uploadToStorage(string $tmpPath, string $mime, string $objectPath, string $token): ?string
    {
    $encodedPath = $this->encodeStoragePath($objectPath);
    $uri = '/storage/v1/object/' . rawurlencode($this->storageBucket) . '/' . $encodedPath;
        $stream = fopen($tmpPath, 'rb');
        if ($stream === false) {
            JsonResponder::error(500, 'Unable to read uploaded file');
            return null;
        }

        try {
            $response = $this->client->request('POST', $uri, [
                RequestOptions::HEADERS => [
                    'Authorization' => 'Bearer ' . $token,
                    'apikey' => $this->config->getAnonKey(),
                    'Content-Type' => $mime,
                    'x-upsert' => 'false',
                ],
                RequestOptions::BODY => $stream,
                RequestOptions::HTTP_ERRORS => false,
            ]);
        } catch (GuzzleException $e) {
            fclose($stream);
            JsonResponder::error(502, 'Storage upload failed: ' . $e->getMessage());
            return null;
        }

        fclose($stream);

        $status = $response->getStatusCode();
        $body = (string)$response->getBody();
        $data = json_decode($body, true);

        if ($status < 200 || $status >= 300) {
            JsonResponder::withStatus($status, [
                'error' => 'Supabase storage upload failed',
                'details' => $data ?? ['response' => $body],
            ]);
            return null;
        }

        $key = is_array($data) && isset($data['Key']) ? (string)$data['Key'] : $objectPath;
        $prefix = $this->storageBucket . '/';
        if (strpos($key, $prefix) === 0) {
            $key = substr($key, strlen($prefix));
        }

        return ltrim($key, '/');
    }

    private function buildFileUrl(string $objectKey, bool $isPublic): ?string
    {
        if ($objectKey === '') {
            return null;
        }

        if ($isPublic) {
            return $this->storagePublicBaseUrl . ltrim($objectKey, '/');
        }

        $signedPath = $this->createSignedUrl($objectKey);
        if ($signedPath === null) {
            return null;
        }

        return rtrim($this->config->getUrl(), '/') . $signedPath;
    }

    private function createSignedUrl(string $objectKey, int $expiresIn = 604800): ?string
    {
        if ($this->serviceRoleKey === null || $this->serviceRoleKey === '') {
            return null;
        }

        $encodedPath = $this->encodeStoragePath($objectKey);
        $uri = '/storage/v1/object/sign/' . rawurlencode($this->storageBucket) . '/' . $encodedPath;

        try {
            $response = $this->client->request('POST', $uri, [
                RequestOptions::HEADERS => [
                    'Authorization' => 'Bearer ' . $this->serviceRoleKey,
                    'apikey' => $this->config->getAnonKey(),
                    'Content-Type' => 'application/json',
                ],
                RequestOptions::JSON => [
                    'expiresIn' => $expiresIn,
                ],
                RequestOptions::HTTP_ERRORS => false,
            ]);
        } catch (GuzzleException $e) {
            return null;
        }

        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            return null;
        }

        $decoded = json_decode((string)$response->getBody(), true);
        if (!is_array($decoded)) {
            return null;
        }

        $signed = null;
        if (isset($decoded['signedURL']) && is_string($decoded['signedURL'])) {
            $signed = $decoded['signedURL'];
        } elseif (isset($decoded['signedUrl']) && is_string($decoded['signedUrl'])) {
            $signed = $decoded['signedUrl'];
        }

        if ($signed === null) {
            return null;
        }

        if (!str_starts_with($signed, '/')) {
            $signed = '/' . ltrim($signed, '/');
        }

        return $signed;
    }

    private function resolveWriteToken(Request $request): ?string
    {
        if ($this->serviceRoleKey !== null && $this->serviceRoleKey !== '') {
            return $this->serviceRoleKey;
        }

        $token = (string)$request->getAttribute('access_token');
        return $token !== '' ? $token : null;
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
     * @param array<string,mixed> $item
     */
    private function extractOwnerName(array $item): ?string
    {
        $owner = $item['owner'] ?? $item['profiles'] ?? null;
        if (is_array($owner)) {
            $username = $owner['username'] ?? null;
            if (is_string($username)) {
                $username = trim($username);
                if ($username !== '') {
                    return $username;
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
    private function dispatchAiProcessing(array $record): void
    {
        if ($this->aiClient === null) {
            return;
        }

        $materialId = (string)($record['material_id'] ?? $record['id'] ?? '');
        $fileUrl = (string)($record['file_url'] ?? '');
    $contentType = (string)($record['content_type'] ?? 'application/octet-stream');
    $storagePath = (string)($record['storage_path'] ?? '');

        if ($materialId === '' || $fileUrl === '') {
            return;
        }

        $options = [
            RequestOptions::JSON => [
                'material_id' => $materialId,
                'file_url' => $fileUrl,
                'content_type' => $contentType,
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

    private function encodeStoragePath(string $path): string
    {
        $segments = array_map('rawurlencode', array_filter(explode('/', $path), fn(string $part): bool => $part !== ''));
        return implode('/', $segments);
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
