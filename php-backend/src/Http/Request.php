<?php

namespace App\Http;

/**
 * Lightweight request wrapper to centralize access to headers, query and body.
 */
final class Request
{
    private array $query;
    private ?array $body;
    private array $headers;
    private string $method;
    private string $path;
    private array $attributes;

    public function __construct()
    {
        $this->query = $_GET ?? [];
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw, true);
        $this->body = is_array($decoded) ? $decoded : null;
        $this->headers = $this->fetchAllHeaders();
        $this->method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $this->path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $this->attributes = [];
    }

    private function fetchAllHeaders(): array
    {
        // Normalize header names to typical HTTP style
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$name] = $value;
            }
        }
        // Also include Content-Type and Authorization variations
        if (isset($_SERVER['CONTENT_TYPE'])) $headers['Content-Type'] = $_SERVER['CONTENT_TYPE'];
        if (isset($_SERVER['CONTENT_LENGTH'])) $headers['Content-Length'] = $_SERVER['CONTENT_LENGTH'];
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        return $headers;
    }

    public function getQueryParams(): array { return $this->query; }
    public function getBody(): ?array { return $this->body; }
    public function getHeader(string $name): ?string { return $this->headers[$name] ?? null; }
    public function getMethod(): string { return $this->method; }
    public function getPath(): string { return $this->path; }

    public function setAttribute(string $key, $value): void { $this->attributes[$key] = $value; }

    public function getAttribute(string $key, $default = null)
    {
        return $this->attributes[$key] ?? $default;
    }

    public function getBearerToken(): ?string
    {
        $h = $this->getHeader('Authorization');
        if (!$h) return null;
        if (preg_match('/Bearer\s+(.*)$/i', $h, $m)) return $m[1];
        return null;
    }
}
