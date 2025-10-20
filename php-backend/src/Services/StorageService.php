<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\SupabaseConfig;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\RequestOptions;

final class StorageService
{
    private SupabaseConfig $config;
    private Client $client;
    private string $bucket;
    private string $publicBaseUrl;
    private ?string $serviceRoleKey;

    public function __construct(
        SupabaseConfig $config,
        Client $client,
        string $bucket,
        string $publicBaseUrl,
        ?string $serviceRoleKey
    ) {
        $this->config = $config;
        $this->client = $client;
        $this->bucket = $bucket;
        $this->publicBaseUrl = rtrim($publicBaseUrl, '/') . '/';
        $this->serviceRoleKey = $serviceRoleKey;
    }

    /**
     * @throws StorageException when the upload fails.
     */
    public function upload(string $tmpPath, string $mime, string $objectPath, string $token): string
    {
        $encodedPath = $this->encodeStoragePath($objectPath);
        $uri = '/storage/v1/object/' . rawurlencode($this->bucket) . '/' . $encodedPath;

        $stream = fopen($tmpPath, 'rb');
        if ($stream === false) {
            throw new StorageException('Unable to read uploaded file');
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
            throw new StorageException('Storage upload failed: ' . $e->getMessage(), 502);
        }

        fclose($stream);

        $status = $response->getStatusCode();
        $body = (string)$response->getBody();
        $data = json_decode($body, true);

        if ($status < 200 || $status >= 300) {
            $details = [];
            if (is_array($data)) {
                $details = $data;
            } elseif ($body !== '') {
                $details = ['response' => $body];
            }

            throw new StorageException('Supabase storage upload failed', $status, $details);
        }

        $key = is_array($data) && isset($data['Key']) ? (string)$data['Key'] : $objectPath;
        $prefix = $this->bucket . '/';
        if (strpos($key, $prefix) === 0) {
            $key = substr($key, strlen($prefix));
        }

        return ltrim($key, '/');
    }

    public function buildFileUrl(string $objectKey, bool $isPublic): ?string
    {
        if ($objectKey === '') {
            return null;
        }

        if ($isPublic) {
            return $this->publicBaseUrl . ltrim($objectKey, '/');
        }

        $signedPath = $this->createSignedUrl($objectKey);
        if ($signedPath === null) {
            return null;
        }

        return rtrim($this->config->getUrl(), '/') . $signedPath;
    }

    public function createSignedUrl(string $objectKey, int $expiresIn = 604800): ?string
    {
        if ($this->serviceRoleKey === null || $this->serviceRoleKey === '') {
            return null;
        }

        $encodedPath = $this->encodeStoragePath($objectKey);
        $uri = '/storage/v1/object/sign/' . rawurlencode($this->bucket) . '/' . $encodedPath;

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

    public function extractStoragePathFromUrl(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        $parts = parse_url($url);
        if ($parts === false) {
            return null;
        }

        $path = $parts['path'] ?? '';
        if ($path === '') {
            return null;
        }

        $marker = '/storage/v1/object/';
        $pos = strpos($path, $marker);
        if ($pos === false) {
            return null;
        }

        $suffix = substr($path, $pos + strlen($marker));
        if ($suffix === false || $suffix === '') {
            return null;
        }

        $segments = explode('/', ltrim($suffix, '/'));
        if (count($segments) < 3) {
            return null;
        }

        array_shift($segments);
        $bucket = array_shift($segments);
        if ($bucket !== $this->bucket) {
            return null;
        }

        $objectPath = implode('/', $segments);
        if ($objectPath === '') {
            return null;
        }

        $decoded = rawurldecode($objectPath);

        return $decoded !== '' ? $decoded : null;
    }

    private function encodeStoragePath(string $path): string
    {
        $segments = array_map('rawurlencode', array_filter(explode('/', $path), fn(string $part): bool => $part !== ''));
        return implode('/', $segments);
    }
}
